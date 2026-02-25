<script setup lang="ts">
import { computed, useSlots } from "vue";

const props = withDefaults(
  defineProps<{
    variant?: "compact" | "default" | "dense-list";
    title?: string;
    subtitle?: string;
    eyebrow?: string;
  }>(),
  {
    variant: "default",
  }
);

const slots = useSlots();
const hasHeader = computed(
  () => Boolean(props.title || props.subtitle || props.eyebrow || slots["header-actions"])
);
</script>

<template>
  <div
    class="app-panel"
    :class="{
      'app-panel-compact': variant === 'compact',
      'app-panel-dense-list': variant === 'dense-list',
    }"
  >
    <div v-if="hasHeader" class="app-section-header">
      <div class="app-section-header-main">
        <div v-if="eyebrow" class="app-text-eyebrow">{{ eyebrow }}</div>
        <div v-if="title" class="app-text app-text-section-title" :class="eyebrow ? 'mt-2' : ''">
          {{ title }}
        </div>
        <p v-if="subtitle" class="app-muted app-text-body mt-2">{{ subtitle }}</p>
      </div>
      <div v-if="$slots['header-actions']" class="app-page-header-actions">
        <slot name="header-actions" />
      </div>
    </div>
    <div :class="hasHeader ? 'mt-3' : ''">
      <slot />
    </div>
  </div>
</template>
