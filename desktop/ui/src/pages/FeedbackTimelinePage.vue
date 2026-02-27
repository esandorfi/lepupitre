<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import EntityRow from "../components/EntityRow.vue";
import PageHeader from "../components/PageHeader.vue";
import PageShell from "../components/PageShell.vue";
import SectionPanel from "../components/SectionPanel.vue";
import { useI18n } from "../lib/i18n";
import { useUiPreferences } from "../lib/uiPreferences";
import { appStore } from "../stores/app";
import type { FeedbackTimelineItem, MascotMessage } from "../schemas/ipc";

const { t, locale } = useI18n();
const { settings: uiSettings } = useUiPreferences();
const state = computed(() => appStore.state);
const entries = ref<FeedbackTimelineItem[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const filterType = ref<"all" | "quest_attempt" | "run">("all");
const scope = ref<"workspace" | "talk">("workspace");
const mascotMessage = ref<MascotMessage | null>(null);
const showMascotCard = computed(() => uiSettings.value.mascotEnabled);
const mascotBody = computed(() =>
  uiSettings.value.mascotIntensity === "minimal" ? "" : mascotMessage.value?.body ?? ""
);
const activeProjectId = computed(() => state.value.activeProject?.id ?? null);
const canUseTalkScope = computed(() => Boolean(activeProjectId.value));
const visibleEntries = computed(() =>
  entries.value.filter((item) => {
    if (filterType.value === "all") {
      return true;
    }
    return item.subject_type === filterType.value;
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
    return;
  }
  isLoading.value = true;
  error.value = null;
  try {
    entries.value = await appStore.getFeedbackTimeline(
      scope.value === "talk" ? activeProjectId.value : null,
      48
    );
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
          <EntityRow v-for="item in visibleEntries" :key="item.id">
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
