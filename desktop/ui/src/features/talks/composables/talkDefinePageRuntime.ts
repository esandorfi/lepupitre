import { onMounted, watch, type Ref } from "vue";
import { sessionStore, talksStore } from "@/stores/app";
import {
  buildPayload,
  payloadMatchesProject,
  syncFormFromProject,
  type DefineFormState,
  type DefineNextAction,
  type DefinePayload,
  type TalkProject,
} from "@/features/talks/composables/talkDefinePageHelpers";
import {
  clearRuntimeUiError,
  normalizeRuntimeError,
  setRuntimeUiError,
  type RuntimeErrorCategory,
} from "@/features/shared/runtime/runtimeContract";

export type TalkDefineRuntimeState = {
  identity: {
    activeProfileId: Ref<string | null>;
  };
  model: {
    project: Ref<TalkProject | null>;
    nextAction: Ref<DefineNextAction | null>;
  };
  draft: {
    form: DefineFormState;
  };
  ui: {
    saveError: Ref<string | null>;
    saveErrorCategory?: Ref<RuntimeErrorCategory | null>;
    saveState: Ref<"idle" | "saving" | "saved" | "error">;
    error: Ref<string | null>;
    errorCategory?: Ref<RuntimeErrorCategory | null>;
    isLoading: Ref<boolean>;
  };
};

export type TalkDefineRuntimeDeps = {
  t: (key: string) => string;
  bootstrapSession: () => Promise<void>;
  loadProjects: () => Promise<void>;
  updateProject: (projectId: string, payload: DefinePayload) => Promise<void>;
  pushRoute: (to: string) => Promise<void>;
};

function createDefaultTalkDefineRuntimeDeps(
  t: (key: string) => string,
  pushRoute: (to: string) => Promise<void>
): TalkDefineRuntimeDeps {
  return {
    t,
    bootstrapSession: () => sessionStore.bootstrap(),
    loadProjects: () => talksStore.loadProjects(),
    updateProject: (projectId, payload) => talksStore.updateProject(projectId, payload),
    pushRoute,
  };
}

type TalkDefineRuntimeArgs = {
  state: TalkDefineRuntimeState;
  deps?: TalkDefineRuntimeDeps;
  t: (key: string) => string;
  pushRoute: (to: string) => Promise<void>;
};

export function createTalkDefineRuntime(args: TalkDefineRuntimeArgs) {
  const deps = args.deps ?? createDefaultTalkDefineRuntimeDeps(args.t, args.pushRoute);
  const { identity, model, draft, ui } = args.state;

  async function persistDefine(stageOverride?: string) {
    if (!model.project.value || !identity.activeProfileId.value) {
      return false;
    }
    ui.saveError.value = null;
    if (ui.saveErrorCategory) {
      ui.saveErrorCategory.value = null;
    }
    let payload: DefinePayload;
    try {
      payload = buildPayload(deps.t, model.project.value, draft.form, stageOverride);
    } catch (err) {
      ui.saveState.value = "error";
      const normalized = normalizeRuntimeError(err, { validationCodes: ["project_missing"] });
      ui.saveError.value = normalized.message;
      if (ui.saveErrorCategory) {
        ui.saveErrorCategory.value = normalized.category;
      }
      return false;
    }
    if (payloadMatchesProject(model.project.value, payload)) {
      ui.saveState.value = "saved";
      return true;
    }
    ui.saveState.value = "saving";
    try {
      await deps.updateProject(model.project.value.id, payload);
      ui.saveState.value = "saved";
      return true;
    } catch (err) {
      ui.saveState.value = "error";
      const normalized = normalizeRuntimeError(err);
      ui.saveError.value = normalized.message;
      if (ui.saveErrorCategory) {
        ui.saveErrorCategory.value = normalized.category;
      }
      return false;
    }
  }

  async function saveDefine() {
    await persistDefine();
  }

  async function setStage(stage: string) {
    if (!model.project.value || stage === model.project.value.stage) {
      return;
    }
    await persistDefine(stage);
  }

  async function runNextAction() {
    if (!model.nextAction.value) {
      return;
    }
    const didSave = await persistDefine(model.nextAction.value.nextStage);
    if (!didSave) {
      return;
    }
    await deps.pushRoute(model.nextAction.value.route);
  }

  async function bootstrap() {
    ui.isLoading.value = true;
    clearRuntimeUiError(ui);
    try {
      await deps.bootstrapSession();
      await deps.loadProjects();
    } catch (err) {
      setRuntimeUiError(ui, err);
    } finally {
      ui.isLoading.value = false;
    }
  }

  return { saveDefine, setStage, runNextAction, bootstrap };
}

type TalkDefineLifecycleArgs = {
  project: Ref<TalkProject | null>;
  form: DefineFormState;
  bootstrap: () => Promise<void>;
};

export function bindTalkDefineLifecycle(args: TalkDefineLifecycleArgs) {
  const { project, form, bootstrap } = args;
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
}
