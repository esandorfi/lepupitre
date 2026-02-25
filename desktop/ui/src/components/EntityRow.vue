<script setup lang="ts">
import { useSlots } from "vue";

withDefaults(
  defineProps<{
    interactive?: boolean;
    selected?: boolean;
  }>(),
  {
    interactive: false,
    selected: false,
  }
);

const slots = useSlots();
</script>

<template>
  <div
    class="app-entity-row"
    :class="{
      'app-entity-row-interactive': interactive,
      'border-[var(--color-accent)] bg-[var(--color-surface-selected)]': selected,
    }"
  >
    <div v-if="$slots.main" class="app-entity-row-main">
      <slot name="main" />
    </div>
    <div v-else class="app-entity-row-main">
      <slot />
    </div>
    <div v-if="slots.right || slots.actions || slots.meta" class="app-entity-row-right">
      <slot name="meta" />
      <slot name="actions" />
      <slot name="right" />
    </div>
  </div>
</template>
