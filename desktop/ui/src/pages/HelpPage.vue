<script setup lang="ts">
/* eslint-disable vue/no-v-html */
import { computed, nextTick, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import {
  getHelpContentById,
  listHelpContentByAudience,
  parseHelpAudience,
  parseHelpTopic,
  toHelpTopicElementId,
  type HelpAudience,
} from "../lib/helpContent";
import { useI18n } from "../lib/i18n";
import { useUiPreferences } from "../lib/uiPreferences";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { setOnboardingSeen } = useUiPreferences();
const selectedAudience = ref<HelpAudience>(parseHelpAudience(route.query.audience) ?? "first");
const highlightedTopicId = ref<string | null>(null);

const faqs = computed(() => [
  { q: t("help.faq_1_q"), a: t("help.faq_1_a") },
  { q: t("help.faq_2_q"), a: t("help.faq_2_a") },
  { q: t("help.faq_3_q"), a: t("help.faq_3_a") },
  { q: t("help.faq_4_q"), a: t("help.faq_4_a") },
]);

const audienceOptions = computed(() => [
  { id: "first" as HelpAudience, label: t("onboarding.audience_first_label") },
  { id: "manager" as HelpAudience, label: t("onboarding.audience_manager_label") },
  { id: "conference" as HelpAudience, label: t("onboarding.audience_conference_label") },
]);

const visibleEntries = computed(() => listHelpContentByAudience(selectedAudience.value));

const onboardingEntries = computed(() =>
  visibleEntries.value.filter((entry) => entry.id.startsWith("onboarding."))
);

const contextualEntries = computed(() =>
  visibleEntries.value.filter((entry) => entry.id.startsWith("help."))
);

const selectedTopicParam = computed(() => parseHelpTopic(route.query.topic));
const selectedTopic = computed(() => getHelpContentById(selectedTopicParam.value));
const unknownTopic = computed(
  () => Boolean(selectedTopicParam.value) && !Boolean(selectedTopic.value)
);

watch(
  () => route.query.audience,
  (value) => {
    const parsed = parseHelpAudience(value);
    if (parsed) {
      selectedAudience.value = parsed;
    }
  }
);

watch(
  () => selectedTopic.value,
  async (topic) => {
    highlightedTopicId.value = topic?.id ?? null;
    if (!topic) {
      return;
    }
    await nextTick();
    const element = document.getElementById(toHelpTopicElementId(topic.id));
    if (!element) {
      return;
    }
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  },
  { immediate: true }
);

function setAudience(audience: HelpAudience) {
  selectedAudience.value = audience;
  void router
    .replace({
      path: "/help",
      query: {
        ...route.query,
        audience,
      },
    })
    .catch(() => {
      // ignore redundant navigation
    });
}

function topicDomId(topicId: string) {
  return toHelpTopicElementId(topicId);
}

function topicCardStyle(topicId: string) {
  if (highlightedTopicId.value !== topicId) {
    return undefined;
  }
  return {
    borderColor: "#c2410c",
    boxShadow: "0 0 0 2px rgba(194, 65, 12, 0.18)",
  };
}

function topicDeepLink(topicId: string) {
  return {
    path: "/help",
    query: {
      ...route.query,
      topic: topicId,
      audience: selectedAudience.value,
    },
  };
}

async function restartOnboarding() {
  setOnboardingSeen(false);
  await router.push("/onboarding?next=/training");
}
</script>

<template>
  <section class="space-y-6">
    <header>
      <h1 class="app-text text-2xl font-semibold tracking-tight">{{ t("help.title") }}</h1>
      <p class="app-muted mt-1 text-sm">{{ t("help.subtitle") }}</p>
    </header>

    <div class="app-panel">
      <h2 class="app-text text-base font-semibold">{{ t("help.quickstart_title") }}</h2>
      <ol class="app-text mt-3 list-decimal space-y-2 pl-5 text-sm leading-6">
        <li>{{ t("help.quickstart_1") }}</li>
        <li>{{ t("help.quickstart_2") }}</li>
        <li>{{ t("help.quickstart_3") }}</li>
        <li>{{ t("help.quickstart_4") }}</li>
      </ol>
    </div>

    <div class="app-panel">
      <h2 class="app-text text-base font-semibold">{{ t("help.faq_title") }}</h2>
      <div class="mt-3 grid gap-3 lg:grid-cols-2">
        <article
          v-for="item in faqs"
          :key="item.q"
          class="app-card app-radius-panel-lg border p-4"
        >
          <h3 class="app-text text-sm font-semibold">{{ item.q }}</h3>
          <p class="app-muted mt-2 text-sm leading-6">{{ item.a }}</p>
        </article>
      </div>
    </div>

    <div class="app-panel space-y-4">
      <div>
        <h2 class="app-text text-base font-semibold">{{ t("help.playbook_title") }}</h2>
        <p class="app-muted mt-1 text-sm">{{ t("help.playbook_subtitle") }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-for="option in audienceOptions"
          :key="option.id"
          class="app-focus-ring cursor-pointer rounded-full px-3 py-2 text-sm"
          :class="selectedAudience === option.id ? 'app-pill-active' : 'app-pill'"
          type="button"
          @click="setAudience(option.id)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div class="app-panel space-y-4">
      <div>
        <h2 class="app-text text-base font-semibold">{{ t("help.onboarding_tracks_title") }}</h2>
        <p class="app-muted mt-1 text-sm">{{ t("help.onboarding_tracks_subtitle") }}</p>
      </div>
      <div class="grid gap-3 lg:grid-cols-3">
        <article
          v-for="entry in onboardingEntries"
          :id="topicDomId(entry.id)"
          :key="entry.id"
          class="app-card app-radius-panel-lg border p-4 transition-colors"
          :style="topicCardStyle(entry.id)"
        >
          <h3 class="app-text text-sm font-semibold">{{ entry.title }}</h3>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="app-markdown app-muted mt-2 text-sm leading-6" v-html="entry.html" />
          <RouterLink
            class="app-link app-text-meta mt-3 inline-block underline"
            :to="topicDeepLink(entry.id)"
          >
            {{ t("help.open_deep_link") }}
          </RouterLink>
        </article>
      </div>
    </div>

    <div class="app-panel space-y-4">
      <div>
        <h2 class="app-text text-base font-semibold">{{ t("help.contextual_title") }}</h2>
        <p class="app-muted mt-1 text-sm">{{ t("help.contextual_subtitle") }}</p>
      </div>
      <p v-if="unknownTopic" class="app-muted text-sm">{{ t("help.contextual_unknown_topic") }}</p>
      <div class="grid gap-3">
        <article
          v-for="entry in contextualEntries"
          :id="topicDomId(entry.id)"
          :key="entry.id"
          class="app-card app-radius-panel-lg border p-4 transition-colors"
          :style="topicCardStyle(entry.id)"
        >
          <h3 class="app-text text-sm font-semibold">{{ entry.title }}</h3>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="app-markdown app-muted mt-2 text-sm leading-6" v-html="entry.html" />
          <RouterLink
            class="app-link app-text-meta mt-3 inline-block underline"
            :to="topicDeepLink(entry.id)"
          >
            {{ t("help.open_deep_link") }}
          </RouterLink>
        </article>
      </div>
    </div>

    <div class="app-panel">
      <h2 class="app-text text-base font-semibold">{{ t("help.dev_title") }}</h2>
      <p class="app-muted mt-2 text-sm leading-6">{{ t("help.dev_subtitle") }}</p>
      <div class="mt-3 grid gap-3 lg:grid-cols-2">
        <article class="app-card app-radius-panel-lg border p-4">
          <h3 class="app-text text-sm font-semibold">{{ t("help.dev_ui_only_title") }}</h3>
          <p class="app-muted mt-2 text-sm">{{ t("help.dev_ui_only_body") }}</p>
          <pre class="app-panel app-panel-compact mt-3 overflow-x-auto text-xs">pnpm -C desktop ui:dev</pre>
        </article>
        <article class="app-card app-radius-panel-lg border p-4">
          <h3 class="app-text text-sm font-semibold">{{ t("help.dev_tauri_title") }}</h3>
          <p class="app-muted mt-2 text-sm">{{ t("help.dev_tauri_body") }}</p>
          <pre class="app-panel app-panel-compact mt-3 overflow-x-auto text-xs">pnpm -C desktop dev</pre>
        </article>
      </div>
    </div>

    <div class="app-panel app-panel-compact">
      <h2 class="app-text text-base font-semibold">{{ t("help.actions_title") }}</h2>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <button
          class="app-button-secondary app-focus-ring app-button-md inline-flex cursor-pointer items-center"
          type="button"
          @click="restartOnboarding"
        >
          {{ t("help.action_restart_onboarding") }}
        </button>
        <RouterLink class="app-link app-text-meta underline" to="/settings">
          {{ t("help.action_settings") }}
        </RouterLink>
        <RouterLink class="app-link app-text-meta underline" to="/about">
          {{ t("help.action_about") }}
        </RouterLink>
      </div>
    </div>
  </section>
</template>
