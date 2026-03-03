<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import AppBadge from "@/components/ui/AppBadge.vue";
import AppButton from "@/components/ui/AppButton.vue";
import EntityRow from "@/components/EntityRow.vue";
import PageHeader from "@/components/PageHeader.vue";
import PageShell from "@/components/PageShell.vue";
import SectionPanel from "@/components/SectionPanel.vue";
import { readReviewedFeedbackIds } from "../../../lib/feedbackReviewState";
import { useI18n } from "../../../lib/i18n";
import { useUiPreferences } from "../../../lib/uiPreferences";
import { appStore } from "../../../stores/app";
import type { FeedbackTimelineItem, MascotMessage } from "../../../schemas/ipc";

const { t, locale } = useI18n();
const route = useRoute();
const { settings: uiSettings } = useUiPreferences();
const state = computed(() => appStore.state);
const entries = ref<FeedbackTimelineItem[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const filterType = ref<"all" | "quest_attempt" | "run">("all");
const showUnreadOnly = ref(false);
const scope = ref<"workspace" | "talk">("workspace");
const mascotMessage = ref<MascotMessage | null>(null);
const reviewedIds = ref<Set<string>>(new Set());
let timelineLoadSeq = 0;
const showMascotCard = computed(() => uiSettings.value.mascotEnabled);
const mascotBody = computed(() =>
  uiSettings.value.mascotIntensity === "minimal" ? "" : mascotMessage.value?.body ?? ""
);
const activeProjectId = computed(() => state.value.activeProject?.id ?? null);
const canUseTalkScope = computed(() => Boolean(activeProjectId.value));
const focusedFeedbackId = computed(() => {
  const value = route.query.focus;
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0].trim();
  }
  return "";
});
const sourceContext = computed(() => {
  const value = route.query.source;
  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0].trim().toLowerCase();
  }
  return "";
});
const visibleEntries = computed(() =>
  entries.value.filter((item) => {
    if (filterType.value !== "all" && item.subject_type !== filterType.value) {
      return false;
    }
    if (showUnreadOnly.value && reviewedIds.value.has(item.id)) {
      return false;
    }
    return true;
  })
);
const averageScore = computed(() => {
  if (visibleEntries.value.length === 0) {
    return null;
  }
  const total = visibleEntries.value.reduce((sum, item) => sum + item.overall_score, 0);
  return Math.round(total / visibleEntries.value.length);
});
const notesCount = computed(
  () => visibleEntries.value.filter((item) => Boolean(item.note_updated_at)).length
);
const focusedEntry = computed(
  () => entries.value.find((item) => item.id === focusedFeedbackId.value) ?? null
);
const unreadCount = computed(
  () => entries.value.filter((item) => !reviewedIds.value.has(item.id)).length
);
const focusedEntryPrevious = computed(() => {
  if (!focusedEntry.value) {
    return null;
  }
  const sameTrack = entries.value.filter(
    (item) =>
      item.project_id === focusedEntry.value?.project_id &&
      item.subject_type === focusedEntry.value?.subject_type &&
      item.id !== focusedEntry.value?.id
  );
  return sameTrack[0] ?? null;
});
const focusedDelta = computed(() => {
  if (!focusedEntry.value || !focusedEntryPrevious.value) {
    return null;
  }
  return focusedEntry.value.overall_score - focusedEntryPrevious.value.overall_score;
});
const focusedDeltaLabel = computed(() => {
  if (focusedDelta.value == null) {
    return null;
  }
  if (focusedDelta.value > 0) {
    return `${t("feedback.timeline_focus_delta_up")} +${focusedDelta.value}`;
  }
  if (focusedDelta.value < 0) {
    return `${t("feedback.timeline_focus_delta_down")} ${focusedDelta.value}`;
  }
  return t("feedback.timeline_focus_delta_flat");
});
const focusedActionRoute = computed(() => {
  if (!focusedEntry.value) {
    return "/feedback";
  }
  if (focusedEntry.value.subject_type === "run") {
    return "/boss-run";
  }
  if (focusedEntry.value.quest_code) {
    return `/quest/${focusedEntry.value.quest_code}?projectId=${focusedEntry.value.project_id}&from=training`;
  }
  return "/training";
});
const focusedActionLabel = computed(() =>
  focusedEntry.value?.subject_type === "run"
    ? t("feedback.timeline_focus_action_run")
    : t("feedback.timeline_focus_action_quest")
);

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function scoreToneClass(score: number): "success" | "neutral" | "danger" {
  if (score >= 80) {
    return "success";
  }
  if (score >= 60) {
    return "neutral";
  }
  return "danger";
}

function mascotToneClass(kind: string | null | undefined) {
  if (kind === "celebrate") {
    return "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_15%,var(--color-surface))]";
  }
  if (kind === "nudge") {
    return "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent-soft)_35%,var(--color-surface))]";
  }
  return "border-[var(--color-border)] bg-[var(--color-surface-elevated)]";
}

function feedbackContextLabel(item: FeedbackTimelineItem) {
  if (item.subject_type === "run") {
    return t("feedback.run_label");
  }
  if (item.quest_code) {
    return appStore.formatQuestCode(item.project_id, item.quest_code);
  }
  return t("feedback.quest_code");
}

function feedbackTitle(item: FeedbackTimelineItem) {
  if (item.subject_type === "run") {
    return t("feedback.timeline_run_title");
  }
  return item.quest_title || item.quest_code || t("feedback.quest_code");
}

function isFocused(item: FeedbackTimelineItem) {
  return Boolean(focusedFeedbackId.value) && item.id === focusedFeedbackId.value;
}

function isReviewed(item: FeedbackTimelineItem) {
  return reviewedIds.value.has(item.id);
}

function reviewedBadgeTone(reviewed: boolean): "success" | "neutral" {
  return reviewed ? "neutral" : "success";
}

function applyFocusedContextFilters() {
  if (!focusedFeedbackId.value) {
    return;
  }
  if (sourceContext.value === "quest") {
    filterType.value = "quest_attempt";
  } else if (sourceContext.value === "boss-run") {
    filterType.value = "run";
  } else {
    filterType.value = "all";
  }
}

async function refreshMascotMessage(expectedSeq?: number) {
  if (!showMascotCard.value || !state.value.activeProfileId) {
    if (expectedSeq == null || expectedSeq === timelineLoadSeq) {
      mascotMessage.value = null;
    }
    return;
  }
  try {
    const message = await appStore.getMascotContextMessage({
      routeName: "feedback",
      projectId: scope.value === "talk" ? activeProjectId.value : null,
      locale: locale.value,
    });
    if (expectedSeq != null && expectedSeq !== timelineLoadSeq) {
      return;
    }
    mascotMessage.value = message;
  } catch {
    if (expectedSeq != null && expectedSeq !== timelineLoadSeq) {
      return;
    }
    mascotMessage.value = null;
  }
}

async function loadTimeline() {
  const requestSeq = ++timelineLoadSeq;
  if (!state.value.activeProfileId) {
    entries.value = [];
    error.value = null;
    mascotMessage.value = null;
    reviewedIds.value = new Set();
    return;
  }
  isLoading.value = true;
  error.value = null;
  try {
    const timeline = await appStore.getFeedbackTimeline(
      scope.value === "talk" ? activeProjectId.value : null,
      48
    );
    const reviewed = readReviewedFeedbackIds(state.value.activeProfileId);
    if (requestSeq !== timelineLoadSeq) {
      return;
    }
    entries.value = timeline;
    reviewedIds.value = reviewed;
    await refreshMascotMessage(requestSeq);
  } catch (err) {
    if (requestSeq !== timelineLoadSeq) {
      return;
    }
    entries.value = [];
    error.value = toError(err);
    mascotMessage.value = null;
  } finally {
    if (requestSeq === timelineLoadSeq) {
      isLoading.value = false;
    }
  }
}

onMounted(async () => {
  await appStore.bootstrap();
  await appStore.loadProjects();
  if (focusedFeedbackId.value) {
    applyFocusedContextFilters();
    scope.value = "workspace";
  }
  await loadTimeline();
});

watch(
  () => [state.value.activeProfileId, activeProjectId.value] as const,
  async () => {
    if (!canUseTalkScope.value && scope.value === "talk") {
      scope.value = "workspace";
      return;
    }
    await loadTimeline();
  }
);

watch(
  () => scope.value,
  async () => {
    await loadTimeline();
  }
);

watch(
  () => focusedFeedbackId.value,
  async (next) => {
    if (!next) {
      return;
    }
    applyFocusedContextFilters();
    if (scope.value !== "workspace") {
      scope.value = "workspace";
      return;
    }
    await loadTimeline();
  }
);

watch(
  () => [locale.value, uiSettings.value.mascotEnabled, uiSettings.value.mascotIntensity] as const,
  async () => {
    await refreshMascotMessage();
  }
);
</script>

<template>
  <PageShell>
    <PageHeader
      :eyebrow="t('feedback.title')"
      :title="t('feedback.timeline_title')"
      :subtitle="t('feedback.timeline_subtitle')"
    >
      <template #actions>
        <AppButton size="md" tone="primary" to="/training">
          {{ t("training.start") }}
        </AppButton>
      </template>
    </PageHeader>

    <SectionPanel
      v-if="showMascotCard && mascotMessage"
      variant="compact"
      class="border"
      :class="mascotToneClass(mascotMessage.kind)"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="app-text-eyebrow">{{ t("feedback.mascot_label") }}</div>
          <div class="app-text app-text-subheadline mt-1">{{ mascotMessage.title }}</div>
          <div v-if="mascotBody" class="app-muted app-text-body mt-1">{{ mascotBody }}</div>
        </div>
        <AppButton
          v-if="mascotMessage.cta_route && mascotMessage.cta_label"
          size="md"
          tone="secondary"
          :to="mascotMessage.cta_route"
        >
          {{ mascotMessage.cta_label }}
        </AppButton>
      </div>
    </SectionPanel>

    <SectionPanel v-if="!state.activeProfileId" variant="compact">
      <p class="app-text app-text-body">{{ t("talk.need_profile") }}</p>
      <RouterLink class="app-link app-text-meta mt-2 inline-block underline underline-offset-4" to="/profiles">
        {{ t("talk.goto_profiles") }}
      </RouterLink>
    </SectionPanel>

    <template v-else>
      <SectionPanel v-if="focusedEntry" variant="compact" class="border border-[var(--color-accent)] bg-[var(--color-surface-selected)]">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div class="app-text-eyebrow">{{ t("feedback.timeline_focus_title") }}</div>
            <div class="app-text app-text-subheadline mt-1">{{ feedbackTitle(focusedEntry) }}</div>
            <div class="app-muted app-text-meta mt-1">
              {{ t("feedback.timeline_focus_hint") }} · {{ formatDateTime(focusedEntry.created_at) }}
            </div>
            <div v-if="focusedDeltaLabel" class="app-text app-text-meta mt-1 font-semibold">
              {{ focusedDeltaLabel }}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <AppBadge tone="neutral">
              {{ t("feedback.timeline_focus_badge") }}
            </AppBadge>
            <AppButton size="sm" tone="secondary" :to="focusedActionRoute">
              {{ focusedActionLabel }}
            </AppButton>
            <AppButton size="sm" tone="primary" :to="`/feedback/${focusedEntry.id}`">
              {{ t("feedback.timeline_open") }}
            </AppButton>
          </div>
        </div>
      </SectionPanel>

      <SectionPanel variant="compact">
        <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div class="rounded-xl border border-[var(--app-border)] bg-[var(--color-surface-elevated)] px-3 py-2">
            <div class="app-muted app-text-caption">{{ t("feedback.timeline_total") }}</div>
            <div class="app-text app-text-section-title mt-1">{{ visibleEntries.length }}</div>
          </div>
          <div class="rounded-xl border border-[var(--app-border)] bg-[var(--color-surface-elevated)] px-3 py-2">
            <div class="app-muted app-text-caption">{{ t("feedback.timeline_average") }}</div>
            <div class="app-text app-text-section-title mt-1">
              {{ averageScore == null ? "--" : averageScore }}
            </div>
          </div>
          <div class="rounded-xl border border-[var(--app-border)] bg-[var(--color-surface-elevated)] px-3 py-2">
            <div class="app-muted app-text-caption">{{ t("feedback.timeline_notes") }}</div>
            <div class="app-text app-text-section-title mt-1">{{ notesCount }}</div>
          </div>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <AppButton
            size="sm"
            :tone="scope === 'workspace' ? 'secondary' : 'ghost'"
            @click="scope = 'workspace'"
          >
            {{ t("feedback.timeline_scope_workspace") }}
          </AppButton>
          <AppButton
            size="sm"
            :tone="scope === 'talk' ? 'secondary' : 'ghost'"
            :disabled="!canUseTalkScope"
            @click="scope = 'talk'"
          >
            {{ t("feedback.timeline_scope_talk") }}
          </AppButton>
          <div class="ml-auto flex flex-wrap items-center gap-2">
            <AppButton
              size="sm"
              :tone="filterType === 'all' ? 'secondary' : 'ghost'"
              @click="filterType = 'all'"
            >
              {{ t("feedback.timeline_filter_all") }}
            </AppButton>
            <AppButton
              size="sm"
              :tone="filterType === 'quest_attempt' ? 'secondary' : 'ghost'"
              @click="filterType = 'quest_attempt'"
            >
              {{ t("feedback.timeline_filter_quest") }}
            </AppButton>
            <AppButton
              size="sm"
              :tone="filterType === 'run' ? 'secondary' : 'ghost'"
              @click="filterType = 'run'"
            >
              {{ t("feedback.timeline_filter_run") }}
            </AppButton>
            <AppButton
              size="sm"
              :tone="showUnreadOnly ? 'secondary' : 'ghost'"
              @click="showUnreadOnly = !showUnreadOnly"
            >
              {{ t("feedback.timeline_filter_unread") }} · {{ unreadCount }}
            </AppButton>
          </div>
        </div>
      </SectionPanel>

      <SectionPanel variant="dense-list">
        <div v-if="isLoading" class="app-muted app-text-meta">
          {{ t("feedback.loading") }}
        </div>
        <div v-else-if="error" class="app-danger-text app-text-meta">
          {{ error }}
        </div>
        <div v-else-if="visibleEntries.length === 0" class="app-muted app-text-body">
          {{ t("feedback.timeline_empty") }}
        </div>
        <div v-else class="space-y-3">
          <EntityRow
            v-for="item in visibleEntries"
            :key="item.id"
            :selected="isFocused(item)"
          >
            <template #main>
              <div class="flex flex-wrap items-center gap-2">
                <AppBadge tone="neutral">
                  {{ feedbackContextLabel(item) }}
                </AppBadge>
                <span class="app-muted app-text-meta">{{ formatDateTime(item.created_at) }}</span>
              </div>
              <div class="app-text app-text-body-strong mt-1">{{ feedbackTitle(item) }}</div>
            </template>
            <template #actions>
              <AppBadge :tone="reviewedBadgeTone(isReviewed(item))">
                {{ isReviewed(item) ? t("feedback.reviewed_label") : t("feedback.unread_label") }}
              </AppBadge>
              <AppBadge :tone="scoreToneClass(item.overall_score)">
                {{ t("feedback.score") }}: {{ item.overall_score }}
              </AppBadge>
              <AppBadge
                v-if="item.note_updated_at"
                tone="neutral"
              >
                {{ t("feedback.notes_title") }}
              </AppBadge>
              <RouterLink class="app-link app-text-meta underline" :to="`/feedback/${item.id}`">
                {{ t("feedback.timeline_open") }}
              </RouterLink>
            </template>
          </EntityRow>
        </div>
      </SectionPanel>
    </template>
  </PageShell>
</template>

