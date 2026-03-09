import type { Ref } from "vue";
import { sessionStore, talksStore } from "@/stores/app";
import {
  clearRuntimeUiError,
  setRuntimeUiError,
  type RuntimeErrorCategory,
} from "@/features/shared/runtime/runtimeContract";

type ProjectSetupPayload = {
  title: string;
  audience: string | null;
  goal: string | null;
  duration_target_sec: number | null;
};

export type ProjectSetupPageRuntimeState = {
  model: {
    activeProfileId: Ref<string | null>;
    activeProject: Ref<{ id: string; title: string } | null>;
  };
  draft: {
    title: Ref<string>;
    audience: Ref<string>;
    goal: Ref<string>;
    duration: Ref<string>;
  };
  ui: {
    error: Ref<string | null>;
    errorCategory?: Ref<RuntimeErrorCategory | null>;
    isSaving: Ref<boolean>;
  };
};

export type ProjectSetupPageRuntimeDeps = {
  t: (key: string) => string;
  bootstrapSession: () => Promise<void>;
  createProject: (payload: ProjectSetupPayload) => Promise<unknown>;
  pushHome: () => Promise<void>;
};

function createDefaultProjectSetupPageRuntimeDeps(
  t: (key: string) => string,
  pushHome: () => Promise<void>
): ProjectSetupPageRuntimeDeps {
  return {
    t,
    bootstrapSession: () => sessionStore.bootstrap(),
    createProject: (payload) => talksStore.createProject(payload),
    pushHome,
  };
}

type ProjectSetupPageRuntimeArgs = {
  t: (key: string) => string;
  pushHome: () => Promise<void>;
  state: ProjectSetupPageRuntimeState;
  deps?: ProjectSetupPageRuntimeDeps;
};

/**
 * Creates project-setup runtime commands for bootstrap and project creation.
 * Validation and payload normalization are handled before calling store APIs.
 */
export function createProjectSetupPageRuntime(args: ProjectSetupPageRuntimeArgs) {
  const deps =
    args.deps ?? createDefaultProjectSetupPageRuntimeDeps(args.t, args.pushHome);
  const { model, draft, ui } = args.state;
  // Policy: saveProject uses singleFlight.
  let saveInFlight: Promise<void> | null = null;

  async function bootstrap() {
    clearRuntimeUiError(ui);
    try {
      await deps.bootstrapSession();
    } catch (err) {
      setRuntimeUiError(ui, err);
    }
  }

  async function saveProject() {
    if (saveInFlight) {
      return saveInFlight;
    }
    if (!model.activeProfileId.value) {
      ui.error.value = deps.t("talk.need_profile");
      if (ui.errorCategory) {
        ui.errorCategory.value = "validation";
      }
      return;
    }
    if (!draft.title.value.trim()) {
      ui.error.value = deps.t("talk.title_required");
      if (ui.errorCategory) {
        ui.errorCategory.value = "validation";
      }
      return;
    }

    const run = (async () => {
      ui.isSaving.value = true;
      clearRuntimeUiError(ui);
      try {
        // Keep input parsing at runtime boundary so store receives schema-aligned payload values.
        const minutes = Number(draft.duration.value);
        await deps.createProject({
          title: draft.title.value.trim(),
          audience: draft.audience.value.trim() || null,
          goal: draft.goal.value.trim() || null,
          duration_target_sec:
            draft.duration.value && Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : null,
        });
        await deps.pushHome();
      } catch (err) {
        setRuntimeUiError(ui, err);
      } finally {
        ui.isSaving.value = false;
      }
    })();
    saveInFlight = run;
    await run.finally(() => {
      if (saveInFlight === run) {
        saveInFlight = null;
      }
    });
  }

  return {
    bootstrap,
    saveProject,
  };
}
