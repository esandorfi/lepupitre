<script setup lang="ts">
import type { MascotMessage } from "@/schemas/ipc";
import { useI18n } from "@/lib/i18n";

const props = defineProps<{
  message: MascotMessage;
  body: string;
}>();

const { t } = useI18n();

function toneClass(kind: string | null | undefined) {
  if (kind === "celebrate") {
    return "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_15%,var(--color-surface))]";
  }
  if (kind === "nudge") {
    return "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent-soft)_35%,var(--color-surface))]";
  }
  return "border-[var(--color-border)] bg-[var(--color-surface-elevated)]";
}
</script>

<template>
  <UCard class="app-panel app-panel-compact border" :class="toneClass(props.message.kind)" variant="outline">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="app-text-eyebrow">{{ t("feedback.mascot_label") }}</div>
        <div class="app-text app-text-subheadline mt-1">{{ props.message.title }}</div>
        <div v-if="props.body" class="app-muted app-text-body mt-1">{{ props.body }}</div>
      </div>
      <UButton
        v-if="props.message.cta_route && props.message.cta_label"
        size="md"
        :to="props.message.cta_route"
        color="neutral"
        variant="outline"
      >
        {{ props.message.cta_label }}
      </UButton>
    </div>
  </UCard>
</template>
