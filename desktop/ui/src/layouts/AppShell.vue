<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import AppHeaderMenu from "../components/AppHeaderMenu.vue";
import WorkspaceSwitcher from "../components/WorkspaceSwitcher.vue";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";

const { t } = useI18n();
const route = useRoute();

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
const activePeerReviewId = computed(() => {
  if (route.name === "peer-review") {
    return String(route.params.peerReviewId || "");
  }
  return "";
});
const showPeerReviewTab = computed(() => activePeerReviewId.value.length > 0);
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
  if (route.name === "boss-run") {
    return appStore.state.activeProject?.id ?? "";
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
  return (
    route.name === "talk-report" ||
    route.name === "quest" ||
    route.name === "feedback" ||
    route.name === "boss-run" ||
    route.name === "peer-review"
  );
});
const talkReportLink = computed(() => {
  const id = activeTalkId.value || appStore.state.activeProject?.id || "";
  if (id) {
    return `/talks/${id}`;
  }
  return "/talks";
});
const questLink = computed(() => {
  const code = activeQuestCode.value;
  if (!code) {
    return "/";
  }
  const projectId = activeTalkId.value || appStore.state.activeProject?.id || "";
  if (projectId) {
    return `/quest/${code}?from=talk&projectId=${projectId}`;
  }
  return `/quest/${code}`;
});
const feedbackLink = computed(() => {
  if (!activeFeedbackId.value) {
    return "/";
  }
  return `/feedback/${activeFeedbackId.value}`;
});
const peerReviewLink = computed(() => {
  if (!activePeerReviewId.value) {
    return "/";
  }
  const projectId = String(route.query.projectId || "");
  if (projectId) {
    return `/peer-review/${activePeerReviewId.value}?projectId=${projectId}`;
  }
  return `/peer-review/${activePeerReviewId.value}`;
});

function truncateLabel(value: string, max = 18) {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, Math.max(0, max - 3))}...`;
}

const talkCrumbLabel = computed(() => {
  if (activeTalkTitle.value) {
    return `${activeTalkNumber.value ? `T${activeTalkNumber.value} ` : ""}${truncateLabel(
      activeTalkTitle.value
    )}`;
  }
  return t("nav.talk");
});

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
const peerReviewLabel = computed(() => {
  if (activePeerReviewId.value) {
    return truncateLabel(activePeerReviewId.value, 10);
  }
  return t("nav.peer_review_active");
});
const showBossRunTab = computed(() => route.name === "boss-run");
const bossRunLabel = computed(() => t("nav.boss_run"));
const bossRunLink = computed(() => "/boss-run");

const breadcrumbItems = computed(() => {
  const items: { label: string; to?: string }[] = [];
  if (showTalkTab.value) {
    items.push({ label: talkCrumbLabel.value, to: talkReportLink.value });
  }
  if (showBossRunTab.value) {
    items.push({ label: bossRunLabel.value, to: bossRunLink.value });
  }
  if (showQuestTab.value) {
    items.push({ label: questLabel.value, to: questLink.value });
  }
  if (showFeedbackTab.value) {
    items.push({ label: feedbackLabel.value, to: feedbackLink.value });
  }
  if (showPeerReviewTab.value) {
    items.push({ label: peerReviewLabel.value, to: peerReviewLink.value });
  }
  return items;
});

onMounted(() => {
  appStore.ensureBootstrapped().catch((err) => {
    console.error("app bootstrap failed", err);
  });
});
</script>

<template>
  <div class="app-shell min-h-screen">
    <header class="app-toolbar border-b">
      <div class="app-container px-4 py-3 sm:px-6">
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between gap-3">
            <RouterLink class="app-toolbar-link app-focus-ring rounded-lg px-1 py-1 text-sm font-bold tracking-[0.22em] uppercase" to="/">
              LE PUPITRE
            </RouterLink>

            <div class="flex items-center gap-2">
              <WorkspaceSwitcher />
              <AppHeaderMenu />
            </div>
          </div>

          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <nav class="app-nav-text flex flex-wrap items-center gap-2" aria-label="Primary">
              <RouterLink
                class="app-top-tab app-focus-ring rounded-full px-3 py-2 transition"
                exact-active-class="app-top-tab-active"
                to="/"
              >
                {{ t("nav.home") }}
              </RouterLink>
              <RouterLink
                class="app-top-tab app-focus-ring rounded-full px-3 py-2 transition"
                exact-active-class="app-top-tab-active"
                to="/talks"
              >
                {{ talkLabel }}
              </RouterLink>
            </nav>

            <UBreadcrumb
              v-if="breadcrumbItems.length > 0"
              class="app-breadcrumb app-nav-text"
              separator-icon="i-lucide-arrow-right"
              :items="breadcrumbItems"
            />
          </div>
        </div>
      </div>
    </header>

    <main class="px-4 py-4 sm:px-6 sm:py-6">
      <div class="app-container">
        <slot />
      </div>
    </main>
  </div>
</template>
