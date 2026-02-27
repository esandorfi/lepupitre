<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { useI18n } from "../lib/i18n";
import { useUiPreferences } from "../lib/uiPreferences";

type Audience = "first" | "manager" | "conference";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const { setOnboardingSeen } = useUiPreferences();
const selectedAudience = ref<Audience>("first");

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
    id: "first" as const,
    label: t("onboarding.audience_first_label"),
    description: t("onboarding.audience_first_desc"),
  },
  {
    id: "manager" as const,
    label: t("onboarding.audience_manager_label"),
    description: t("onboarding.audience_manager_desc"),
  },
  {
    id: "conference" as const,
    label: t("onboarding.audience_conference_label"),
    description: t("onboarding.audience_conference_desc"),
  },
]);

const audiencePlan = computed(() => {
  switch (selectedAudience.value) {
    case "manager":
      return {
        title: t("onboarding.audience_manager_label"),
        goal: t("onboarding.audience_manager_goal"),
        steps: [
          t("onboarding.audience_manager_step_1"),
          t("onboarding.audience_manager_step_2"),
          t("onboarding.audience_manager_step_3"),
        ],
      };
    case "conference":
      return {
        title: t("onboarding.audience_conference_label"),
        goal: t("onboarding.audience_conference_goal"),
        steps: [
          t("onboarding.audience_conference_step_1"),
          t("onboarding.audience_conference_step_2"),
          t("onboarding.audience_conference_step_3"),
        ],
      };
    case "first":
    default:
      return {
        title: t("onboarding.audience_first_label"),
        goal: t("onboarding.audience_first_goal"),
        steps: [
          t("onboarding.audience_first_step_1"),
          t("onboarding.audience_first_step_2"),
          t("onboarding.audience_first_step_3"),
        ],
      };
  }
});

async function finishOnboarding(target = nextPath.value) {
  setOnboardingSeen(true);
  await router.push(target);
}
</script>

<template>
  <section class="space-y-6">
    <header class="space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <span class="app-badge-neutral app-text-caption rounded-full px-2 py-1">
          {{ t("onboarding.badge_local") }}
        </span>
        <span class="app-badge-neutral app-text-caption rounded-full px-2 py-1">
          {{ t("onboarding.badge_offline") }}
        </span>
        <span class="app-badge-neutral app-text-caption rounded-full px-2 py-1">
          {{ t("onboarding.badge_private") }}
        </span>
      </div>
      <h1 class="app-text text-2xl font-semibold tracking-tight">{{ t("onboarding.title") }}</h1>
      <p class="app-muted text-sm">{{ t("onboarding.subtitle") }}</p>
    </header>

    <div class="app-panel">
      <div class="app-text-eyebrow">{{ t("onboarding.quickstart_title") }}</div>
      <div class="mt-4 grid gap-3 lg:grid-cols-3">
        <article
          v-for="step in quickstartSteps"
          :key="step.title"
          class="app-card app-radius-panel-lg border p-4"
        >
          <h2 class="app-text text-base font-semibold">{{ step.title }}</h2>
          <p class="app-muted mt-2 text-sm leading-6">{{ step.body }}</p>
          <RouterLink class="app-link app-text-meta mt-3 inline-block underline" :to="step.to">
            {{ step.action }}
          </RouterLink>
        </article>
      </div>
    </div>

    <div class="app-panel space-y-4">
      <div>
        <h2 class="app-text text-base font-semibold">{{ t("onboarding.audience_title") }}</h2>
        <p class="app-muted mt-1 text-sm">{{ t("onboarding.audience_subtitle") }}</p>
      </div>

      <div class="grid gap-2 lg:grid-cols-3">
        <button
          v-for="option in audienceOptions"
          :key="option.id"
          class="app-focus-ring cursor-pointer rounded-xl border px-3 py-3 text-left"
          :class="selectedAudience === option.id ? 'app-pill-active' : 'app-pill'"
          type="button"
          @click="selectedAudience = option.id"
        >
          <div class="app-text text-sm font-semibold">{{ option.label }}</div>
          <div class="app-text-meta mt-1">{{ option.description }}</div>
        </button>
      </div>

      <article class="app-card app-radius-panel-lg border p-4">
        <h3 class="app-text text-sm font-semibold">
          {{ t("onboarding.audience_plan_title") }}: {{ audiencePlan.title }}
        </h3>
        <p class="app-muted mt-2 text-sm leading-6">{{ audiencePlan.goal }}</p>
        <ol class="app-text mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-6">
          <li v-for="step in audiencePlan.steps" :key="step">{{ step }}</li>
        </ol>
      </article>
    </div>

    <div class="app-panel app-panel-compact space-y-3">
      <h2 class="app-text text-base font-semibold">{{ t("onboarding.help_title") }}</h2>
      <p class="app-muted text-sm leading-6">{{ t("onboarding.help_body") }}</p>
      <div class="flex flex-wrap items-center gap-3">
        <RouterLink class="app-link app-text-meta underline" to="/help">
          {{ t("onboarding.action_help") }}
        </RouterLink>
        <RouterLink class="app-link app-text-meta underline" to="/about">
          {{ t("onboarding.action_about") }}
        </RouterLink>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <button
        class="app-button-primary app-focus-ring app-button-md inline-flex cursor-pointer items-center"
        type="button"
        @click="finishOnboarding('/profiles')"
      >
        {{ t("onboarding.action_setup") }}
      </button>
      <button
        class="app-button-secondary app-focus-ring app-button-md inline-flex cursor-pointer items-center"
        type="button"
        @click="finishOnboarding()"
      >
        {{ t("onboarding.action_continue") }}
      </button>
    </div>
  </section>
</template>
