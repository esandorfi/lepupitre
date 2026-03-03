<script setup lang="ts">
import { computed } from "vue";

defineOptions({
  name: "AppButton",
  inheritAttrs: false,
});

type AppButtonTone = "primary" | "secondary" | "ghost" | "danger" | "success" | "info" | "danger-soft";
type AppButtonSize = "sm" | "md" | "lg" | "icon-sm" | "icon-md" | "icon-xl";

const props = withDefaults(
  defineProps<{
    tone?: AppButtonTone;
    size?: AppButtonSize;
    block?: boolean;
    square?: boolean;
    disabled?: boolean;
    external?: boolean;
    href?: string;
    label?: string;
    loading?: boolean;
    onClick?: ((event: MouseEvent) => void | Promise<void>) | Array<((event: MouseEvent) => void | Promise<void>)>;
    rel?: string;
    target?: string;
    to?: string | Record<string, unknown>;
    type?: "button" | "submit" | "reset";
  }>(),
  {
    tone: "secondary",
    size: "md",
    block: false,
    square: false,
    disabled: false,
    loading: false,
    type: "button",
  }
);

const toneClassByTone: Record<AppButtonTone, string> = {
  primary: "app-button-primary",
  secondary: "app-button-secondary",
  ghost: "app-button-ghost",
  danger: "app-button-danger",
  success: "app-button-success",
  info: "app-button-info",
  "danger-soft": "app-button-danger-soft",
};

const sizeClassBySize: Record<AppButtonSize, string> = {
  sm: "app-button-sm",
  md: "app-button-md",
  lg: "app-button-lg",
  "icon-sm": "app-icon-button-sm",
  "icon-md": "app-icon-button-md",
  "icon-xl": "app-icon-button-xl",
};

const nuxtSize = computed<"sm" | "md" | "lg">(() => {
  if (props.size === "sm" || props.size === "icon-sm") {
    return "sm";
  }
  if (props.size === "lg") {
    return "lg";
  }
  return "md";
});

const buttonClass = computed(() => {
  return [
    "app-focus-ring inline-flex items-center justify-center cursor-pointer font-semibold transition",
    toneClassByTone[props.tone],
    sizeClassBySize[props.size],
    props.square || props.size.startsWith("icon-") ? "p-0" : "",
  ];
});
</script>

<template>
  <UButton
    :block="block"
    color="neutral"
    :disabled="disabled"
    :external="external"
    :href="href"
    :label="label"
    :loading="loading"
    :on-click="onClick"
    :rel="rel"
    variant="solid"
    :size="nuxtSize"
    :square="square || size.startsWith('icon-')"
    :target="target"
    :to="to"
    :type="type"
    :class="buttonClass"
    v-bind="$attrs"
  >
    <slot />
  </UButton>
</template>
