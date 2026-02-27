<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppHeaderMenu from "../components/AppHeaderMenu.vue";
import WorkspaceSwitcher from "../components/WorkspaceSwitcher.vue";
import RouteContextBar from "../components/shell/RouteContextBar.vue";
import SidebarIconNav from "../components/shell/SidebarIconNav.vue";
import TopPrimaryNav from "../components/shell/TopPrimaryNav.vue";
import WindowChrome from "../components/shell/WindowChrome.vue";
import { buildContextBreadcrumbs, resolvePrimaryNavItems } from "../lib/navigation";
import { resolveEffectiveNavMode } from "../lib/navigationMode";
import { flushNavIntent, markSidebarSession, recordNavIntent } from "../lib/navMetrics";
import { useI18n } from "../lib/i18n";
import { useUiPreferences } from "../lib/uiPreferences";
import { appStore } from "../stores/app";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { settings: uiSettings } = useUiPreferences();

const viewportWidth = ref(typeof window === "undefined" ? 1280 : window.innerWidth);

const shellContext = computed(() => ({
  routeName: typeof route.name === "string" ? route.name : null,
  routeParams: route.params as Record<string, unknown>,
  routeQuery: route.query as Record<string, unknown>,
  projects: appStore.state.projects,
  activeProject: appStore.state.activeProject,
  lastFeedbackContext: appStore.state.lastFeedbackContext,
  getTalkNumber: appStore.getTalkNumber,
  formatQuestCode: appStore.formatQuestCode,
}));

const primaryNavItems = computed(() => resolvePrimaryNavItems(shellContext.value, t));
const breadcrumbItems = computed(() => buildContextBreadcrumbs(shellContext.value, t));

const effectiveNavMode = computed(() =>
  resolveEffectiveNavMode(uiSettings.value.primaryNavMode, viewportWidth.value)
);

function onResize() {
  viewportWidth.value = window.innerWidth;
}

function onNavigateIntent(payload: { source: "top" | "sidebar-icon"; itemId: string }) {
  recordNavIntent(payload.source, payload.itemId);
}

const onboardingExemptRoutes = new Set(["onboarding", "help", "about"]);

function maybeRedirectToOnboarding() {
  if (uiSettings.value.onboardingSeen) {
    return;
  }
  const routeName = typeof route.name === "string" ? route.name : null;
  if (routeName && onboardingExemptRoutes.has(routeName)) {
    return;
  }
  const next = encodeURIComponent(route.fullPath || "/training");
  router.replace(`/onboarding?next=${next}`).catch(() => {
    // ignore redundant navigation
  });
}

watch(
  () => effectiveNavMode.value,
  (mode) => {
    if (mode === "sidebar-icon") {
      markSidebarSession();
    }
  },
  { immediate: true }
);

watch(
  () => route.fullPath,
  () => {
    flushNavIntent();
  }
);

watch(
  () => [route.fullPath, uiSettings.value.onboardingSeen] as const,
  () => {
    maybeRedirectToOnboarding();
  },
  { immediate: true }
);

onMounted(() => {
  appStore.ensureBootstrapped().catch((err) => {
    console.error("app bootstrap failed", err);
  });
  window.addEventListener("resize", onResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
});
</script>

<template>
  <div class="app-shell flex h-screen min-h-screen flex-col overflow-hidden">
    <WindowChrome>
      <WorkspaceSwitcher />
      <AppHeaderMenu />
    </WindowChrome>

    <div class="min-h-0 flex flex-1 overflow-hidden">
      <SidebarIconNav
        v-if="effectiveNavMode === 'sidebar-icon'"
        :items="primaryNavItems"
        @navigate-intent="onNavigateIntent"
      />

      <div class="min-h-0 flex flex-1 flex-col overflow-hidden">
        <TopPrimaryNav
          v-if="effectiveNavMode === 'top'"
          :items="primaryNavItems"
          @navigate-intent="onNavigateIntent"
        />

        <main class="min-h-0 flex-1 overflow-y-auto">
          <div class="app-container px-4 py-4 sm:px-6 sm:py-6">
            <RouteContextBar :items="breadcrumbItems" />
            <slot />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>
