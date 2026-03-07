import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "@/lib/i18n";
import { appState, sessionStore, talksStore } from "@/stores/app";

type DefineStage = "draft" | "builder" | "train" | "export";

type DefineFormState = {
  title: string;
  audience: string;
  goal: string;
  durationMinutes: string;
};

type DefinePayload = {
  title: string;
  audience: string | null;
  goal: string | null;
  duration_target_sec: number | null;
  stage: string;
};

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeStage(stage: string | null | undefined): DefineStage {
  if (stage === "builder" || stage === "train" || stage === "export") {
    return stage;
  }
  return "draft";
}

function checklistRowClass(done: boolean) {
  return done
    ? "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_12%,var(--color-surface))]"
    : "border-[var(--app-border)] bg-[var(--color-surface-elevated)]";
}

function minutesLabel(
  t: (key: string) => string,
  seconds: number | null | undefined
) {
  if (!seconds || seconds <= 0) {
    return t("talk_define.duration_missing");
  }
  return `${Math.round(seconds / 60)} ${t("talks.minutes")}`;
}

function syncFormFromProject(form: DefineFormState, project: (typeof appState.projects)[number] | null) {
  if (!project) {
    form.title = "";
    form.audience = "";
    form.goal = "";
    form.durationMinutes = "";
    return;
  }
  form.title = project.title ?? "";
  form.audience = project.audience ?? "";
  form.goal = project.goal ?? "";
  form.durationMinutes = project.duration_target_sec
    ? String(Math.round(project.duration_target_sec / 60))
    : "";
}

function buildPayload(
  t: (key: string) => string,
  project: (typeof appState.projects)[number] | null,
  form: DefineFormState,
  stageOverride?: string
): DefinePayload {
  if (!project) {
    throw new Error("project_not_found");
  }
  const title = form.title.trim();
  if (!title) {
    throw new Error(t("talk.title_required"));
  }
  let duration_target_sec: number | null = null;
  const durationRaw = form.durationMinutes.trim();
  if (durationRaw) {
    const minutes = Number(durationRaw);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      throw new Error(t("talk_define.duration_invalid"));
    }
    duration_target_sec = Math.round(minutes * 60);
  }
  return {
    title,
    audience: normalizeOptional(form.audience),
    goal: normalizeOptional(form.goal),
    duration_target_sec,
    stage: stageOverride ?? project.stage ?? "draft",
  };
}

function payloadMatchesProject(
  project: (typeof appState.projects)[number] | null,
  payload: DefinePayload
) {
  if (!project) {
    return true;
  }
  return (
    payload.title === project.title &&
    (payload.audience ?? null) === (project.audience ?? null) &&
    (payload.goal ?? null) === (project.goal ?? null) &&
    (payload.duration_target_sec ?? null) === (project.duration_target_sec ?? null) &&
    payload.stage === project.stage
  );
}

function createNextAction(
  t: (key: string) => string,
  projectId: string | undefined,
  projectStage: DefineStage
) {
  if (!projectId) {
    return null;
  }
  if (projectStage === "draft") {
    return {
      nextStage: "builder",
      route: `/talks/${projectId}/builder`,
      label: t("talk_define.continue_builder"),
    };
  }
  if (projectStage === "builder") {
    return {
      nextStage: "train",
      route: `/talks/${projectId}/train`,
      label: t("talk_define.continue_train"),
    };
  }
  if (projectStage === "train") {
    return {
      nextStage: "export",
      route: `/talks/${projectId}/export`,
      label: t("talk_define.continue_export"),
    };
  }
  return {
    nextStage: "export",
    route: `/talks/${projectId}/export`,
    label: t("talk_define.open_export"),
  };
}

export function useTalkDefinePageState() {
  const { t } = useI18n();
  const route = useRoute();
  const router = useRouter();

  const error = ref<string | null>(null);
  const isLoading = ref(false);
  const saveError = ref<string | null>(null);
  const saveState = ref<"idle" | "saving" | "saved" | "error">("idle");
  const form = reactive<DefineFormState>({
    title: "",
    audience: "",
    goal: "",
    durationMinutes: "",
  });

  const projectId = computed(() => String(route.params.projectId || ""));
  const activeProfileId = computed(() => appState.activeProfileId);
  const project = computed(() => appState.projects.find((item) => item.id === projectId.value) ?? null);
  const stageOptions = computed(() => [
    { value: "draft", label: t("talk_steps.define") },
    { value: "builder", label: t("talk_steps.builder") },
    { value: "train", label: t("talk_steps.train") },
    { value: "export", label: t("talk_steps.export") },
  ]);
  const projectStage = computed<DefineStage>(() => normalizeStage(project.value?.stage));
  const defineChecklist = computed(() => {
    const titleDone = form.title.trim().length > 0;
    const audienceDone = form.audience.trim().length > 0;
    const goalDone = form.goal.trim().length > 0;
    const durationDone = Number(form.durationMinutes.trim()) > 0;
    return [
      { id: "title", label: t("talk_define.check_title"), done: titleDone },
      { id: "audience", label: t("talk_define.check_audience"), done: audienceDone },
      { id: "goal", label: t("talk_define.check_goal"), done: goalDone },
      { id: "duration", label: t("talk_define.check_duration"), done: durationDone },
    ];
  });
  const defineCompletedCount = computed(
    () => defineChecklist.value.filter((item) => item.done).length
  );
  const defineCompletionPercent = computed(() =>
    Math.round((defineCompletedCount.value / defineChecklist.value.length) * 100)
  );
  const defineReady = computed(() => defineCompletedCount.value >= defineChecklist.value.length);
  const nextMissingDefineItem = computed(
    () => defineChecklist.value.find((item) => !item.done)?.label ?? null
  );
  const nextAction = computed(() =>
    createNextAction(t, project.value?.id, projectStage.value)
  );

  async function persistDefine(stageOverride?: string) {
    if (!project.value || !activeProfileId.value) {
      return false;
    }
    saveError.value = null;
    let payload: DefinePayload;
    try {
      payload = buildPayload(t, project.value, form, stageOverride);
    } catch (err) {
      saveState.value = "error";
      saveError.value = toError(err);
      return false;
    }
    if (payloadMatchesProject(project.value, payload)) {
      saveState.value = "saved";
      return true;
    }
    saveState.value = "saving";
    try {
      await talksStore.updateProject(project.value.id, payload);
      saveState.value = "saved";
      return true;
    } catch (err) {
      saveState.value = "error";
      saveError.value = toError(err);
      return false;
    }
  }

  async function saveDefine() {
    await persistDefine();
  }

  async function setStage(stage: string) {
    if (!project.value || stage === project.value.stage) {
      return;
    }
    await persistDefine(stage);
  }

  async function runNextAction() {
    if (!nextAction.value) {
      return;
    }
    const didSave = await persistDefine(nextAction.value.nextStage);
    if (!didSave) {
      return;
    }
    await router.push(nextAction.value.route);
  }

  async function bootstrap() {
    isLoading.value = true;
    error.value = null;
    try {
      await sessionStore.bootstrap();
      await talksStore.loadProjects();
    } catch (err) {
      error.value = toError(err);
    } finally {
      isLoading.value = false;
    }
  }

  onMounted(() => {
    void bootstrap();
  });
  watch(
    project,
    () => {
      syncFormFromProject(form, project.value);
    },
    { immediate: true }
  );

  return {
    t,
    projectId,
    activeProfileId,
    project,
    error,
    isLoading,
    saveError,
    saveState,
    form,
    stageOptions,
    projectStage,
    defineChecklist,
    defineCompletedCount,
    defineCompletionPercent,
    defineReady,
    nextMissingDefineItem,
    nextAction,
    minutesLabel: (seconds: number | null | undefined) => minutesLabel(t, seconds),
    checklistRowClass,
    saveDefine,
    setStage,
    runNextAction,
  };
}
