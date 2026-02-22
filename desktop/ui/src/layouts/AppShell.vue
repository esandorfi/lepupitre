<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "../lib/i18n";
import { useTheme } from "../lib/theme";
import { appStore } from "../stores/app";
import packageJson from "../../package.json";

const { locale, setLocale, t } = useI18n();
const { theme, setTheme, nextTheme } = useTheme();
const route = useRoute();

const themeLabel = computed(() => t(`theme.${theme.value}`));
const appVersion = packageJson.version as string;
const activeQuestCode = computed(() => {
  if (route.name === "quest") {
    return String(route.params.questCode || "");
  }
  if (route.name === "feedback") {
    return appStore.state.lastFeedbackContext?.quest_code ?? "";
  }
  return "";
});
const showQuestTab = computed(() => activeQuestCode.value.length > 0);
const talkLabel = computed(() => t("nav.talk"));
const activeFeedbackId = computed(() => {
  if (route.name === "feedback") {
    return String(route.params.feedbackId || "");
  }
  return "";
});
const showFeedbackTab = computed(() => activeFeedbackId.value.length > 0);
const activeTalkId = computed(() => {
  const paramId = String(route.params.projectId || "");
  if (paramId) {
    return paramId;
  }
  const queryId = String(route.query.projectId || "");
  if (queryId) {
    return queryId;
  }
  if (route.name === "feedback") {
    return appStore.state.lastFeedbackContext?.project_id ?? "";
  }
  return "";
});
const activeTalkTitle = computed(() => {
  const projectId = activeTalkId.value;
  if (!projectId) {
    return null;
  }
  return (
    appStore.state.projects.find((project) => project.id === projectId)?.title ??
    appStore.state.activeProject?.title ??
    null
  );
});
const activeTalkNumber = computed(() => {
  if (!activeTalkId.value) {
    return appStore.state.activeProject?.talk_number ?? null;
  }
  return appStore.getTalkNumber(activeTalkId.value);
});
const showTalkTab = computed(() => {
  if (!activeTalkTitle.value) {
    return false;
  }
  return route.name === "talk-report" || route.name === "quest" || route.name === "feedback";
});
const talkReportLink = computed(() => {
  const id = activeTalkId.value || appStore.state.activeProject?.id || "";
  if (id) {
    return `/talks/${id}`;
  }
  return "/talks";
});

function truncateLabel(value: string, max = 18) {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, Math.max(0, max - 3))}...`;
}

const questLabel = computed(() => {
  if (activeQuestCode.value) {
    const projectId = activeTalkId.value || appStore.state.activeProject?.id || "";
    return appStore.formatQuestCode(projectId, activeQuestCode.value);
  }
  return t("nav.quest_active");
});
const feedbackLabel = computed(() => {
  if (activeFeedbackId.value) {
    return truncateLabel(activeFeedbackId.value, 10);
  }
  return t("nav.feedback_active");
});

function toggleLocale() {
  setLocale(locale.value === "fr" ? "en" : "fr");
}

function cycleTheme() {
  setTheme(nextTheme(theme.value));
}
</script>

<template>
  <div class="app-shell min-h-screen">
    <header class="app-toolbar border-b px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="app-toolbar-muted text-xs font-bold uppercase tracking-[0.3em]">
            Le Pupitre
          </div>
          <div class="app-toolbar-muted text-[10px] font-semibold">v{{ appVersion }}</div>
        </div>
        <div class="flex items-center gap-2">
          <RouterLink
            class="app-toolbar-button cursor-pointer rounded-full border px-3 py-1 text-xs transition"
            to="/profiles"
          >
            {{ t("nav.profiles") }}
          </RouterLink>
          <button
            class="app-toolbar-button cursor-pointer rounded-full border px-3 py-1 text-xs transition"
            type="button"
            @click="cycleTheme"
          >
            {{ t("theme.label") }}: {{ themeLabel }}
          </button>
          <button
            class="app-toolbar-button cursor-pointer rounded-full border px-3 py-1 text-xs transition"
            type="button"
            @click="toggleLocale"
          >
            {{ locale.toUpperCase() }}
          </button>
        </div>
      </div>
      <nav class="mt-3 flex flex-wrap gap-3 text-xs">
        <RouterLink
          class="app-toolbar-link app-pill rounded-full px-3 py-1 transition"
          exact-active-class="app-pill-active font-semibold"
          to="/"
        >
          {{ t("nav.home") }}
        </RouterLink>
        <RouterLink
          class="app-toolbar-link app-pill rounded-full px-3 py-1 transition"
          exact-active-class="app-pill-active font-semibold"
          to="/talks"
        >
          {{ talkLabel }}
        </RouterLink>
        <RouterLink
          v-if="showTalkTab"
          class="app-toolbar-link app-pill app-pill-active rounded-full px-3 py-1 font-semibold transition"
          :to="talkReportLink"
          :title="activeTalkTitle || undefined"
        >
          {{
            activeTalkTitle
              ? `${activeTalkNumber ? `T${activeTalkNumber} ` : ""}${truncateLabel(activeTalkTitle)}`
              : ""
          }}
        </RouterLink>
        <RouterLink
          v-if="showQuestTab"
          class="app-toolbar-link app-pill rounded-full px-3 py-1 transition"
          exact-active-class="app-pill-active font-semibold"
          :to="`/quest/${activeQuestCode}`"
        >
          {{ questLabel }}
        </RouterLink>
        <RouterLink
          v-if="showFeedbackTab"
          class="app-toolbar-link app-pill rounded-full px-3 py-1 transition"
          exact-active-class="app-pill-active font-semibold"
          :to="`/feedback/${activeFeedbackId}`"
        >
          {{ feedbackLabel }}
        </RouterLink>
      </nav>
    </header>
    <main class="px-6 py-6">
      <slot />
    </main>
  </div>
</template>
