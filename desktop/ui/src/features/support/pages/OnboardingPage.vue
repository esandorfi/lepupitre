<script setup lang="ts">
/* eslint-disable vue/no-v-html */
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import AppBadge from "@/components/ui/AppBadge.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppPanel from "@/components/ui/AppPanel.vue";
import {
  getOnboardingTrackByAudience,
  parseHelpAudience,
  type HelpAudience,
} from "@/lib/helpContent";
import { useI18n } from "@/lib/i18n";
import { useUiPreferences } from "@/lib/uiPreferences";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const { setOnboardingSeen } = useUiPreferences();
const selectedAudience = ref<HelpAudience>(parseHelpAudience(route.query.audience) ?? "first");

const quickstartSteps = computed(() => [
  {
    title: t("onboarding.step_workspace_title"),
    body: t("onboarding.step_workspace_body"),
    to: "/profiles",
    action: t("onboarding.step_workspace_action"),
  },
  {
    title: t("onboarding.step_talk_title"),
    body: t("onboarding.step_talk_body"),
    to: "/project/new",
    action: t("onboarding.step_talk_action"),
  },
  {
    title: t("onboarding.step_quest_title"),
    body: t("onboarding.step_quest_body"),
    to: "/training",
    action: t("onboarding.step_quest_action"),
  },
]);

const nextPath = computed(() => {
  const raw = typeof route.query.next === "string" ? route.query.next : "";
  if (!raw.startsWith("/")) {
    return "/training";
  }
  if (raw.startsWith("/onboarding")) {
    return "/training";
  }
  return raw;
});

const audienceOptions = computed(() => [
  {
    id: "first" as HelpAudience,
    label: t("onboarding.audience_first_label"),
    description: t("onboarding.audience_first_desc"),
  },
  {
    id: "manager" as HelpAudience,
    label: t("onboarding.audience_manager_label"),
    description: t("onboarding.audience_manager_desc"),
  },
  {
    id: "conference" as HelpAudience,
    label: t("onboarding.audience_conference_label"),
    description: t("onboarding.audience_conference_desc"),
  },
]);

const audiencePlan = computed(() => getOnboardingTrackByAudience(selectedAudience.value));

watch(
  () => route.query.audience,
  (value) => {
    const parsed = parseHelpAudience(value);
    if (parsed) {
      selectedAudience.value = parsed;
    }
  }
);

function selectAudience(audience: HelpAudience) {
  selectedAudience.value = audience;
}

function helpRouteForAudience(audience: HelpAudience) {
  return {
    path: "/help",
    query: {
      audience,
    },
  };
}

async function finishOnboarding(target = nextPath.value) {
  setOnboardingSeen(true);
  await router.push(target);
}
</script>

<template>
  <section class="space-y-6">
    <header class="space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <AppBadge tone="neutral">
          {{ t("onboarding.badge_local") }}
        </AppBadge>
        <AppBadge tone="neutral">
          {{ t("onboarding.badge_offline") }}
        </AppBadge>
        <AppBadge tone="neutral">
          {{ t("onboarding.badge_private") }}
        </AppBadge>
      </div>
      <h1 class="app-text text-2xl font-semibold tracking-tight">{{ t("onboarding.title") }}</h1>
      <p class="app-muted text-sm">{{ t("onboarding.subtitle") }}</p>
    </header>

    <AppPanel>
      <div class="app-text-eyebrow">{{ t("onboarding.quickstart_title") }}</div>
      <div class="mt-4 grid gap-3 lg:grid-cols-3">
        <AppPanel
          v-for="step in quickstartSteps"
          :key="step.title"
          as="article"
          variant="compact"
          class="app-radius-panel-lg"
        >
          <h2 class="app-text text-base font-semibold">{{ step.title }}</h2>
          <p class="app-muted mt-2 text-sm leading-6">{{ step.body }}</p>
          <RouterLink class="app-link app-text-meta mt-3 inline-block underline" :to="step.to">
            {{ step.action }}
          </RouterLink>
        </AppPanel>
      </div>
    </AppPanel>

    <AppPanel class="space-y-4">
      <div>
        <h2 class="app-text text-base font-semibold">{{ t("onboarding.audience_title") }}</h2>
        <p class="app-muted mt-1 text-sm">{{ t("onboarding.audience_subtitle") }}</p>
      </div>

      <div class="grid gap-2 lg:grid-cols-3">
        <AppButton
          v-for="option in audienceOptions"
          :key="option.id"
          class="w-full justify-start rounded-xl border px-3 py-3 text-left"
          :class="selectedAudience === option.id ? 'app-pill-active' : 'app-pill'"
          size="md"
          tone="ghost"
          @click="selectAudience(option.id)"
        >
          <div class="app-text text-sm font-semibold">{{ option.label }}</div>
          <div class="app-text-meta mt-1">{{ option.description }}</div>
        </AppButton>
      </div>

      <AppPanel v-if="audiencePlan" as="article" class="app-radius-panel-lg" variant="compact">
        <h3 class="app-text text-sm font-semibold">
          {{ t("onboarding.audience_plan_title") }}: {{ audiencePlan.title }}
        </h3>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="app-markdown app-muted mt-2 text-sm leading-6" v-html="audiencePlan.html" />
      </AppPanel>
    </AppPanel>

    <AppPanel class="space-y-3" variant="compact">
      <h2 class="app-text text-base font-semibold">{{ t("onboarding.help_title") }}</h2>
      <p class="app-muted text-sm leading-6">{{ t("onboarding.help_body") }}</p>
      <div class="flex flex-wrap items-center gap-3">
        <RouterLink class="app-link app-text-meta underline" :to="helpRouteForAudience(selectedAudience)">
          {{ t("onboarding.action_help") }}
        </RouterLink>
        <RouterLink class="app-link app-text-meta underline" to="/about">
          {{ t("onboarding.action_about") }}
        </RouterLink>
      </div>
    </AppPanel>

    <div class="flex flex-wrap items-center gap-3">
      <AppButton size="md" tone="primary" @click="finishOnboarding('/profiles')">
        {{ t("onboarding.action_setup") }}
      </AppButton>
      <AppButton size="md" tone="secondary" @click="finishOnboarding()">
        {{ t("onboarding.action_continue") }}
      </AppButton>
    </div>
  </section>
</template>

