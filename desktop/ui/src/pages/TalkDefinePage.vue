<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import TalkStepTabs from "../components/TalkStepTabs.vue";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";

const { t } = useI18n();
const route = useRoute();

const error = ref<string | null>(null);
const isLoading = ref(false);

const projectId = computed(() => String(route.params.projectId || ""));
const activeProfileId = computed(() => appStore.state.activeProfileId);
const project = computed(() =>
  appStore.state.projects.find((item) => item.id === projectId.value) ?? null
);

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function minutesLabel(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) {
    return t("talk_define.duration_missing");
  }
  return `${Math.round(seconds / 60)} ${t("talks.minutes")}`;
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

onMounted(bootstrap);
</script>

<template>
  <section class="space-y-4">
    <TalkStepTabs v-if="projectId" :project-id="projectId" active="define" />

    <div class="app-surface rounded-2xl border p-4">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">{{ t("talk_define.title") }}</div>
      <div class="app-text mt-2 text-sm">{{ t("talk_define.subtitle") }}</div>
    </div>

    <div v-if="!activeProfileId" class="app-surface rounded-2xl border p-4">
      <p class="app-muted text-sm">{{ t("talk.need_profile") }}</p>
      <RouterLink class="app-link mt-3 inline-block text-xs underline" to="/profiles">
        {{ t("talk.goto_profiles") }}
      </RouterLink>
    </div>

    <div v-else-if="isLoading" class="app-surface rounded-2xl border p-4">
      <p class="app-muted text-sm">{{ t("talks.loading") }}</p>
    </div>

    <div v-else-if="error" class="app-surface rounded-2xl border p-4">
      <p class="app-danger-text text-sm">{{ error }}</p>
    </div>

    <div v-else-if="!project" class="app-surface rounded-2xl border p-4">
      <p class="app-muted text-sm">{{ t("talk_define.missing") }}</p>
      <RouterLink class="app-link mt-3 inline-block text-xs underline" to="/talks">
        {{ t("talk_report.back") }}
      </RouterLink>
    </div>

    <div v-else class="space-y-4">
      <div class="app-surface rounded-2xl border p-4">
        <div class="grid gap-3 md:grid-cols-2">
          <div class="app-card rounded-xl border p-3 md:col-span-2">
            <div class="app-subtle text-[11px] uppercase tracking-[0.2em]">{{ t("talk_define.field_title") }}</div>
            <div class="app-text mt-1 text-sm font-semibold">{{ project.title }}</div>
          </div>
          <div class="app-card rounded-xl border p-3">
            <div class="app-subtle text-[11px] uppercase tracking-[0.2em]">{{ t("talk_define.field_audience") }}</div>
            <div class="app-text mt-1 text-sm">{{ project.audience || t("talk_define.empty_value") }}</div>
          </div>
          <div class="app-card rounded-xl border p-3">
            <div class="app-subtle text-[11px] uppercase tracking-[0.2em]">{{ t("talk_define.field_duration") }}</div>
            <div class="app-text mt-1 text-sm">{{ minutesLabel(project.duration_target_sec) }}</div>
          </div>
          <div class="app-card rounded-xl border p-3 md:col-span-2">
            <div class="app-subtle text-[11px] uppercase tracking-[0.2em]">{{ t("talk_define.field_goal") }}</div>
            <div class="app-text mt-1 text-sm">{{ project.goal || t("talk_define.empty_value") }}</div>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <RouterLink
            class="app-button-primary app-focus-ring inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-semibold"
            :to="`/talks/${project.id}/builder`"
          >
            {{ t("talk_define.continue_builder") }}
          </RouterLink>
          <RouterLink
            class="app-button-secondary app-focus-ring inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-semibold"
            :to="`/talks/${project.id}/train`"
          >
            {{ t("talk_steps.train") }}
          </RouterLink>
        </div>
        <p class="app-muted mt-3 text-xs">{{ t("talk_define.note_next") }}</p>
      </div>
    </div>
  </section>
</template>
