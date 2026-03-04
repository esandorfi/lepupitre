<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "@/lib/i18n";
import type { Quest } from "@/schemas/ipc";

const props = defineProps<{
  quest: Quest;
  selected: boolean;
  active: boolean;
  projectId: string | null;
  questCodeLabel: (code: string) => string;
  outputLabel: (outputType: string) => string;
  estimatedMinutesLabel: (seconds: number) => number;
}>();

const emit = defineEmits<{
  (event: "select", quest: Quest): void;
  (event: "close"): void;
}>();

const { t } = useI18n();

function questRoute(code: string) {
  if (!props.projectId) {
    return "/training";
  }
  return `/quest/${code}?projectId=${props.projectId}&from=training`;
}

const rowClass = computed(() => [
  "border transition",
  props.selected
    ? "border-[var(--color-accent)] bg-[var(--color-surface-selected)]"
    : "border-[var(--app-border)] hover:bg-[var(--color-surface-elevated)]",
  props.active ? "outline outline-1 outline-[var(--color-accent)]" : "",
]);

const rowUi = {
  body: "p-0",
  footer: "p-0",
  header: "p-0",
} as const;
</script>

<template>
  <UCard
    as="article"
    variant="outline"
    :class="rowClass"
    :data-quest-code="props.quest.code"
    :aria-selected="props.active"
    role="option"
    :ui="rowUi"
    @click="emit('select', props.quest)"
  >
    <div class="flex flex-wrap items-start justify-between gap-2 px-3 py-2">
      <div class="min-w-0 flex-1">
        <div class="app-text text-sm font-semibold">{{ props.quest.title }}</div>
        <div class="app-muted mt-1 line-clamp-2 text-xs">{{ props.quest.prompt }}</div>
        <div class="mt-2 flex flex-wrap items-center gap-2 app-text-caption">
          <UBadge color="neutral" variant="solid">
            {{ props.questCodeLabel(props.quest.code) }}
          </UBadge>
          <UBadge color="neutral" variant="solid">
            {{ props.outputLabel(props.quest.output_type) }}
          </UBadge>
          <UBadge color="neutral" variant="solid">
            {{ props.estimatedMinutesLabel(props.quest.estimated_sec) }} {{ t("talks.minutes") }}
          </UBadge>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <RouterLink
          data-quest-row-action
          class="app-link app-text-meta underline"
          :to="questRoute(props.quest.code)"
          @click.stop="emit('close')"
        >
          {{ t("training.quest_start_now") }}
        </RouterLink>
        <UBadge v-if="props.selected" color="success" variant="solid">
          {{ t("training.quest_selected") }}
        </UBadge>
        <span class="app-subtle app-text-meta font-semibold">{{ props.quest.category }}</span>
      </div>
    </div>
  </UCard>
</template>
