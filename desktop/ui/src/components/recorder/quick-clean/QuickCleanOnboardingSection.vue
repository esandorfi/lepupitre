<script setup lang="ts">
import { useI18n } from "@/lib/i18n";

const props = defineProps<{
  audienceOptions: readonly string[];
  goalOptions: readonly string[];
  audience: string;
  audienceCustom: string;
  goal: string;
  targetMinutes: number | null;
}>();

const emit = defineEmits<{
  (event: "selectAudience", value: string): void;
  (event: "update:audienceCustom", value: string): void;
  (event: "selectGoal", value: string): void;
  (event: "update:targetMinutes", value: number | null): void;
  (event: "skip"): void;
}>();

const { t } = useI18n();

function updateAudienceCustom(value: string | number | null | undefined) {
  emit("update:audienceCustom", String(value));
}

function updateTargetMinutes(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    emit("update:targetMinutes", null);
    return;
  }
  const normalized = typeof value === "number" ? value : Number(value);
  emit("update:targetMinutes", Number.isFinite(normalized) ? normalized : null);
}
</script>

<template>
  <UCard as="section" class="app-panel app-panel-compact space-y-3" variant="outline">
    <h3 class="app-text font-semibold">{{ t("audio.review_onboarding_title") }}</h3>
    <p class="app-muted app-text-meta">{{ t("audio.review_onboarding_hint") }}</p>

    <UFormField :label="t('audio.review_onboarding_audience')" class="app-text app-text-meta">
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="option in props.audienceOptions"
          :key="option"
          size="sm"
          color="neutral"
          :variant="props.audience === option ? 'ghost' : 'outline'"
          :class="props.audience === option ? 'app-pill-active-neutral font-semibold' : ''"
          @click="emit('selectAudience', option)"
        >
          {{ t(`audio.review_onboarding_audience_${option}`) }}
        </UButton>
      </div>
      <UInput
        v-if="props.audience === 'other'"
        :model-value="props.audienceCustom"
        class="w-full app-text-body text-sm"
        size="sm"
        type="text"
        :placeholder="t('audio.review_onboarding_audience_other')"
        @update:model-value="updateAudienceCustom"
      />
    </UFormField>

    <UFormField :label="t('audio.review_onboarding_goal')" class="app-text app-text-meta">
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="option in props.goalOptions"
          :key="option"
          size="sm"
          color="neutral"
          :variant="props.goal === option ? 'ghost' : 'outline'"
          :class="props.goal === option ? 'app-pill-active-neutral font-semibold' : ''"
          @click="emit('selectGoal', option)"
        >
          {{ t(`audio.review_onboarding_goal_${option}`) }}
        </UButton>
      </div>
    </UFormField>

    <UFormField :label="t('audio.review_onboarding_duration')" class="app-text app-text-meta">
      <UInput
        :model-value="props.targetMinutes ?? ''"
        class="w-32 app-text-body text-sm"
        size="sm"
        type="number"
        min="1"
        max="120"
        @update:model-value="updateTargetMinutes"
      />
    </UFormField>

    <UButton size="sm" color="neutral" variant="outline" @click="emit('skip')">
      {{ t("audio.review_onboarding_skip") }}
    </UButton>
  </UCard>
</template>
