import { reactive, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSettingsPageController } from "./useSettingsPageController";

const mocks = vi.hoisted(() => ({
  useI18n: vi.fn(),
  useSettingsInsights: vi.fn(),
  useSettingsAsrModels: vi.fn(),
  useSettingsPreferences: vi.fn(),
}));

vi.mock("@/lib/i18n", () => ({
  useI18n: mocks.useI18n,
}));

vi.mock("@/features/support/composables/settings/useSettingsInsights", () => ({
  useSettingsInsights: mocks.useSettingsInsights,
}));

vi.mock("@/features/support/composables/settings/useSettingsAsrModels", () => ({
  useSettingsAsrModels: mocks.useSettingsAsrModels,
}));

vi.mock("@/features/support/composables/settings/useSettingsPreferences", () => ({
  useSettingsPreferences: mocks.useSettingsPreferences,
}));

describe("useSettingsPageController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wires translation dependencies and keeps t out of the public return", () => {
    const t = vi.fn((key: string) => key);
    const modelOptions = ref([{ id: "tiny", installed: true }]);
    const insights = { navMetrics: { switchCount: 0 } };
    const asrModels = { modelOptions };
    const preferences = { selectedNavMode: ref("top") };

    mocks.useI18n.mockReturnValue({ t });
    mocks.useSettingsInsights.mockReturnValue(insights);
    mocks.useSettingsAsrModels.mockReturnValue(asrModels);
    mocks.useSettingsPreferences.mockReturnValue(preferences);

    const controller = useSettingsPageController();

    expect(mocks.useSettingsAsrModels).toHaveBeenCalledWith(t);
    expect(mocks.useSettingsPreferences).toHaveBeenCalledWith(t, modelOptions);
    expect("t" in controller).toBe(false);
  });

  it("supports SettingsPage vm-style updates on writable refs", () => {
    const t = vi.fn((key: string) => key);
    const selectedNavMode = ref<"top" | "sidebar-icon">("top");
    const mascotEnabled = ref(true);
    const resetNavMetrics = vi.fn();

    mocks.useI18n.mockReturnValue({ t });
    mocks.useSettingsInsights.mockReturnValue({ resetNavMetrics });
    mocks.useSettingsAsrModels.mockReturnValue({ modelOptions: ref([]) });
    mocks.useSettingsPreferences.mockReturnValue({
      selectedNavMode,
      mascotEnabled,
    });

    const vm = reactive(useSettingsPageController() as Record<string, unknown>);

    (vm as { selectedNavMode: "top" | "sidebar-icon" }).selectedNavMode = "sidebar-icon";
    (vm as { mascotEnabled: boolean }).mascotEnabled = false;
    (vm as { resetNavMetrics: () => void }).resetNavMetrics();

    expect(selectedNavMode.value).toBe("sidebar-icon");
    expect(mascotEnabled.value).toBe(false);
    expect(resetNavMetrics).toHaveBeenCalledTimes(1);
  });
});
