import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "@/lib/i18n";
import { appState } from "@/stores/app";
import {
  checklistRowClass,
  createNextAction,
  minutesLabel,
  normalizeStage,
  type DefineFormState,
  type DefineStage,
} from "@/features/talks/composables/talkDefinePageHelpers";
import {
  bindTalkDefineLifecycle,
  createTalkDefineRuntime,
} from "@/features/talks/composables/talkDefinePageRuntime";

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

  const { saveDefine, setStage, runNextAction, bootstrap } = createTalkDefineRuntime({
    t,
    pushRoute: async (to) => {
      await router.push(to);
    },
    state: {
      identity: {
        activeProfileId,
      },
      model: {
        project,
        nextAction,
      },
      draft: {
        form,
      },
      ui: {
        saveError,
        saveState,
        error,
        isLoading,
      },
    },
  });

  bindTalkDefineLifecycle({
    project,
    form,
    bootstrap,
  });

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
