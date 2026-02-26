<script setup lang="ts">
import type { ContextBreadcrumb } from "../../lib/navigation";

defineProps<{
  items: ContextBreadcrumb[];
}>();
</script>

<template>
  <div v-if="items.length > 0" class="mb-4">
    <div class="app-surface rounded-xl border px-3 py-2 shadow-sm">
      <UBreadcrumb
        class="app-breadcrumb app-nav-text"
        separator-icon="i-lucide-arrow-right"
        :items="items"
      />
    </div>
  </div>
</template>
