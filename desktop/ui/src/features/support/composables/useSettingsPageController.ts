import { useI18n } from "@/lib/i18n";
import { useSettingsAsrModels } from "@/features/support/composables/settings/useSettingsAsrModels";
import { useSettingsInsights } from "@/features/support/composables/settings/useSettingsInsights";
import { useSettingsPreferences } from "@/features/support/composables/settings/useSettingsPreferences";

export function useSettingsPageController() {
  const { t } = useI18n();
  const insights = useSettingsInsights();
  const asrModels = useSettingsAsrModels(t);
  const preferences = useSettingsPreferences(t, asrModels.modelOptions);

  return {
    ...insights,
    ...asrModels,
    ...preferences,
  };
}
