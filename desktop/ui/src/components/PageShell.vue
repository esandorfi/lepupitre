<script setup lang="ts">
defineProps<{
  compact?: boolean;
}>();
</script>

<template>
  <section class="app-page-shell" :class="{ 'app-page-shell-compact': compact }">
    <slot />
  </section>
</template>
