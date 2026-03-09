import type { Ref } from "vue";
import { audioRevealWav } from "@/domains/recorder/api";
import { coachStore, sessionStore, talksStore } from "@/stores/app";
import { templateSections } from "@/features/talks/composables/builderPage/talkBuilderPageHelpers";
import type { TalksBlueprint } from "@/schemas/ipc";
import {
  clearRuntimeUiError,
  setRuntimeUiError,
  type RuntimeErrorCategory,
} from "@/features/shared/runtime/runtimeContract";

export type BuilderActionsState = {
  identity: {
    selectedProjectId: Ref<string>;
    activeProfileId: Ref<string | null | undefined>;
  };
  model: {
    outline: Ref<string>;
    exportPath: Ref<string | null>;
    blueprint: Ref<TalksBlueprint | null>;
  };
  ui: {
    error: Ref<string | null>;
    errorCategory?: Ref<RuntimeErrorCategory | null>;
    isLoading: Ref<boolean>;
    isSaving: Ref<boolean>;
    saveStatus: Ref<"idle" | "saving" | "saved" | "error">;
    isExporting: Ref<boolean>;
    isRevealing: Ref<boolean>;
    isApplyingTemplate: Ref<boolean>;
  };
};

export type BuilderActionsDeps = {
  t: (key: string) => string;
  bootstrapSession: () => Promise<void>;
  loadProjects: () => Promise<void>;
  getOutline: (projectId: string) => Promise<{ markdown: string }>;
  getTalksBlueprint: (projectId: string) => Promise<TalksBlueprint | null>;
  saveOutline: (projectId: string, markdown: string) => Promise<void>;
  ensureProjectStageAtLeast: (
    projectId: string,
    stage: "draft" | "builder" | "train" | "export"
  ) => Promise<void>;
  exportOutline: (projectId: string) => Promise<{ path: string }>;
  revealPath: (path: string) => Promise<void>;
  confirm: (message: string) => boolean;
  scheduleTimeout: (fn: () => void, delayMs: number) => void;
};

function createDefaultBuilderActionsDeps(t: (key: string) => string): BuilderActionsDeps {
  return {
    t,
    bootstrapSession: () => sessionStore.bootstrap(),
    loadProjects: () => talksStore.loadProjects(),
    getOutline: (projectId) => talksStore.getOutline(projectId),
    getTalksBlueprint: (projectId) => coachStore.getTalksBlueprint(projectId),
    saveOutline: (projectId, markdown) => talksStore.saveOutline(projectId, markdown),
    ensureProjectStageAtLeast: (projectId, stage) =>
      talksStore.ensureProjectStageAtLeast(projectId, stage),
    exportOutline: (projectId) => talksStore.exportOutline(projectId),
    revealPath: (path) => audioRevealWav(path),
    confirm: (message) => window.confirm(message),
    scheduleTimeout: (fn, delayMs) => {
      setTimeout(fn, delayMs);
    },
  };
}

type BuilderActionsArgs = {
  state: BuilderActionsState;
  t: (key: string) => string;
  deps?: BuilderActionsDeps;
};

/**
 * Creates builder-page command actions (load/save/template/export/reveal).
 * Async policies and runtime error transitions are centralized here.
 */
export function createBuilderActions(args: BuilderActionsArgs) {
  const deps = args.deps ?? createDefaultBuilderActionsDeps(args.t);
  const { identity, model, ui } = args.state;

  async function markBuilderStage() {
    if (!identity.selectedProjectId.value) {
      return;
    }
    try {
      await deps.ensureProjectStageAtLeast(identity.selectedProjectId.value, "builder");
    } catch {
      // keep save/export non-blocking
    }
  }

  async function loadOutline() {
    clearRuntimeUiError(ui);
    // Reset derived UI/model fields so project switches do not leak stale blueprint/export state.
    model.exportPath.value = null;
    model.outline.value = "";
    model.blueprint.value = null;
    ui.isLoading.value = true;
    try {
      await deps.bootstrapSession();
      await deps.loadProjects();
      const projectId = identity.selectedProjectId.value;
      if (!projectId || !identity.activeProfileId.value) {
        return;
      }
      const doc = await deps.getOutline(projectId);
      model.outline.value = doc.markdown;
      model.blueprint.value = await deps.getTalksBlueprint(projectId);
      ui.saveStatus.value = "idle";
    } catch (err) {
      setRuntimeUiError(ui, err);
    } finally {
      ui.isLoading.value = false;
    }
  }

  async function saveOutline() {
    if (!identity.selectedProjectId.value) {
      ui.error.value = deps.t("builder.no_talk");
      if (ui.errorCategory) {
        ui.errorCategory.value = "validation";
      }
      return;
    }
    ui.isSaving.value = true;
    ui.saveStatus.value = "saving";
    clearRuntimeUiError(ui);
    try {
      await deps.saveOutline(identity.selectedProjectId.value, model.outline.value);
      await markBuilderStage();
      ui.saveStatus.value = "saved";
      deps.scheduleTimeout(() => {
        ui.saveStatus.value = "idle";
      }, 1200);
    } catch (err) {
      ui.saveStatus.value = "error";
      setRuntimeUiError(ui, err);
    } finally {
      ui.isSaving.value = false;
    }
  }

  async function applyFrameworkTemplate() {
    if (!model.blueprint.value) {
      return;
    }
    const sections = templateSections(deps.t, model.blueprint.value.framework_id);
    const template = sections.map((section) => `${section}\n`).join("\n");

    if (model.outline.value.trim().length > 0) {
      // Template apply is destructive by design; explicit confirm prevents silent draft loss.
      const confirmed = deps.confirm(deps.t("builder.template_confirm_overwrite"));
      if (!confirmed) {
        return;
      }
    }

    ui.isApplyingTemplate.value = true;
    model.outline.value = template;
    await saveOutline();
    ui.isApplyingTemplate.value = false;
  }

  async function exportOutline() {
    if (!identity.selectedProjectId.value) {
      ui.error.value = deps.t("builder.no_talk");
      if (ui.errorCategory) {
        ui.errorCategory.value = "validation";
      }
      return;
    }
    ui.isExporting.value = true;
    clearRuntimeUiError(ui);
    try {
      await markBuilderStage();
      const result = await deps.exportOutline(identity.selectedProjectId.value);
      model.exportPath.value = result.path;
    } catch (err) {
      setRuntimeUiError(ui, err);
    } finally {
      ui.isExporting.value = false;
    }
  }

  async function revealExport() {
    if (!model.exportPath.value) {
      return;
    }
    ui.isRevealing.value = true;
    clearRuntimeUiError(ui);
    try {
      await deps.revealPath(model.exportPath.value);
    } catch (err) {
      setRuntimeUiError(ui, err);
    } finally {
      ui.isRevealing.value = false;
    }
  }

  return {
    markBuilderStage,
    loadOutline,
    saveOutline,
    applyFrameworkTemplate,
    exportOutline,
    revealExport,
  };
}
