<script setup lang="ts">
import type { PrimaryNavIcon, ResolvedPrimaryNavItem } from "../../lib/navigation";

defineProps<{
  items: ResolvedPrimaryNavItem[];
}>();

const emit = defineEmits<{
  (event: "navigate-intent", payload: { source: "sidebar-icon"; itemId: string }): void;
}>();

function iconPath(icon: PrimaryNavIcon): string {
  switch (icon) {
    case "training":
      return "M3 11.5 12 4l9 7.5M5.5 10.5V20h13v-9.5";
    case "quick-record":
      return "M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8Zm0 10v3m-3 0h6";
    case "talks":
      return "M4 6h16M4 12h16M4 18h16";
    case "feedback":
      return "M5 5h14v10H8l-3 4V5z";
    case "current-talk":
    default:
      return "M12 3a7 7 0 0 0-7 7v2a7 7 0 0 0 14 0v-2a7 7 0 0 0-7-7Zm-3 17h6";
  }
}
</script>

<template>
  <aside class="app-sidebar shrink-0 border-r">
    <div class="flex h-full w-[var(--shell-sidebar-width)] flex-col items-center gap-3 py-4">
      <nav class="flex w-full flex-col items-center gap-2 px-2" aria-label="Primary">
        <template v-for="item in items" :key="item.id">
          <div class="group relative flex w-full justify-center">
            <RouterLink
              v-if="!item.disabled"
              class="app-sidebar-nav-button app-focus-ring inline-flex h-11 w-11 items-center justify-center rounded-xl border transition"
              :class="{ 'app-sidebar-nav-button-active': item.active }"
              :to="item.to"
              :aria-label="item.label"
              @click="emit('navigate-intent', { source: 'sidebar-icon', itemId: item.id })"
            >
              <span class="relative inline-flex h-5 w-5 items-center justify-center">
                <svg
                  class="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.9"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path :d="iconPath(item.icon)" />
                </svg>
                <span
                  v-if="item.badge !== null"
                  class="app-badge-neutral app-text-caption absolute -top-2 -right-2 inline-flex min-w-4 items-center justify-center rounded-full px-1 py-0.5 leading-none"
                >
                  {{ item.badge }}
                </span>
              </span>
            </RouterLink>
            <button
              v-else
              class="app-sidebar-nav-button app-sidebar-nav-button-disabled inline-flex h-11 w-11 items-center justify-center rounded-xl border"
              type="button"
              :aria-label="item.label"
              disabled
            >
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.9"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path :d="iconPath(item.icon)" />
              </svg>
            </button>
            <span
              class="app-sidebar-tooltip pointer-events-none absolute left-[calc(100%+0.65rem)] top-1/2 z-30 -translate-y-1/2 whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold opacity-0 shadow-md transition group-hover:opacity-100 group-focus-within:opacity-100"
            >
              {{ item.label }}
            </span>
          </div>
        </template>
      </nav>
    </div>
  </aside>
</template>
