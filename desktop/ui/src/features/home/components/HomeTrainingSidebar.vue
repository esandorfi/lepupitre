<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "@/lib/i18n";
import {
  useHomePresentation,
  type QuestMapNode,
  type RewardBadge,
} from "@/features/home/composables/useHomePresentation";
import type { ProgressSnapshot, QuestAttemptSummary } from "@/schemas/ipc";

const props = defineProps<{
  isTrainingLoading: boolean;
  trainingProgress: ProgressSnapshot | null;
  showCredits: boolean;
  showQuestMap: boolean;
  isQuestWorldMode: boolean;
  weeklyProgressPercent: number;
  creditsToMilestone: number;
  questMapNodes: QuestMapNode[];
  questMapHint: string;
  rewardBadges: RewardBadge[];
  unlockedRewardCount: number;
  nextRewardBadge: RewardBadge | null;
  feedbackAttempts: QuestAttemptSummary[];
  recentAttempts: QuestAttemptSummary[];
  trainingProjectId: string | null;
  questCodeLabel: (code: string) => string;
}>();

const emit = defineEmits<{
  (event: "focusQuestMapNode", node: QuestMapNode): void;
}>();

const { t } = useI18n();
const { attemptStatus, formatDate, outputLabel, questMapConnectorClass, questMapNodeAriaLabel, questMapNodeClass, rewardBadgeClass } =
  useHomePresentation(t);

const trainingActivityTab = ref<"feedback" | "history">("feedback");
</script>

<template>
  <UCard class="app-panel xl:sticky xl:top-4" variant="outline">
    <div
      class="rounded-xl border border-[var(--app-border)] p-3"
      :class="props.isQuestWorldMode ? 'bg-[color-mix(in_srgb,var(--color-accent-soft)_30%,var(--color-surface))]' : ''"
    >
      <div class="app-text-eyebrow">{{ t("training.progress_title") }}</div>
      <div v-if="props.isTrainingLoading" class="app-muted app-text-meta mt-2">
        {{ t("talks.loading") }}
      </div>
      <div v-else-if="props.trainingProgress" class="mt-2 space-y-2">
        <div class="grid gap-2" :class="props.showCredits ? 'sm:grid-cols-2' : 'sm:grid-cols-1'">
          <div class="rounded-lg border border-[var(--app-border)] bg-[var(--color-surface-elevated)] px-3 py-2">
            <div class="app-muted app-text-caption">{{ t("training.progress_streak") }}</div>
            <div class="app-text app-text-section-title mt-1">
              {{ props.trainingProgress.streak_days }}
            </div>
          </div>
          <div
            v-if="props.showCredits"
            class="rounded-lg border border-[var(--app-border)] bg-[var(--color-surface-elevated)] px-3 py-2"
          >
            <div class="app-muted app-text-caption">{{ t("training.progress_credits") }}</div>
            <div class="app-text app-text-section-title mt-1">
              {{ props.trainingProgress.credits }}
            </div>
          </div>
        </div>
        <div>
          <div class="flex items-center justify-between gap-2 app-text-meta">
            <span class="app-muted">{{ t("training.progress_weekly") }}</span>
            <span class="app-text">
              {{ props.trainingProgress.weekly_completed }} / {{ props.trainingProgress.weekly_target }}
            </span>
          </div>
          <div class="mt-1 h-2 overflow-hidden rounded-full app-meter-bg">
            <div
              class="h-full rounded-full bg-[var(--color-accent)] transition-all"
              :style="{ width: `${props.weeklyProgressPercent}%` }"
            ></div>
          </div>
        </div>
        <div v-if="props.showCredits" class="app-muted app-text-meta">
          {{ t("training.progress_next") }}: {{ props.trainingProgress.next_milestone }}
          ({{ props.creditsToMilestone }} {{ t("training.progress_to_next") }})
        </div>

        <div
          v-if="props.showQuestMap && props.questMapNodes.length > 0"
          class="rounded-xl border border-[var(--app-border)] p-3"
          :class="props.isQuestWorldMode ? 'bg-[color-mix(in_srgb,var(--color-accent-soft)_20%,var(--color-surface))]' : 'bg-[var(--color-surface-elevated)]'"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="app-text-eyebrow">{{ t("training.quest_map_title") }}</div>
            <UBadge color="neutral" variant="solid">
              {{ props.trainingProgress.weekly_completed }} / {{ props.trainingProgress.weekly_target }}
            </UBadge>
          </div>
          <div class="mt-3 overflow-x-auto pb-1">
            <div class="flex min-w-[440px] items-start gap-2 pr-1">
              <template v-for="(node, index) in props.questMapNodes" :key="node.id">
                <div class="flex items-start gap-2">
                  <UButton
                    class="min-h-0 w-[76px] flex-col items-center text-center transition !px-0 !py-0"
                    :style="{ marginTop: `${node.offsetPx}px` }"
                    size="sm"
                    :aria-label="questMapNodeAriaLabel(node)"
                    color="neutral"
                    variant="ghost"
                    @click="emit('focusQuestMapNode', node)"
                  >
                    <div
                      class="flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition"
                      :class="questMapNodeClass(node)"
                    >
                      {{ index + 1 }}
                    </div>
                    <div class="app-text app-text-caption mt-1 leading-tight">
                      {{ node.label }}
                    </div>
                    <div class="app-muted app-text-meta mt-1">
                      +{{ node.reward }} {{ t("training.progress_credits") }}
                    </div>
                    <UBadge class="mt-1 py-0.5" color="neutral" variant="solid">
                      {{ node.category ?? t("training.quest_map_any_category") }}
                    </UBadge>
                  </UButton>
                  <div
                    v-if="index < props.questMapNodes.length - 1"
                    class="mt-4 h-[2px] w-8 rounded-full transition"
                    :class="questMapConnectorClass(node.done)"
                  ></div>
                </div>
              </template>
            </div>
          </div>
          <div class="app-muted app-text-meta mt-2">
            {{ props.questMapHint }}
          </div>
        </div>

        <div
          v-if="props.showCredits && props.rewardBadges.length > 0"
          class="rounded-xl border border-[var(--app-border)] bg-[var(--color-surface-elevated)] p-3"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="app-text-eyebrow">{{ t("training.rewards_title") }}</div>
            <UBadge color="neutral" variant="solid">
              {{ props.unlockedRewardCount }} / {{ props.rewardBadges.length }} {{ t("training.rewards_unlocked") }}
            </UBadge>
          </div>
          <div class="mt-3 grid gap-2 sm:grid-cols-2">
            <div
              v-for="badge in props.rewardBadges"
              :key="badge.id"
              class="rounded-lg border px-3 py-2"
              :class="rewardBadgeClass(badge.unlocked, props.nextRewardBadge?.id === badge.id)"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="app-text app-text-body-strong text-sm">{{ badge.title }}</div>
                <UBadge
                  class="py-0.5"
                  :color="badge.unlocked ? 'success' : 'neutral'"
                  variant="solid"
                >
                  {{ badge.unlocked ? t("training.rewards_status_unlocked") : t("training.rewards_status_locked") }}
                </UBadge>
              </div>
              <div class="app-muted app-text-meta mt-1">
                {{ Math.min(badge.current, badge.target) }} / {{ badge.target }}
              </div>
            </div>
          </div>
          <div v-if="props.nextRewardBadge" class="app-muted app-text-meta mt-2">
            {{ t("training.rewards_next") }}: {{ props.nextRewardBadge.title }}
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="app-text-eyebrow">
        {{ t("training.history_title") }}
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          size="sm"
          color="neutral"
          :variant="trainingActivityTab === 'feedback' ? 'outline' : 'ghost'"
          @click="trainingActivityTab = 'feedback'"
        >
          {{ t("training.feedback_title") }} · {{ props.feedbackAttempts.length }}
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          :variant="trainingActivityTab === 'history' ? 'outline' : 'ghost'"
          @click="trainingActivityTab = 'history'"
        >
          {{ t("training.history_title") }} · {{ props.recentAttempts.length }}
        </UButton>
      </div>
    </div>

    <div v-if="props.isTrainingLoading" class="app-muted app-text-body mt-3">
      {{ t("talks.loading") }}
    </div>

    <template v-else-if="trainingActivityTab === 'feedback'">
      <div v-if="props.feedbackAttempts.length === 0" class="app-muted app-text-body mt-3">
        {{ t("training.feedback_empty") }}
      </div>
      <div v-else class="mt-3 space-y-3">
        <div class="space-y-2 app-text-meta">
          <div
            v-for="attempt in props.feedbackAttempts"
            :key="attempt.id"
            class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--app-border)] px-3 py-2"
          >
            <div>
              <div class="app-text text-sm">{{ attempt.quest_title }}</div>
              <div class="app-muted app-text-meta">
                {{ formatDate(attempt.created_at) }} · {{ outputLabel(attempt.output_type) }} ·
                {{ props.questCodeLabel(attempt.quest_code) }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <UBadge color="success" variant="solid">
                {{ t("training.feedback_ready") }}
              </UBadge>
              <RouterLink
                v-if="attempt.feedback_id"
                class="app-link app-text-meta underline"
                :to="`/feedback/${attempt.feedback_id}`"
              >
                {{ t("home.quest_followup_feedback") }}
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div v-if="props.recentAttempts.length === 0" class="app-muted app-text-body mt-3">
        {{ t("training.history_empty") }}
      </div>
      <div v-else class="mt-3 space-y-2 app-text-meta">
        <div
          v-for="attempt in props.recentAttempts"
          :key="attempt.id"
          class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--app-border)] px-3 py-2"
        >
          <div>
            <div class="app-text text-sm">{{ attempt.quest_title }}</div>
            <div class="app-muted app-text-meta">
              {{ formatDate(attempt.created_at) }} · {{ attemptStatus(attempt) }} ·
              {{ props.questCodeLabel(attempt.quest_code) }}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <RouterLink
              class="app-link app-text-meta underline"
              :to="`/quest/${attempt.quest_code}?projectId=${props.trainingProjectId}&from=training`"
            >
              {{ t("home.quest_followup_replay") }}
            </RouterLink>
            <RouterLink
              v-if="attempt.feedback_id"
              class="app-link app-text-meta underline"
              :to="`/feedback/${attempt.feedback_id}`"
            >
              {{ t("home.quest_followup_feedback") }}
            </RouterLink>
          </div>
        </div>
      </div>
    </template>
  </UCard>
</template>
