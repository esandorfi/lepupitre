import { onMounted, watch, type Ref } from "vue";
import type { MascotMessage, TalksBlueprint } from "@/schemas/ipc";
import { coachStore, sessionStore, talksStore } from "@/stores/app";

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

type TalksRuntimeArgs<State> = {
  locale: Ref<string>;
  showMascotCard: Ref<boolean>;
  state: Ref<State>;
  setError: (message: string | null) => void;
  setLoading: (value: boolean) => void;
  setBlueprintLoading: (value: boolean) => void;
  setSwitching: (id: string | null) => void;
  setMascotMessage: (value: MascotMessage | null) => void;
  setTalksBlueprint: (value: TalksBlueprint | null) => void;
};

type TalksLifecycleArgs = {
  locale: Ref<string>;
  mascotEnabled: Ref<boolean>;
  mascotIntensity: Ref<string>;
  activeProjectId: Ref<string>;
  bootstrap: () => Promise<void>;
  refreshTalksBlueprint: () => Promise<void>;
  refreshMascotMessage: () => Promise<void>;
};

type TalksRuntimeState = {
  activeProfileId: string | null;
  activeProject?: { id: string } | null;
};

export function createTalksRuntime<State extends TalksRuntimeState>(args: TalksRuntimeArgs<State>) {
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

export function bindTalksLifecycle(args: TalksLifecycleArgs) {
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
