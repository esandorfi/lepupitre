<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRouter } from "vue-router";
import EntityRow from "../components/EntityRow.vue";
import PageHeader from "../components/PageHeader.vue";
import PageShell from "../components/PageShell.vue";
import SectionPanel from "../components/SectionPanel.vue";
import { useI18n } from "../lib/i18n";
import { useUiPreferences } from "../lib/uiPreferences";
import { appStore } from "../stores/app";
import type { MascotMessage } from "../schemas/ipc";

const { t, locale } = useI18n();
const { settings: uiSettings } = useUiPreferences();
const state = computed(() => appStore.state);
const error = ref<string | null>(null);
const isLoading = ref(false);
const isSwitching = ref<string | null>(null);
const mascotMessage = ref<MascotMessage | null>(null);
const router = useRouter();
const showMascotCard = computed(() => uiSettings.value.mascotEnabled);
const mascotBody = computed(() =>
  uiSettings.value.mascotIntensity === "minimal" ? "" : mascotMessage.value?.body ?? ""
);

function mascotToneClass(kind: string | null | undefined) {
  if (kind === "celebrate") {
    return "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_15%,var(--color-surface))]";
  }
  if (kind === "nudge") {
    return "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent-soft)_35%,var(--color-surface))]";
  }
  return "border-[var(--color-border)] bg-[var(--color-surface-elevated)]";
}

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) {
    return "--";
  }
  return Math.round(seconds / 60).toString();
}

function formatLastActivity(value: string | null | undefined) {
  if (!value) {
    return t("talks.last_activity_unknown");
  }
  const date = new Date(value);
  const now = Date.now();
  const time = date.getTime();
  if (Number.isNaN(time)) {
    return t("talks.last_activity_unknown");
  }
  const diffMs = Math.max(0, now - time);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) {
    return t("talks.last_activity_just_now");
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d`;
  }
  return date.toLocaleDateString();
}

function talkNumberLabel(number: number | null | undefined) {
  if (!number) {
    return null;
  }
  return `T${number}`;
}

function normalizedStage(stage: string | null | undefined) {
  if (stage === "builder" || stage === "train" || stage === "export") {
    return stage;
  }
  return "draft";
}

function talkStageLabel(stage: string | null | undefined) {
  const key = normalizedStage(stage);
  if (key === "draft") {
    return t("talk_steps.define");
  }
  if (key === "builder") {
    return t("talk_steps.builder");
  }
  if (key === "train") {
    return t("talk_steps.train");
  }
  return t("talk_steps.export");
}

async function bootstrap() {
  isLoading.value = true;
  error.value = null;
  try {
    await appStore.bootstrap();
    await appStore.loadProjects();
    await refreshMascotMessage();
  } catch (err) {
    error.value = toError(err);
  } finally {
    isLoading.value = false;
  }
}

async function refreshMascotMessage() {
  if (!showMascotCard.value || !state.value.activeProfileId) {
    mascotMessage.value = null;
    return;
  }
  try {
    mascotMessage.value = await appStore.getMascotContextMessage({
      routeName: "talks",
      projectId: state.value.activeProject?.id ?? null,
      locale: locale.value,
    });
  } catch {
    mascotMessage.value = null;
  }
}

async function setActive(projectId: string) {
  isSwitching.value = projectId;
  error.value = null;
  try {
    await appStore.setActiveProject(projectId);
  } catch (err) {
    error.value = toError(err);
  } finally {
    isSwitching.value = null;
  }
}

function goToReport(projectId: string) {
  router.push(`/talks/${projectId}/define`);
}

onMounted(bootstrap);

watch(
  () => [locale.value, uiSettings.value.mascotEnabled, uiSettings.value.mascotIntensity] as const,
  async () => {
    await refreshMascotMessage();
  }
);
</script>

<template>
  <PageShell>
    <PageHeader :eyebrow="t('talks.title')" :title="t('talks.title')" :subtitle="t('talks.subtitle')">
      <template #actions>
        <RouterLink
          class="app-button-primary app-focus-ring app-button-md inline-flex items-center"
          to="/project/new"
        >
          {{ t("talks.create") }}
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
          <div class="app-text-eyebrow">{{ t("talks.mascot_label") }}</div>
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

    <SectionPanel v-else variant="dense-list">
      <div v-if="isLoading" class="app-muted app-text-meta">
        {{ t("talks.loading") }}
      </div>
      <div v-else-if="error" class="app-danger-text app-text-meta">
        {{ error }}
      </div>
      <div v-else-if="state.projects.length === 0" class="app-muted app-text-body">
        {{ t("talks.empty") }}
      </div>
      <div v-else class="space-y-3">
        <EntityRow
          v-for="project in state.projects"
          :key="project.id"
          interactive
          role="button"
          tabindex="0"
          @click="goToReport(project.id)"
          @keydown.enter.prevent="goToReport(project.id)"
          @keydown.space.prevent="goToReport(project.id)"
        >
          <template #main>
            <div class="flex flex-wrap items-center gap-2">
              <span
                v-if="talkNumberLabel(project.talk_number)"
                class="app-pill app-text-caption inline-flex items-center rounded-full px-2 py-1 font-semibold"
              >
                {{ talkNumberLabel(project.talk_number) }}
              </span>
              <span class="app-badge-neutral app-text-caption inline-flex items-center rounded-full px-2 py-1 font-semibold">
                {{ talkStageLabel(project.stage) }}
              </span>
              <div class="app-text app-text-body-strong">{{ project.title }}</div>
            </div>
            <div class="app-subtle app-text-meta mt-1">
              {{ t("talks.duration") }}: {{ formatDuration(project.duration_target_sec) }}
              {{ t("talks.minutes") }} ·
              {{ t("talks.last_activity") }}: {{ formatLastActivity(project.updated_at) }}
            </div>
          </template>

          <template #actions>
            <button
              class="app-button-secondary app-focus-ring app-icon-button-md inline-flex items-center justify-center"
              type="button"
              :aria-label="t('talks.view_report')"
              :title="t('talks.view_report')"
              @click.stop="goToReport(project.id)"
            >
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            <span
              v-if="project.is_active"
              class="app-pill app-pill-active app-text-meta inline-flex items-center rounded-full px-3 py-1 font-semibold"
            >
              {{ t("talks.active") }}
            </span>
            <button
              v-else
              class="app-button-secondary app-focus-ring app-button-sm inline-flex items-center disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              :disabled="isSwitching === project.id"
              @click.stop="setActive(project.id)"
            >
              {{ t("talks.set_active") }}
            </button>
          </template>
        </EntityRow>
      </div>
    </SectionPanel>
  </PageShell>
</template>
