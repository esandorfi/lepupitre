<script setup lang="ts">
import SectionPanel from "@/components/SectionPanel.vue";
import { useI18n } from "@/lib/i18n";
import type { MascotMessage } from "@/schemas/ipc";
import { mascotToneClass } from "@/features/talks/composables/talksPage/talksPageHelpers";

const { t } = useI18n();

defineProps<{
  show: boolean;
  message: MascotMessage | null;
  body: string;
}>();
</script>

<template>
  <SectionPanel
    v-if="show && message"
    variant="compact"
    class="border"
    :class="mascotToneClass(message.kind)"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="app-text-eyebrow">{{ t("talks.mascot_label") }}</div>
        <div class="app-text app-text-subheadline mt-1">{{ message.title }}</div>
        <div v-if="body" class="app-body-muted mt-1">{{ body }}</div>
      </div>
      <UButton
        v-if="message.cta_route && message.cta_label"
        :to="message.cta_route"
      >
        {{ message.cta_label }}
      </UButton>
    </div>
  </SectionPanel>
</template>
