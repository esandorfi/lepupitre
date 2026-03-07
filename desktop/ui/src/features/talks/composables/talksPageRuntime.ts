import { onMounted, watch, type Ref } from "vue";
import type { MascotMessage, TalksBlueprint } from "@/schemas/ipc";
import { coachStore, sessionStore, talksStore } from "@/stores/app";

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

type TalksRuntimeStateModel = {
  activeProfileId: string | null;
  activeProject?: { id: string } | null;
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

export type TalksRuntimeState = {
  identity: {
    locale: Ref<string>;
    showMascotCard: Ref<boolean>;
  };
  model: {
    appState: Ref<TalksRuntimeStateModel>;
    mascotMessage: Ref<MascotMessage | null>;
    talksBlueprint: Ref<TalksBlueprint | null>;
  };
  ui: {
    error: Ref<string | null>;
    isLoading: Ref<boolean>;
    isBlueprintLoading: Ref<boolean>;
    isSwitching: Ref<string | null>;
  };
};

export type TalksRuntimeDeps = {
  getTalksBlueprint: (projectId: string, locale: string) => Promise<TalksBlueprint>;
  getMascotContextMessage: (args: {
    routeName: "talks";
    projectId: string | null;
    locale: string;
  }) => Promise<MascotMessage | null>;
  bootstrapSession: () => Promise<void>;
  loadProjects: () => Promise<void>;
  setActiveProject: (projectId: string) => Promise<void>;
};

function createDefaultTalksRuntimeDeps(): TalksRuntimeDeps {
  return {
    getTalksBlueprint: (projectId, locale) => coachStore.getTalksBlueprint(projectId, locale),
    getMascotContextMessage: (args) => coachStore.getMascotContextMessage(args),
    bootstrapSession: () => sessionStore.bootstrap(),
    loadProjects: () => talksStore.loadProjects(),
    setActiveProject: (projectId) => talksStore.setActiveProject(projectId),
  };
}

type TalksRuntimeArgs = {
  state: TalksRuntimeState;
  deps?: TalksRuntimeDeps;
};

export function createTalksRuntime(args: TalksRuntimeArgs) {
  const deps = args.deps ?? createDefaultTalksRuntimeDeps();
  const { identity, model, ui } = args.state;
  let blueprintSequence = 0;

  async function refreshTalksBlueprint() {
    const requestId = ++blueprintSequence;
    if (!model.appState.value.activeProfileId || !model.appState.value.activeProject?.id) {
      model.talksBlueprint.value = null;
      return;
    }
    ui.isBlueprintLoading.value = true;
    try {
      const result = await deps.getTalksBlueprint(
        model.appState.value.activeProject.id,
        identity.locale.value
      );
      if (requestId !== blueprintSequence) {
        return;
      }
      model.talksBlueprint.value = result;
    } catch {
      if (requestId !== blueprintSequence) {
        return;
      }
      model.talksBlueprint.value = null;
    } finally {
      if (requestId === blueprintSequence) {
        ui.isBlueprintLoading.value = false;
      }
    }
  }

  async function refreshMascotMessage() {
    if (!identity.showMascotCard.value || !model.appState.value.activeProfileId) {
      model.mascotMessage.value = null;
      return;
    }
    try {
      const result = await deps.getMascotContextMessage({
        routeName: "talks",
        projectId: model.appState.value.activeProject?.id ?? null,
        locale: identity.locale.value,
      });
      model.mascotMessage.value = result;
    } catch {
      model.mascotMessage.value = null;
    }
  }

  async function bootstrap() {
    ui.isLoading.value = true;
    ui.error.value = null;
    try {
      await deps.bootstrapSession();
      await deps.loadProjects();
      await refreshTalksBlueprint();
      await refreshMascotMessage();
    } catch (err) {
      ui.error.value = toError(err);
    } finally {
      ui.isLoading.value = false;
    }
  }

  async function setActive(projectId: string) {
    ui.isSwitching.value = projectId;
    ui.error.value = null;
    try {
      await deps.setActiveProject(projectId);
      await refreshTalksBlueprint();
      await refreshMascotMessage();
    } catch (err) {
      ui.error.value = toError(err);
    } finally {
      ui.isSwitching.value = null;
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
