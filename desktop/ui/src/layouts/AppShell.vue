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
const talksCount = computed(() => appStore.state.projects.length);
const currentTalk = computed(() => appStore.state.activeProject);
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
const currentTalkLink = computed(() => {
  const id = currentTalk.value?.id || "";
  return id ? `/talks/${id}/train` : "/talks";
});
const currentTalkTabLabel = computed(() => {
  if (!currentTalk.value) {
    return t("nav.current_talk");
  }
  const number = currentTalk.value.talk_number;
  const prefix = number ? `T${number} ` : "";
  return `${prefix}${truncateLabel(currentTalk.value.title, 16)}`;
});
const isCurrentTalkNavActive = computed(() => {
  const currentId = currentTalk.value?.id;
  if (!currentId) {
    return false;
  }
  return showTalkTab.value && activeTalkId.value === currentId;
});
const showTalkTab = computed(() => {
  return (
    route.name === "talk-define" ||
    route.name === "talk-builder" ||
    route.name === "talk-train" ||
    route.name === "talk-export" ||
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
    return `/talks/${id}/train`;
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
  <div class="app-shell flex h-screen min-h-screen flex-col overflow-hidden">
    <header class="app-toolbar sticky top-0 z-40 shrink-0 border-b">
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
                to="/training"
              >
                {{ t("nav.training") }}
              </RouterLink>
              <RouterLink
                class="app-top-tab app-focus-ring rounded-full px-3 py-2 transition"
                exact-active-class="app-top-tab-active"
                to="/talks"
              >
                <span class="inline-flex items-center gap-2">
                  <span>{{ talkLabel }}</span>
                  <span class="app-badge-neutral inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                    {{ talksCount }}
                  </span>
                </span>
              </RouterLink>
              <RouterLink
                v-if="currentTalk"
                class="app-top-tab app-focus-ring rounded-full px-3 py-2 transition"
                :class="{ 'app-top-tab-active': isCurrentTalkNavActive }"
                :to="currentTalkLink"
              >
                {{ currentTalkTabLabel }}
              </RouterLink>
              <button
                v-else
                class="app-top-tab app-top-tab-disabled rounded-full px-3 py-2 transition"
                type="button"
                disabled
              >
                {{ t("nav.current_talk") }}
              </button>
            </nav>
          </div>
        </div>
      </div>
    </header>

    <main class="min-h-0 flex-1 overflow-y-auto">
      <div class="app-container px-4 py-4 sm:px-6 sm:py-6">
        <div v-if="breadcrumbItems.length > 0" class="mb-4">
          <div class="app-surface rounded-xl border px-3 py-2 shadow-sm">
            <UBreadcrumb
              class="app-breadcrumb app-nav-text"
              separator-icon="i-lucide-arrow-right"
              :items="breadcrumbItems"
            />
          </div>
        </div>
        <slot />
      </div>
    </main>
  </div>
</template>
