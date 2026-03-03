<script setup lang="ts">
defineOptions({
  name: "AppRange",
  inheritAttrs: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: number];
  input: [value: number];
}>();

const props = withDefaults(
  defineProps<{
    min?: string | number;
    max?: string | number;
    step?: string | number;
    modelValue?: number;
    disabled?: boolean;
  }>(),
  {
    min: 0,
    max: 100,
    step: 1,
    modelValue: 0,
    disabled: false,
  }
);

function onUpdateModelValue(value: number | number[] | undefined) {
  const nextValue = Array.isArray(value) ? value[0] : value;
  if (typeof nextValue !== "number" || Number.isNaN(nextValue)) {
    return;
  }
  emit("update:modelValue", nextValue);
  emit("input", nextValue);
}
</script>

<template>
  <USlider
    class="w-full"
    :min="props.min"
    :max="props.max"
    :step="props.step"
    :model-value="props.modelValue"
    :disabled="props.disabled"
    v-bind="$attrs"
    @update:model-value="onUpdateModelValue"
  />
</template>
