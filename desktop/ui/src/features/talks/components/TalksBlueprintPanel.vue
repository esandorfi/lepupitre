<script setup lang="ts">
import { RouterLink } from "vue-router";
import SectionPanel from "@/components/SectionPanel.vue";
import { useI18n } from "@/lib/i18n";
import type { TalksBlueprint } from "@/schemas/ipc";
import {
  blueprintPercentClass,
  blueprintStepClass,
} from "@/features/talks/composables/talksPage/talksPageHelpers";

const { t } = useI18n();

defineProps<{
  hasActiveProfile: boolean;
  hasActiveProject: boolean;
  isLoading: boolean;
  blueprint: TalksBlueprint | null;
}>();
</script>

<template>
  <SectionPanel v-if="hasActiveProfile && hasActiveProject" variant="compact" class="border">
    <div v-if="isLoading" class="app-meta-muted">
      {{ t("talks.loading") }}
    </div>
    <div v-else-if="blueprint" class="space-y-3">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div class="app-text-eyebrow">{{ t("talks.blueprint_label") }}</div>
          <div class="app-text app-text-subheadline mt-1">{{ blueprint.framework_label }}</div>
          <div class="app-body-muted mt-1">{{ blueprint.framework_summary }}</div>
        </div>
        <UBadge>
          {{ blueprint.completion_percent }}%
        </UBadge>
      </div>

      <div class="h-2 overflow-hidden rounded-full app-meter-bg">
        <div
          class="h-full rounded-full transition-all"
          :class="blueprintPercentClass(blueprint.completion_percent)"
          :style="{ width: `${blueprint.completion_percent}%` }"
        ></div>
      </div>

      <div class="space-y-2">
        <div
          v-for="step in blueprint.steps"
          :key="step.id"
          class="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2"
          :class="blueprintStepClass(step.done)"
        >
          <div class="min-w-0 flex-1">
            <div class="app-text app-text-body-strong">{{ step.title }}</div>
            <div class="app-meta-muted mt-1">
              +{{ step.reward_credits }} {{ t("training.progress_credits") }}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UBadge :color="step.done ? 'success' : 'neutral'">
              {{ step.done ? t("talks.blueprint_done") : t("talks.blueprint_pending") }}
            </UBadge>
            <RouterLink
              v-if="!step.done && step.cta_route"
              class="app-link-meta underline"
              :to="step.cta_route"
            >
              {{ t("talks.blueprint_open") }}
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </SectionPanel>
</template>
