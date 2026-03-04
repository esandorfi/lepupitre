<script setup lang="ts">
import type { ResolvedPrimaryNavItem } from "@/lib/navigation";

defineProps<{
  items: ResolvedPrimaryNavItem[];
}>();

const emit = defineEmits<{
  (event: "navigate-intent", payload: { source: "top"; itemId: string }): void;
}>();
</script>

<template>
  <div class="app-top-nav-strip shrink-0 border-b">
    <div class="app-container px-4 py-2 sm:px-6">
      <nav class="app-nav-text flex flex-wrap items-center gap-2" aria-label="Primary">
        <template v-for="item in items" :key="item.id">
          <RouterLink
            v-if="!item.disabled"
            class="app-top-tab app-focus-ring rounded-full px-3 py-2 transition"
            :class="{ 'app-top-tab-active': item.active }"
            :to="item.to"
            @click="emit('navigate-intent', { source: 'top', itemId: item.id })"
          >
            <span class="inline-flex items-center gap-2">
              <span>{{ item.label }}</span>
              <UBadge
                v-if="item.badge !== null"
               
                size="sm"
                as="span"
                class="min-w-5 justify-center px-1.5 py-0.5"
               color="neutral" variant="solid">
                {{ item.badge }}
              </UBadge>
            </span>
          </RouterLink>
          <UButton
            v-else
           
            size="md"
            class="app-top-tab app-top-tab-disabled rounded-full px-3 py-2 transition"
            disabled
           color="neutral" variant="ghost">
            {{ item.label }}
          </UButton>
        </template>
      </nav>
    </div>
  </div>
</template>
