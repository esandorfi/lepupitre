<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useI18n } from "../lib/i18n";
import { useUiPreferences } from "../lib/uiPreferences";

type Audience = "first" | "manager" | "conference";

const { t } = useI18n();
const router = useRouter();
const { setOnboardingSeen } = useUiPreferences();
const selectedAudience = ref<Audience>("first");

const faqs = computed(() => [
  { q: t("help.faq_1_q"), a: t("help.faq_1_a") },
  { q: t("help.faq_2_q"), a: t("help.faq_2_a") },
  { q: t("help.faq_3_q"), a: t("help.faq_3_a") },
  { q: t("help.faq_4_q"), a: t("help.faq_4_a") },
]);

const audienceOptions = computed(() => [
  { id: "first" as const, label: t("onboarding.audience_first_label") },
  { id: "manager" as const, label: t("onboarding.audience_manager_label") },
  { id: "conference" as const, label: t("onboarding.audience_conference_label") },
]);

const audiencePlaybook = computed(() => {
  switch (selectedAudience.value) {
    case "manager":
      return {
        focus: t("help.playbook_manager_focus"),
        routine: t("help.playbook_manager_routine"),
        trap: t("help.playbook_manager_trap"),
      };
    case "conference":
      return {
        focus: t("help.playbook_conference_focus"),
        routine: t("help.playbook_conference_routine"),
        trap: t("help.playbook_conference_trap"),
      };
    case "first":
    default:
      return {
        focus: t("help.playbook_first_focus"),
        routine: t("help.playbook_first_routine"),
        trap: t("help.playbook_first_trap"),
      };
  }
});

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
          @click="selectedAudience = option.id"
        >
          {{ option.label }}
        </button>
      </div>
      <div class="grid gap-3 lg:grid-cols-3">
        <article class="app-card app-radius-panel-lg border p-4">
          <h3 class="app-text text-sm font-semibold">{{ t("help.playbook_focus") }}</h3>
          <p class="app-muted mt-2 text-sm leading-6">{{ audiencePlaybook.focus }}</p>
        </article>
        <article class="app-card app-radius-panel-lg border p-4">
          <h3 class="app-text text-sm font-semibold">{{ t("help.playbook_routine") }}</h3>
          <p class="app-muted mt-2 text-sm leading-6">{{ audiencePlaybook.routine }}</p>
        </article>
        <article class="app-card app-radius-panel-lg border p-4">
          <h3 class="app-text text-sm font-semibold">{{ t("help.playbook_trap") }}</h3>
          <p class="app-muted mt-2 text-sm leading-6">{{ audiencePlaybook.trap }}</p>
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
