import { computed, onMounted, ref, watch, type Ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "@/lib/i18n";
import { useUiPreferences } from "@/lib/uiPreferences";
import type { MascotMessage, TalksBlueprint } from "@/schemas/ipc";
import { appState, coachStore, sessionStore, talksStore } from "@/stores/app";

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function normalizedStage(stage: string | null | undefined) {
  if (stage === "builder" || stage === "train" || stage === "export") {
    return stage;
  }
  return "draft";
}

function mascotToneClass(kind: string | null | undefined) {
  if (kind === "celebrate") {
    return "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_15%,var(--color-surface))]";
  }
  if (kind === "nudge") {
    return "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent-soft)_35%,var(--color-surface))]";
  }
  return "border-[var(--color-border)] bg-[var(--color-surface-elevated)]";
}

function blueprintPercentClass(percent: number) {
  if (percent >= 100) {
    return "bg-[var(--color-success)]";
  }
  if (percent >= 60) {
    return "bg-[var(--color-accent)]";
  }
  return "bg-[var(--color-warning)]";
}

function blueprintStepClass(done: boolean) {
  if (done) {
    return "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_14%,var(--color-surface))]";
  }
  return "border-[var(--app-border)] bg-[var(--color-surface-elevated)]";
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) {
    return "--";
  }
  return Math.round(seconds / 60).toString();
}

function formatLastActivity(t: (key: string) => string, value: string | null | undefined) {
  if (!value) {
    return t("talks.last_activity_unknown");
  }
  const date = new Date(value);
  const now = Date.now();
  const time = date.getTime();
  if (Number.isNaN(time)) {
    return t("talks.last_activity_unknown");
  }
  const diffMs = Math.max(0, now - time);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) {
    return t("talks.last_activity_just_now");
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d`;
  }
  return date.toLocaleDateString();
}

function talkNumberLabel(number: number | null | undefined) {
  if (!number) {
    return null;
  }
  return `T${number}`;
}

function talkStageLabel(t: (key: string) => string, stage: string | null | undefined) {
  const key = normalizedStage(stage);
  if (key === "draft") {
    return t("talk_steps.define");
  }
  if (key === "builder") {
    return t("talk_steps.builder");
  }
  if (key === "train") {
    return t("talk_steps.train");
  }
  return t("talk_steps.export");
}

type TalksRuntimeArgs = {
  locale: Ref<string>;
  showMascotCard: Ref<boolean>;
  state: Ref<typeof appState>;
  setError: (message: string | null) => void;
  setLoading: (value: boolean) => void;
  setBlueprintLoading: (value: boolean) => void;
  setSwitching: (id: string | null) => void;
  setMascotMessage: (value: MascotMessage | null) => void;
  setTalksBlueprint: (value: TalksBlueprint | null) => void;
};

function createTalksRuntime(args: TalksRuntimeArgs) {
  const {
    locale,
    showMascotCard,
    state,
    setError,
    setLoading,
    setBlueprintLoading,
    setSwitching,
    setMascotMessage,
    setTalksBlueprint,
  } = args;

  async function refreshTalksBlueprint() {
    if (!state.value.activeProfileId || !state.value.activeProject?.id) {
      setTalksBlueprint(null);
      return;
    }
    setBlueprintLoading(true);
    try {
      const result = await coachStore.getTalksBlueprint(state.value.activeProject.id, locale.value);
      setTalksBlueprint(result);
    } catch {
      setTalksBlueprint(null);
    } finally {
      setBlueprintLoading(false);
    }
  }

  async function refreshMascotMessage() {
    if (!showMascotCard.value || !state.value.activeProfileId) {
      setMascotMessage(null);
      return;
    }
    try {
      const result = await coachStore.getMascotContextMessage({
        routeName: "talks",
        projectId: state.value.activeProject?.id ?? null,
        locale: locale.value,
      });
      setMascotMessage(result);
    } catch {
      setMascotMessage(null);
    }
  }

  async function bootstrap() {
    setLoading(true);
    setError(null);
    try {
      await sessionStore.bootstrap();
      await talksStore.loadProjects();
      await refreshTalksBlueprint();
      await refreshMascotMessage();
    } catch (err) {
      setError(toError(err));
    } finally {
      setLoading(false);
    }
  }

  async function setActive(projectId: string) {
    setSwitching(projectId);
    setError(null);
    try {
      await talksStore.setActiveProject(projectId);
      await refreshTalksBlueprint();
      await refreshMascotMessage();
    } catch (err) {
      setError(toError(err));
    } finally {
      setSwitching(null);
    }
  }

  return { refreshTalksBlueprint, refreshMascotMessage, bootstrap, setActive };
}

type TalksLifecycleArgs = {
  locale: Ref<string>;
  mascotEnabled: Ref<boolean>;
  mascotIntensity: Ref<string>;
  activeProjectId: Ref<string>;
  bootstrap: () => Promise<void>;
  refreshTalksBlueprint: () => Promise<void>;
  refreshMascotMessage: () => Promise<void>;
};

function bindTalksLifecycle(args: TalksLifecycleArgs) {
  const {
    locale,
    mascotEnabled,
    mascotIntensity,
    activeProjectId,
    bootstrap,
    refreshTalksBlueprint,
    refreshMascotMessage,
  } = args;

  onMounted(() => {
    void bootstrap();
  });

  watch(
    () => [locale.value, mascotEnabled.value, mascotIntensity.value, activeProjectId.value] as const,
    () => {
      void refreshTalksBlueprint();
      void refreshMascotMessage();
    }
  );
}

export function useTalksPageState() {
  const { t, locale } = useI18n();
  const { settings: uiSettings } = useUiPreferences();
  const router = useRouter();

  const state = computed(() => appState);
  const error = ref<string | null>(null);
  const isLoading = ref(false);
  const isBlueprintLoading = ref(false);
  const isSwitching = ref<string | null>(null);
  const mascotMessage = ref<MascotMessage | null>(null);
  const talksBlueprint = ref<TalksBlueprint | null>(null);

  const showMascotCard = computed(() => uiSettings.value.mascotEnabled);
  const mascotBody = computed(() =>
    uiSettings.value.mascotIntensity === "minimal" ? "" : mascotMessage.value?.body ?? ""
  );

  const { refreshTalksBlueprint, refreshMascotMessage, bootstrap, setActive } = createTalksRuntime({
    locale,
    showMascotCard,
    state,
    setError: (message) => {
      error.value = message;
    },
    setLoading: (value) => {
      isLoading.value = value;
    },
    setBlueprintLoading: (value) => {
      isBlueprintLoading.value = value;
    },
    setSwitching: (id) => {
      isSwitching.value = id;
    },
    setMascotMessage: (value) => {
      mascotMessage.value = value;
    },
    setTalksBlueprint: (value) => {
      talksBlueprint.value = value;
    },
  });

  bindTalksLifecycle({
    locale,
    mascotEnabled: computed(() => uiSettings.value.mascotEnabled),
    mascotIntensity: computed(() => uiSettings.value.mascotIntensity),
    activeProjectId: computed(() => state.value.activeProject?.id ?? ""),
    bootstrap,
    refreshTalksBlueprint,
    refreshMascotMessage,
  });

  function goToDefine(projectId: string) {
    void router.push(`/talks/${projectId}/define`);
  }

  return {
    t,
    state,
    error,
    isLoading,
    isBlueprintLoading,
    isSwitching,
    mascotMessage,
    talksBlueprint,
    showMascotCard,
    mascotBody,
    mascotToneClass,
    blueprintPercentClass,
    blueprintStepClass,
    formatDuration,
    formatLastActivity: (value: string | null | undefined) => formatLastActivity(t, value),
    talkNumberLabel,
    talkStageLabel: (stage: string | null | undefined) => talkStageLabel(t, stage),
    setActive,
    goToDefine,
  };
}
