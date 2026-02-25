<script setup lang="ts">
import { computed, useSlots } from "vue";

defineProps<{
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}>();

const slots = useSlots();
const hasActions = computed(() => Boolean(slots.actions));
const hasMeta = computed(() => Boolean(slots.meta));
</script>

<template>
  <div class="app-panel" :class="compact ? 'app-panel-compact' : ''">
    <div class="app-page-header">
      <div class="app-page-header-main">
        <div v-if="eyebrow" class="app-text-eyebrow">{{ eyebrow }}</div>
        <slot name="title">
          <div v-if="title" class="app-text app-text-page-title" :class="eyebrow ? 'mt-2' : ''">
            {{ title }}
          </div>
        </slot>
        <slot name="subtitle">
          <p v-if="subtitle" class="app-muted app-text-body mt-2">{{ subtitle }}</p>
        </slot>
        <div v-if="hasMeta" class="app-page-header-meta app-muted app-text-meta">
          <slot name="meta" />
        </div>
      </div>
      <div v-if="hasActions" class="app-page-header-actions">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
