<script setup lang="ts">
import { computed } from "vue";

defineOptions({
  name: "AppPanel",
  inheritAttrs: false,
});

type AppPanelVariant = "default" | "compact" | "hero" | "dense-list";

const props = withDefaults(
  defineProps<{
    variant?: AppPanelVariant;
    as?: string | Record<string, unknown>;
  }>(),
  {
    variant: "default",
    as: "section",
  }
);

const PANEL_BASE_CLASS = "app-panel";
const PANEL_VARIANTS: Record<AppPanelVariant, string> = {
  default: "",
  compact: "app-panel-compact",
  hero: "app-panel-hero",
  "dense-list": "app-panel-dense-list",
};

const panelClass = computed(() => {
  return [
    PANEL_BASE_CLASS,
    PANEL_VARIANTS[props.variant],
  ];
});

const panelUi = {
  body: "p-0 sm:p-0",
  footer: "p-0",
  header: "p-0",
} as const;
</script>

<template>
  <UCard :as="as" variant="outline" :class="panelClass" :ui="panelUi" v-bind="$attrs">
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>
    <slot />
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </UCard>
</template>
