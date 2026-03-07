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

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

type TalkDefineRuntimeArgs = {
  t: (key: string) => string;
  project: Ref<TalkProject | null>;
  activeProfileId: Ref<string | null>;
  form: DefineFormState;
  nextAction: Ref<DefineNextAction | null>;
  setSaveError: (value: string | null) => void;
  setSaveState: (value: "idle" | "saving" | "saved" | "error") => void;
  setError: (value: string | null) => void;
  setLoading: (value: boolean) => void;
  pushRoute: (to: string) => Promise<void>;
};

export function createTalkDefineRuntime(args: TalkDefineRuntimeArgs) {
  const {
    t,
    project,
    activeProfileId,
    form,
    nextAction,
    setSaveError,
    setSaveState,
    setError,
    setLoading,
    pushRoute,
  } = args;

  async function persistDefine(stageOverride?: string) {
    if (!project.value || !activeProfileId.value) {
      return false;
    }
    setSaveError(null);
    let payload: DefinePayload;
    try {
      payload = buildPayload(t, project.value, form, stageOverride);
    } catch (err) {
      setSaveState("error");
      setSaveError(toError(err));
      return false;
    }
    if (payloadMatchesProject(project.value, payload)) {
      setSaveState("saved");
      return true;
    }
    setSaveState("saving");
    try {
      await talksStore.updateProject(project.value.id, payload);
      setSaveState("saved");
      return true;
    } catch (err) {
      setSaveState("error");
      setSaveError(toError(err));
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
    await pushRoute(nextAction.value.route);
  }

  async function bootstrap() {
    setLoading(true);
    setError(null);
    try {
      await sessionStore.bootstrap();
      await talksStore.loadProjects();
    } catch (err) {
      setError(toError(err));
    } finally {
      setLoading(false);
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
