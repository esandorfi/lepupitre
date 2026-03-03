<script setup lang="ts">
defineOptions({
  name: "AppRange",
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    min?: string | number;
    max?: string | number;
    step?: string | number;
    value?: string | number;
    disabled?: boolean;
  }>(),
  {
    min: 0,
    max: 100,
    step: 1,
    value: 0,
    disabled: false,
  }
);
</script>

<template>
  <input
    class="w-full accent-[var(--color-accent)] disabled:opacity-60"
    type="range"
    :min="props.min"
    :max="props.max"
    :step="props.step"
    :value="props.value"
    :disabled="props.disabled"
    v-bind="$attrs"
  />
</template>
