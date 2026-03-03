<script setup lang="ts">
import { computed } from "vue";

defineOptions({
  name: "AppBadge",
  inheritAttrs: false,
});

type AppBadgeTone = "neutral" | "success" | "danger" | "accent";
type AppBadgeSize = "sm" | "md";

const props = withDefaults(
  defineProps<{
    tone?: AppBadgeTone;
    size?: AppBadgeSize;
    as?: string | Record<string, unknown>;
    label?: string | number;
    square?: boolean;
  }>(),
  {
    tone: "neutral",
    size: "sm",
    as: "span",
    square: false,
  }
);

const toneClassByTone: Record<AppBadgeTone, string> = {
  neutral: "app-badge-neutral",
  success: "app-badge-success",
  danger: "app-badge-danger",
  accent: "app-badge-accent",
};

const sizeClassBySize: Record<AppBadgeSize, string> = {
  sm: "app-text-caption px-2 py-1",
  md: "app-text-meta px-2.5 py-1",
};

const badgeClass = computed(() => {
  return [
    "inline-flex items-center rounded-full font-semibold",
    toneClassByTone[props.tone],
    sizeClassBySize[props.size],
  ];
});
</script>

<template>
  <UBadge
    :as="as"
    color="neutral"
    :label="label"
    :square="square"
    variant="solid"
    :class="badgeClass"
    v-bind="$attrs"
  >
    <slot />
  </UBadge>
</template>
