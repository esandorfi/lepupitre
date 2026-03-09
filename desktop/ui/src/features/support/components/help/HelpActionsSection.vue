<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useI18n } from "@/lib/i18n";

defineProps<{
  restartOnboarding: () => void | Promise<void>;
}>();

const { t } = useI18n();
</script>

<template>
  <UCard class="app-panel app-panel-compact" variant="outline">
    <h2 class="app-text text-base font-semibold">{{ t("help.actions_title") }}</h2>
    <div class="mt-3 flex flex-wrap items-center gap-3">
      <UButton size="md" color="neutral" variant="outline" @click="restartOnboarding">
        {{ t("help.action_restart_onboarding") }}
      </UButton>
      <RouterLink class="app-link app-text-meta underline" to="/settings">
        {{ t("help.action_settings") }}
      </RouterLink>
      <RouterLink class="app-link app-text-meta underline" to="/about">
        {{ t("help.action_about") }}
      </RouterLink>
    </div>
  </UCard>
</template>
