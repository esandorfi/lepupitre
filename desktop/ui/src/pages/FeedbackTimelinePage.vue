<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import EntityRow from "../components/EntityRow.vue";
import PageHeader from "../components/PageHeader.vue";
import PageShell from "../components/PageShell.vue";
import SectionPanel from "../components/SectionPanel.vue";
import { readReviewedFeedbackIds } from "../lib/feedbackReviewState";
import { useI18n } from "../lib/i18n";
import { useUiPreferences } from "../lib/uiPreferences";
import { appStore } from "../stores/app";
import type { FeedbackTimelineItem, MascotMessage } from "../schemas/ipc";

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

function scoreToneClass(score: number) {
  if (score >= 80) {
    return "app-badge-success";
  }
  if (score >= 60) {
    return "app-badge-neutral";
  }
  return "app-badge-danger";
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

function reviewedBadgeClass(reviewed: boolean) {
  return reviewed ? "app-badge-neutral" : "app-badge-success";
}

async function refreshMascotMessage() {
  if (!showMascotCard.value || !state.value.activeProfileId) {
    mascotMessage.value = null;
    return;
  }
  try {
    mascotMessage.value = await appStore.getMascotContextMessage({
      routeName: "feedback",
      projectId: scope.value === "talk" ? activeProjectId.value : null,
      locale: locale.value,
    });
  } catch {
    mascotMessage.value = null;
  }
}

async function loadTimeline() {
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
    entries.value = await appStore.getFeedbackTimeline(
      scope.value === "talk" ? activeProjectId.value : null,
      48
    );
    reviewedIds.value = readReviewedFeedbackIds(state.value.activeProfileId);
    await refreshMascotMessage();
  } catch (err) {
    entries.value = [];
    error.value = toError(err);
    mascotMessage.value = null;
  } finally {
    isLoading.value = false;
  }
}

onMounted(async () => {
  await appStore.bootstrap();
  await appStore.loadProjects();
  if (focusedFeedbackId.value) {
    if (sourceContext.value === "quest") {
      filterType.value = "quest_attempt";
    } else if (sourceContext.value === "boss-run") {
      filterType.value = "run";
    } else {
      filterType.value = "all";
    }
    scope.value = "workspace";
  }
  await loadTimeline();
});

watch(
  () => [state.value.activeProfileId, activeProjectId.value] as const,
  async () => {
    if (!canUseTalkScope.value && scope.value === "talk") {
      scope.value = "workspace";
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
    if (sourceContext.value === "quest") {
      filterType.value = "quest_attempt";
    } else if (sourceContext.value === "boss-run") {
      filterType.value = "run";
    } else {
      filterType.value = "all";
    }
    scope.value = "workspace";
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
        <RouterLink class="app-button-primary app-focus-ring app-button-md inline-flex items-center" to="/training">
          {{ t("training.start") }}
        </RouterLink>
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
        <RouterLink
          v-if="mascotMessage.cta_route && mascotMessage.cta_label"
          class="app-button-secondary app-focus-ring app-button-md inline-flex items-center"
          :to="mascotMessage.cta_route"
        >
          {{ mascotMessage.cta_label }}
        </RouterLink>
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
            <span class="app-badge-neutral app-text-caption rounded-full px-2 py-1 font-semibold">
              {{ t("feedback.timeline_focus_badge") }}
            </span>
            <RouterLink class="app-button-secondary app-focus-ring app-button-sm inline-flex items-center" :to="focusedActionRoute">
              {{ focusedActionLabel }}
            </RouterLink>
            <RouterLink class="app-button-primary app-focus-ring app-button-sm inline-flex items-center" :to="`/feedback/${focusedEntry.id}`">
              {{ t("feedback.timeline_open") }}
            </RouterLink>
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
          <button
            class="app-focus-ring app-button-sm inline-flex items-center transition"
            :class="scope === 'workspace' ? 'app-button-secondary' : 'app-button-ghost'"
            type="button"
            @click="scope = 'workspace'"
          >
            {{ t("feedback.timeline_scope_workspace") }}
          </button>
          <button
            class="app-focus-ring app-button-sm inline-flex items-center transition disabled:cursor-not-allowed disabled:opacity-60"
            :class="scope === 'talk' ? 'app-button-secondary' : 'app-button-ghost'"
            type="button"
            :disabled="!canUseTalkScope"
            @click="scope = 'talk'"
          >
            {{ t("feedback.timeline_scope_talk") }}
          </button>
          <div class="ml-auto flex flex-wrap items-center gap-2">
            <button
              class="app-focus-ring app-button-sm inline-flex items-center transition"
              :class="filterType === 'all' ? 'app-button-secondary' : 'app-button-ghost'"
              type="button"
              @click="filterType = 'all'"
            >
              {{ t("feedback.timeline_filter_all") }}
            </button>
            <button
              class="app-focus-ring app-button-sm inline-flex items-center transition"
              :class="filterType === 'quest_attempt' ? 'app-button-secondary' : 'app-button-ghost'"
              type="button"
              @click="filterType = 'quest_attempt'"
            >
              {{ t("feedback.timeline_filter_quest") }}
            </button>
            <button
              class="app-focus-ring app-button-sm inline-flex items-center transition"
              :class="filterType === 'run' ? 'app-button-secondary' : 'app-button-ghost'"
              type="button"
              @click="filterType = 'run'"
            >
              {{ t("feedback.timeline_filter_run") }}
            </button>
            <button
              class="app-focus-ring app-button-sm inline-flex items-center transition"
              :class="showUnreadOnly ? 'app-button-secondary' : 'app-button-ghost'"
              type="button"
              @click="showUnreadOnly = !showUnreadOnly"
            >
              {{ t("feedback.timeline_filter_unread") }} · {{ unreadCount }}
            </button>
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
                <span class="app-badge-neutral app-text-caption inline-flex items-center rounded-full px-2 py-1 font-semibold">
                  {{ feedbackContextLabel(item) }}
                </span>
                <span class="app-muted app-text-meta">{{ formatDateTime(item.created_at) }}</span>
              </div>
              <div class="app-text app-text-body-strong mt-1">{{ feedbackTitle(item) }}</div>
            </template>
            <template #actions>
              <span
                class="app-text-caption inline-flex items-center rounded-full px-2 py-1 font-semibold"
                :class="reviewedBadgeClass(isReviewed(item))"
              >
                {{ isReviewed(item) ? t("feedback.reviewed_label") : t("feedback.unread_label") }}
              </span>
              <span
                class="app-text-caption inline-flex items-center rounded-full px-2 py-1 font-semibold"
                :class="scoreToneClass(item.overall_score)"
              >
                {{ t("feedback.score") }}: {{ item.overall_score }}
              </span>
              <span
                v-if="item.note_updated_at"
                class="app-badge-neutral app-text-caption inline-flex items-center rounded-full px-2 py-1 font-semibold"
              >
                {{ t("feedback.notes_title") }}
              </span>
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
