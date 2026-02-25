<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";

const { t } = useI18n();
const state = computed(() => appStore.state);
const error = ref<string | null>(null);
const isLoading = ref(false);
const isSwitching = ref<string | null>(null);
const router = useRouter();

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
  } catch (err) {
    error.value = toError(err);
  } finally {
    isLoading.value = false;
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
</script>

<template>
  <section class="space-y-6">
    <p class="app-muted text-sm font-semibold">{{ t("talks.subtitle") }}</p>

    <div v-if="!state.activeProfileId" class="app-surface rounded-2xl border p-4">
      <p class="app-text text-sm">{{ t("talk.need_profile") }}</p>
      <RouterLink class="app-link text-xs underline underline-offset-4" to="/profiles">
        {{ t("talk.goto_profiles") }}
      </RouterLink>
    </div>

    <div v-else class="app-surface rounded-2xl border p-4">
      <div class="flex items-center justify-between">
        <div class="app-subtle text-xs uppercase tracking-[0.2em]">
          {{ t("talks.title") }}
        </div>
        <RouterLink
          class="app-button-primary inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold"
          to="/project/new"
        >
          {{ t("talks.create") }}
        </RouterLink>
      </div>

      <div v-if="isLoading" class="app-muted mt-3 text-xs">
        {{ t("talks.loading") }}
      </div>
      <div v-else-if="error" class="app-danger-text mt-3 text-xs">
        {{ error }}
      </div>
      <div v-else-if="state.projects.length === 0" class="app-muted mt-3 text-sm">
        {{ t("talks.empty") }}
      </div>
      <div v-else class="mt-3 space-y-3">
        <div
          v-for="project in state.projects"
          :key="project.id"
          class="app-card cursor-pointer rounded-xl border p-3 transition hover:border-[var(--app-accent)]"
          role="button"
          tabindex="0"
          @click="goToReport(project.id)"
          @keydown.enter.prevent="goToReport(project.id)"
          @keydown.space.prevent="goToReport(project.id)"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <span
                  v-if="talkNumberLabel(project.talk_number)"
                  class="app-pill rounded-full px-2 py-0.5 text-[10px] font-semibold"
                >
                  {{ talkNumberLabel(project.talk_number) }}
                </span>
                <span class="app-badge-neutral rounded-full px-2 py-0.5 text-[10px] font-semibold">
                  {{ talkStageLabel(project.stage) }}
                </span>
                <div class="app-text text-sm font-semibold">{{ project.title }}</div>
              </div>
              <div class="app-subtle mt-1 text-[11px]">
                {{ t("talks.duration") }}: {{ formatDuration(project.duration_target_sec) }}
                {{ t("talks.minutes") }} ·
                {{ t("talks.last_activity") }}: {{ formatLastActivity(project.updated_at) }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="app-button-secondary inline-flex h-8 w-8 items-center justify-center rounded-full"
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
                class="app-pill app-pill-active rounded-full px-3 py-1 text-[11px] font-semibold"
              >
                {{ t("talks.active") }}
              </span>
              <button
                v-if="!project.is_active"
                class="app-button-secondary cursor-pointer rounded-full px-3 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                :disabled="isSwitching === project.id"
                @click.stop="setActive(project.id)"
              >
                {{ t("talks.set_active") }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
