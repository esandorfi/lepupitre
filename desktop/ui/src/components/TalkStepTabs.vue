<script setup lang="ts">
import { computed } from "vue";
import SectionPanel from "./SectionPanel.vue";
import { useI18n } from "../lib/i18n";

const props = defineProps<{
  projectId: string;
  active: "define" | "builder" | "train" | "export";
}>();

const { t } = useI18n();

const tabs = computed(() => [
  { key: "define" as const, label: t("talk_steps.define"), to: `/talks/${props.projectId}/define` },
  { key: "builder" as const, label: t("talk_steps.builder"), to: `/talks/${props.projectId}/builder` },
  { key: "train" as const, label: t("talk_steps.train"), to: `/talks/${props.projectId}/train` },
  { key: "export" as const, label: t("talk_steps.export"), to: `/talks/${props.projectId}/export` },
]);
</script>

<template>
  <SectionPanel variant="compact">
    <nav class="flex flex-wrap items-center gap-2" :aria-label="t('talk_steps.aria')">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.key"
        :to="tab.to"
        class="app-top-tab app-focus-ring app-button-md inline-flex items-center transition"
        :class="tab.key === active ? 'app-top-tab-active' : ''"
      >
        {{ tab.label }}
      </RouterLink>
    </nav>
  </SectionPanel>
</template>
