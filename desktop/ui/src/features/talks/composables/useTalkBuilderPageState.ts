import { computed, onMounted, ref, watch, type Ref } from "vue";
import { useRoute } from "vue-router";
import { audioRevealWav } from "@/domains/recorder/api";
import { useI18n } from "@/lib/i18n";
import type { TalksBlueprint } from "@/schemas/ipc";
import { appState, coachStore, sessionStore, talksStore } from "@/stores/app";

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function frameworkPrompts(t: (key: string) => string, frameworkId: string) {
  if (frameworkId === "problem-solution-impact") {
    return [
      t("builder.prompt_problem_solution_impact_1"),
      t("builder.prompt_problem_solution_impact_2"),
      t("builder.prompt_problem_solution_impact_3"),
    ];
  }
  if (frameworkId === "context-change-decision") {
    return [
      t("builder.prompt_context_change_decision_1"),
      t("builder.prompt_context_change_decision_2"),
      t("builder.prompt_context_change_decision_3"),
    ];
  }
  return [
    t("builder.prompt_hook_story_proof_1"),
    t("builder.prompt_hook_story_proof_2"),
    t("builder.prompt_hook_story_proof_3"),
  ];
}

function templateSections(t: (key: string) => string, frameworkId: string) {
  if (frameworkId === "problem-solution-impact") {
    return [
      `## ${t("builder.template_problem")}`,
      `## ${t("builder.template_solution")}`,
      `## ${t("builder.template_impact")}`,
      `## ${t("builder.template_decision")}`,
    ];
  }
  if (frameworkId === "context-change-decision") {
    return [
      `## ${t("builder.template_context")}`,
      `## ${t("builder.template_change")}`,
      `## ${t("builder.template_options")}`,
      `## ${t("builder.template_decision")}`,
    ];
  }
  return [
    `## ${t("builder.template_hook")}`,
    `## ${t("builder.template_story")}`,
    `## ${t("builder.template_proof")}`,
    `## ${t("builder.template_close")}`,
  ];
}

type BuilderState = {
  error: Ref<string | null>;
  isLoading: Ref<boolean>;
  isSaving: Ref<boolean>;
  saveStatus: Ref<"idle" | "saving" | "saved" | "error">;
  outline: Ref<string>;
  exportPath: Ref<string | null>;
  isExporting: Ref<boolean>;
  isRevealing: Ref<boolean>;
  blueprint: Ref<TalksBlueprint | null>;
  isApplyingTemplate: Ref<boolean>;
};

function createBuilderState(): BuilderState {
  return {
    error: ref<string | null>(null),
    isLoading: ref(false),
    isSaving: ref(false),
    saveStatus: ref<"idle" | "saving" | "saved" | "error">("idle"),
    outline: ref(""),
    exportPath: ref<string | null>(null),
    isExporting: ref(false),
    isRevealing: ref(false),
    blueprint: ref<TalksBlueprint | null>(null),
    isApplyingTemplate: ref(false),
  };
}

type BuilderActionsArgs = {
  t: (key: string) => string;
  state: BuilderState;
  selectedProjectId: Ref<string>;
  activeProfileId: Ref<string | null | undefined>;
};

function createBuilderActions(args: BuilderActionsArgs) {
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

export function useTalkBuilderPageState() {
  const { t } = useI18n();
  const route = useRoute();

  const state = createBuilderState();
  const activeProfileId = computed(() => appState.activeProfileId);
  const selectedProjectId = computed(() => {
    const paramId = String(route.params.projectId || "");
    if (paramId) {
      return paramId;
    }
    const queryId = String(route.query.projectId || "");
    if (queryId) {
      return queryId;
    }
    return appState.activeProject?.id ?? "";
  });
  const selectedProject = computed(() => {
    const projectId = selectedProjectId.value;
    if (!projectId) {
      return null;
    }
    return appState.projects.find((project) => project.id === projectId) ?? appState.activeProject ?? null;
  });
  const talkLabel = computed(() => {
    if (!selectedProject.value) {
      return "";
    }
    const number = talksStore.getTalkNumber(selectedProject.value.id);
    const prefix = number ? `T${number} - ` : "";
    return `${prefix}${selectedProject.value.title}`;
  });
  const activeFrameworkPrompts = computed(() =>
    frameworkPrompts(t, state.blueprint.value?.framework_id ?? "hook-story-proof")
  );

  const actions = createBuilderActions({
    t,
    state,
    selectedProjectId,
    activeProfileId,
  });

  onMounted(() => {
    void actions.loadOutline();
  });
  watch(
    () => selectedProjectId.value,
    () => {
      void actions.loadOutline();
    }
  );

  return {
    t,
    error: state.error,
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    saveStatus: state.saveStatus,
    outline: state.outline,
    exportPath: state.exportPath,
    isExporting: state.isExporting,
    isRevealing: state.isRevealing,
    blueprint: state.blueprint,
    isApplyingTemplate: state.isApplyingTemplate,
    activeProfileId,
    selectedProjectId,
    talkLabel,
    activeFrameworkPrompts,
    applyFrameworkTemplate: actions.applyFrameworkTemplate,
    saveOutline: actions.saveOutline,
    exportOutline: actions.exportOutline,
    revealExport: actions.revealExport,
  };
}
