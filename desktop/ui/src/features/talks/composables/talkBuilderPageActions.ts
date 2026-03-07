import type { Ref } from "vue";
import { audioRevealWav } from "@/domains/recorder/api";
import { coachStore, sessionStore, talksStore } from "@/stores/app";
import { templateSections } from "@/features/talks/composables/talkBuilderPageHelpers";
import type { BuilderState } from "@/features/talks/composables/talkBuilderPageState";

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

type BuilderActionsArgs = {
  t: (key: string) => string;
  state: BuilderState;
  selectedProjectId: Ref<string>;
  activeProfileId: Ref<string | null | undefined>;
};

export function createBuilderActions(args: BuilderActionsArgs) {
  const { t, state, selectedProjectId, activeProfileId } = args;

  async function markBuilderStage() {
    if (!selectedProjectId.value) {
      return;
    }
    try {
      await talksStore.ensureProjectStageAtLeast(selectedProjectId.value, "builder");
    } catch {
      // keep save/export non-blocking
    }
  }

  async function loadOutline() {
    state.error.value = null;
    state.exportPath.value = null;
    state.outline.value = "";
    state.blueprint.value = null;
    state.isLoading.value = true;
    try {
      await sessionStore.bootstrap();
      await talksStore.loadProjects();
      const projectId = selectedProjectId.value;
      if (!projectId || !activeProfileId.value) {
        return;
      }
      const doc = await talksStore.getOutline(projectId);
      state.outline.value = doc.markdown;
      state.blueprint.value = await coachStore.getTalksBlueprint(projectId);
      state.saveStatus.value = "idle";
    } catch (err) {
      state.error.value = toError(err);
    } finally {
      state.isLoading.value = false;
    }
  }

  async function saveOutline() {
    if (!selectedProjectId.value) {
      state.error.value = t("builder.no_talk");
      return;
    }
    state.isSaving.value = true;
    state.saveStatus.value = "saving";
    state.error.value = null;
    try {
      await talksStore.saveOutline(selectedProjectId.value, state.outline.value);
      await markBuilderStage();
      state.saveStatus.value = "saved";
      setTimeout(() => {
        state.saveStatus.value = "idle";
      }, 1200);
    } catch (err) {
      state.saveStatus.value = "error";
      state.error.value = toError(err);
    } finally {
      state.isSaving.value = false;
    }
  }

  async function applyFrameworkTemplate() {
    if (!state.blueprint.value) {
      return;
    }
    const sections = templateSections(t, state.blueprint.value.framework_id);
    const template = sections.map((section) => `${section}\n`).join("\n");

    if (state.outline.value.trim().length > 0) {
      const confirmed = window.confirm(t("builder.template_confirm_overwrite"));
      if (!confirmed) {
        return;
      }
    }

    state.isApplyingTemplate.value = true;
    state.outline.value = template;
    await saveOutline();
    state.isApplyingTemplate.value = false;
  }

  async function exportOutline() {
    if (!selectedProjectId.value) {
      state.error.value = t("builder.no_talk");
      return;
    }
    state.isExporting.value = true;
    state.error.value = null;
    try {
      await markBuilderStage();
      const result = await talksStore.exportOutline(selectedProjectId.value);
      state.exportPath.value = result.path;
    } catch (err) {
      state.error.value = toError(err);
    } finally {
      state.isExporting.value = false;
    }
  }

  async function revealExport() {
    if (!state.exportPath.value) {
      return;
    }
    state.isRevealing.value = true;
    state.error.value = null;
    try {
      await audioRevealWav(state.exportPath.value);
    } catch (err) {
      state.error.value = toError(err);
    } finally {
      state.isRevealing.value = false;
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
