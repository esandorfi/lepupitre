import { reactive, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProfileSummary } from "@/schemas/ipc";
import {
  bindProfilesPageControllerLifecycle,
  useProfilesPageController,
} from "@/features/workspace/composables/useProfilesPageController";

const controllerMocks = vi.hoisted(() => ({
  onMounted: vi.fn(),
  watch: vi.fn(),
  useRoute: vi.fn(),
  useRouter: vi.fn(),
  ensureBootstrapped: vi.fn(async () => {}),
  workspaceStore: {
    createProfile: vi.fn(async () => "profile-new"),
    switchProfile: vi.fn(async () => {}),
    renameProfile: vi.fn(async () => {}),
    deleteProfile: vi.fn(async () => {}),
  },
}));

vi.mock("vue", async () => {
  const actual = await vi.importActual<typeof import("vue")>("vue");
  return {
    ...actual,
    onMounted: controllerMocks.onMounted,
    watch: controllerMocks.watch,
  };
});

vi.mock("vue-router", () => ({
  useRoute: controllerMocks.useRoute,
  useRouter: controllerMocks.useRouter,
}));

vi.mock("@/stores/app", () => ({
  appState: {
    profiles: [
      {
        id: "profile-1",
        name: "Alpha",
        created_at: "2026-03-01T10:00:00Z",
        is_active: true,
        talks_count: 0,
        size_bytes: 0,
        last_opened_at: null,
      },
    ] as ProfileSummary[],
    activeProfileId: "profile-1",
  },
  sessionStore: {
    ensureBootstrapped: controllerMocks.ensureBootstrapped,
  },
  workspaceStore: controllerMocks.workspaceStore,
}));

describe("useProfilesPageController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controllerMocks.useRoute.mockReturnValue({
      name: "profiles",
      query: {},
      params: {},
    });
    controllerMocks.useRouter.mockReturnValue({
      push: vi.fn(async () => {}),
    });
  });

  it("returns a flat vm surface and registers lifecycle hooks", () => {
    const controller = reactive(useProfilesPageController((key: string) => key));

    expect("t" in controller).toBe(false);
    expect(controller.profiles.length).toBe(1);
    expect(typeof controller.createProfile).toBe("function");
    expect(typeof controller.profileMenuItems).toBe("function");
    expect(controllerMocks.onMounted).toHaveBeenCalledTimes(1);
    expect(controllerMocks.watch).toHaveBeenCalledTimes(1);
  });

  it("focuses the create form from the route query through the mounted lifecycle", async () => {
    controllerMocks.useRoute.mockReturnValue({
      name: "profiles",
      query: { create: "1" },
      params: {},
    });
    const focus = vi.fn();
    const select = vi.fn();
    const scrollIntoView = vi.fn();
    const previousHtmlInputElement = globalThis.HTMLInputElement;
    class MockHtmlInputElement {
      focus = focus;
      select = select;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).HTMLInputElement = MockHtmlInputElement;
    const controller = useProfilesPageController((key: string) => key);
    controller.createInput.value = {
      inputRef: new MockHtmlInputElement() as unknown as HTMLInputElement,
    };
    controller.createSection.value = { scrollIntoView } as unknown as HTMLElement;

    const mounted = controllerMocks.onMounted.mock.calls[0]?.[0] as () => Promise<void>;
    await mounted();

    expect(controllerMocks.ensureBootstrapped).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();
    expect(select).toHaveBeenCalled();

    if (previousHtmlInputElement) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).HTMLInputElement = previousHtmlInputElement;
    } else {
      Reflect.deleteProperty(globalThis, "HTMLInputElement");
    }
  });
});

describe("bindProfilesPageControllerLifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps bootstrap failures into localized page errors", async () => {
    const createQuery = ref<unknown>(null);
    const error = ref<string | null>(null);
    const focusCreateForm = vi.fn(async () => {});

    bindProfilesPageControllerLifecycle({
      createQuery,
      error,
      focusCreateForm,
      t: (key: string) => key,
      deps: {
        ensureBootstrapped: vi.fn(async () => {
          throw new Error("recording_active");
        }),
        toLocalizedError: (t, err) =>
          err instanceof Error && err.message.includes("recording_active")
            ? t("profiles.switch_blocked_recording")
            : String(err),
      },
    });

    const mounted = controllerMocks.onMounted.mock.calls[0]?.[0] as () => Promise<void>;
    await mounted();

    expect(error.value).toBe("profiles.switch_blocked_recording");
    expect(focusCreateForm).not.toHaveBeenCalled();
  });
});
