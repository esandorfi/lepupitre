<script setup lang="ts">
import { computed } from "vue";
import type { GamificationMode, MascotIntensity } from "@/lib/uiPreferences";

type SelectOption = { value: string; label: string; disabled?: boolean };

const props = defineProps<{
  t: (key: string) => string;
  gamificationModeOptions: SelectOption[];
  mascotIntensityOptions: SelectOption[];
  selectedGamificationMode: GamificationMode;
  mascotEnabled: boolean;
  selectedMascotIntensity: MascotIntensity;
}>();

const emit = defineEmits<{
  "update:selectedGamificationMode": [value: GamificationMode];
  "update:mascotEnabled": [value: boolean];
  "update:selectedMascotIntensity": [value: MascotIntensity];
}>();

const selectedGamificationModeModel = computed({
  get: () => props.selectedGamificationMode,
  set: (value: GamificationMode) => emit("update:selectedGamificationMode", value),
});

const mascotEnabledModel = computed({
  get: () => props.mascotEnabled,
  set: (value: boolean) => emit("update:mascotEnabled", value),
});

const selectedMascotIntensityModel = computed({
  get: () => props.selectedMascotIntensity,
  set: (value: MascotIntensity) => emit("update:selectedMascotIntensity", value),
});
</script>

<template>
  <UCard class="app-panel app-panel-compact app-radius-panel-lg" variant="outline">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="app-nav-text text-lg font-semibold">
          {{ t("settings.voiceup.title") }}
        </h2>
        <p class="app-muted text-xs">
          {{ t("settings.voiceup.subtitle") }}
        </p>
      </div>
      <div class="app-muted text-xs">
        {{ t("settings.voiceup.scope") }}
      </div>
    </div>

    <div class="mt-4 grid gap-4 md:grid-cols-3">
      <UFormField
        :label="t('settings.voiceup.gamification_label')"
        :help="t('settings.voiceup.gamification_note')"
        class="app-nav-text text-xs"
      >
        <USelect
          v-model="selectedGamificationModeModel"
          class="w-full"
          :items="gamificationModeOptions"
          value-key="value"
        />
      </UFormField>

      <UFormField
        :label="t('settings.voiceup.mascot_enabled_label')"
        :help="t('settings.voiceup.mascot_note')"
        class="app-nav-text text-xs"
      >
        <USwitch
          v-model="mascotEnabledModel"
          :label="mascotEnabledModel ? t('settings.voiceup.mascot_on') : t('settings.voiceup.mascot_off')"
          size="md"
        />
      </UFormField>

      <UFormField
        :label="t('settings.voiceup.mascot_intensity_label')"
        :help="t('settings.voiceup.mascot_intensity_note')"
        class="app-nav-text text-xs"
      >
        <USelect
          v-model="selectedMascotIntensityModel"
          class="w-full"
          :disabled="!mascotEnabledModel"
          :items="mascotIntensityOptions"
          value-key="value"
        />
      </UFormField>
    </div>
  </UCard>
</template>
