<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import HelpActionsSection from "@/features/support/components/help/HelpActionsSection.vue";
import HelpDevSection from "@/features/support/components/help/HelpDevSection.vue";
import HelpTopicSection from "@/features/support/components/help/HelpTopicSection.vue";
import {
  getHelpContentById,
  listHelpContentByAudience,
  parseHelpAudience,
  parseHelpTopic,
  toHelpTopicElementId,
  type HelpAudience,
} from "@/lib/helpContent";
import { useI18n } from "@/lib/i18n";
import { useUiPreferences } from "@/lib/uiPreferences";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { setOnboardingSeen } = useUiPreferences();
const selectedAudience = ref<HelpAudience>(parseHelpAudience(route.query.audience) ?? "first");
const highlightedTopicId = ref<string | null>(null);

/**
 * Page composition root (help center).
 * Reads: help markdown catalog, route query context, and audience selection.
 * Actions: audience deep-link updates and onboarding restart.
 * Boundary: page coordinates help browsing; topic cards and action panels stay presentational.
 */
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

    <UCard class="app-panel" variant="outline">
      <h2 class="app-text text-base font-semibold">{{ t("help.quickstart_title") }}</h2>
      <ol class="app-text mt-3 list-decimal space-y-2 pl-5 text-sm leading-6">
        <li>{{ t("help.quickstart_1") }}</li>
        <li>{{ t("help.quickstart_2") }}</li>
        <li>{{ t("help.quickstart_3") }}</li>
        <li>{{ t("help.quickstart_4") }}</li>
      </ol>
    </UCard>

    <UCard class="app-panel" variant="outline">
      <h2 class="app-text text-base font-semibold">{{ t("help.faq_title") }}</h2>
      <div class="mt-3 grid gap-3 lg:grid-cols-2">
        <UCard
          v-for="item in faqs"
          :key="item.q"
          as="article"
          class="app-panel app-panel-compact app-radius-panel-lg"
          variant="outline"
        >
          <h3 class="app-text text-sm font-semibold">{{ item.q }}</h3>
          <p class="app-muted mt-2 text-sm leading-6">{{ item.a }}</p>
        </UCard>
      </div>
    </UCard>

    <UCard class="app-panel space-y-4" variant="outline">
      <div>
        <h2 class="app-text text-base font-semibold">{{ t("help.playbook_title") }}</h2>
        <p class="app-muted mt-1 text-sm">{{ t("help.playbook_subtitle") }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          v-for="option in audienceOptions"
          :key="option.id"
          class="rounded-full px-3 py-2 text-sm"
          :class="selectedAudience === option.id ? 'app-pill-active' : 'app-pill'"
          size="sm"
          color="neutral"
          variant="ghost"
          @click="setAudience(option.id)"
        >
          {{ option.label }}
        </UButton>
      </div>
    </UCard>

    <HelpTopicSection
      :title="t('help.onboarding_tracks_title')"
      :subtitle="t('help.onboarding_tracks_subtitle')"
      :entries="onboardingEntries"
      :topic-dom-id="topicDomId"
      :topic-card-style="topicCardStyle"
      :topic-deep-link="topicDeepLink"
      grid-class="grid gap-3 lg:grid-cols-3"
    />

    <HelpTopicSection
      :title="t('help.contextual_title')"
      :subtitle="t('help.contextual_subtitle')"
      :entries="contextualEntries"
      :unknown-topic="unknownTopic"
      :topic-dom-id="topicDomId"
      :topic-card-style="topicCardStyle"
      :topic-deep-link="topicDeepLink"
    />

    <HelpDevSection />

    <HelpActionsSection :restart-onboarding="restartOnboarding" />
  </section>
</template>
