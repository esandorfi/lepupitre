<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useI18n } from "@/lib/i18n";
import { useHomePresentation, type DailyLoopStep } from "@/features/home/composables/useHomePresentation";
import type { AchievementPulse } from "@/features/home/composables/useAchievementPulse";
import type {
  MascotMessage,
  ProgressSnapshot,
  Quest,
  QuestDaily,
} from "@/schemas/ipc";

const props = defineProps<{
  trainingError: string | null;
  isTrainingLoading: boolean;
  heroQuest: Quest | null;
  heroQuestIsOverride: boolean;
  trainingDailyQuest: QuestDaily | null;
  heroQuestRoute: string;
  achievementPulse: AchievementPulse | null;
  showMascotCard: boolean;
  mascotMessage: MascotMessage | null;
  mascotBody: string;
  trainingProgress: ProgressSnapshot | null;
  dailyLoopSteps: DailyLoopStep[];
  dailyLoopCompletedCount: number;
  dailyLoopIsComplete: boolean;
}>();

const emit = defineEmits<{
  (event: "resetHeroQuestToDaily"): void;
  (event: "dismissAchievement"): void;
}>();

const { t } = useI18n();
const { estimatedMinutesLabel, outputLabel, dailyLoopStepClass, mascotToneClass } =
  useHomePresentation(t);
</script>

<template>
  <UCard class="app-panel app-panel-hero" variant="outline">
    <div class="app-text-eyebrow">{{ t("training.hero_label") }}</div>
    <div v-if="props.trainingError" class="app-danger-text app-text-meta mt-2">
      {{ props.trainingError }}
    </div>
    <div v-else-if="props.isTrainingLoading" class="app-muted app-text-body mt-2">
      {{ t("talks.loading") }}
    </div>
    <div v-else-if="props.heroQuest" class="mt-2 space-y-2">
      <div class="flex flex-wrap items-center gap-2">
        <UBadge color="neutral" variant="solid">
          {{ props.heroQuestIsOverride ? t("training.hero_selected_badge") : t("training.hero_daily_badge") }}
        </UBadge>
        <UButton
          v-if="props.heroQuestIsOverride && props.trainingDailyQuest"
          class="app-link app-text-meta underline !px-0 !py-0 !font-normal"
          size="sm"
          color="neutral"
          variant="ghost"
          @click="emit('resetHeroQuestToDaily')"
        >
          {{ t("training.use_daily_quest") }}
        </UButton>
      </div>
      <div class="app-text app-text-page-title">{{ props.heroQuest.title }}</div>
      <div class="app-muted app-text-body">{{ props.heroQuest.prompt }}</div>
      <div class="flex flex-wrap items-center gap-2 app-text-meta">
        <UBadge color="neutral" variant="solid">
          {{ outputLabel(props.heroQuest.output_type) }}
        </UBadge>
        <UBadge color="neutral" variant="solid">
          {{ props.heroQuest.category }}
        </UBadge>
        <UBadge color="neutral" variant="solid">
          {{ estimatedMinutesLabel(props.heroQuest.estimated_sec) }} {{ t("talks.minutes") }}
        </UBadge>
      </div>
      <div class="pt-1">
        <UButton size="lg" :to="props.heroQuestRoute" color="primary">
          {{ t("training.start") }}
        </UButton>
      </div>
    </div>
    <div v-else class="app-muted app-text-body mt-2">
      {{ t("home.quest_empty") }}
    </div>
  </UCard>

  <UCard
    v-if="props.achievementPulse && !props.trainingError"
    class="app-panel app-panel-compact border border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_12%,var(--color-surface))]"
    variant="outline"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="app-text-eyebrow">{{ t("training.achievement_title") }}</div>
        <div class="app-text app-text-subheadline mt-1">{{ props.achievementPulse.title }}</div>
        <div class="app-muted app-text-body mt-1">{{ props.achievementPulse.body }}</div>
      </div>
      <div class="flex items-center gap-2">
        <UButton size="sm" :to="props.achievementPulse.ctaRoute" color="neutral" variant="outline">
          {{ props.achievementPulse.ctaLabel }}
        </UButton>
        <UButton size="sm" color="neutral" variant="ghost" @click="emit('dismissAchievement')">
          {{ t("training.achievement_dismiss") }}
        </UButton>
      </div>
    </div>
  </UCard>

  <UCard
    v-if="props.showMascotCard && props.mascotMessage && !props.trainingError"
    class="app-panel app-panel-compact border"
    :class="mascotToneClass(props.mascotMessage.kind)"
    variant="outline"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="app-text-eyebrow">{{ t("training.mascot_label") }}</div>
        <div class="app-text app-text-subheadline mt-1">{{ props.mascotMessage.title }}</div>
        <div v-if="props.mascotBody" class="app-muted app-text-body mt-1">
          {{ props.mascotBody }}
        </div>
      </div>
      <UButton
        v-if="props.mascotMessage.cta_route && props.mascotMessage.cta_label"
        size="md"
        :to="props.mascotMessage.cta_route"
        color="neutral"
        variant="outline"
      >
        {{ props.mascotMessage.cta_label }}
      </UButton>
    </div>
  </UCard>

  <UCard
    v-if="props.trainingProgress"
    class="app-panel app-panel-compact border"
    :class="props.dailyLoopIsComplete ? 'border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_10%,var(--color-surface))]' : ''"
    variant="outline"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <div class="app-text-eyebrow">{{ t("training.daily_loop_title") }}</div>
        <div class="app-muted app-text-meta mt-1">{{ t("training.daily_loop_subtitle") }}</div>
      </div>
      <UBadge color="neutral" variant="solid">
        {{ props.dailyLoopCompletedCount }} / {{ props.dailyLoopSteps.length }}
      </UBadge>
    </div>
    <div class="mt-3 space-y-2">
      <div
        v-for="step in props.dailyLoopSteps"
        :key="step.id"
        class="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
        :class="dailyLoopStepClass(step.done)"
      >
        <div class="app-text app-text-body-strong text-sm">{{ step.title }}</div>
        <div class="flex items-center gap-2">
          <UBadge :color="step.done ? 'success' : 'neutral'" class="py-0.5" variant="solid">
            {{ step.done ? t("training.daily_loop_done") : t("training.daily_loop_pending") }}
          </UBadge>
          <RouterLink
            v-if="!step.done"
            class="app-link app-text-meta underline"
            :to="step.ctaRoute"
          >
            {{ t("training.daily_loop_open") }}
          </RouterLink>
        </div>
      </div>
    </div>
    <div class="app-muted app-text-meta mt-2">
      {{ props.dailyLoopIsComplete ? t("training.daily_loop_hint_complete") : t("training.daily_loop_hint_pending") }}
    </div>
  </UCard>
</template>
