<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useI18n } from "../../lib/i18n";

const { t } = useI18n();

const supportsWindowControls = computed(() => isTauri());

async function runWindowAction(action: "minimize" | "maximize" | "close") {
  if (!supportsWindowControls.value) {
    return;
  }
  const appWindow = getCurrentWindow();
  try {
    if (action === "minimize") {
      await appWindow.minimize();
      return;
    }
    if (action === "maximize") {
      await appWindow.toggleMaximize();
      return;
    }
    await appWindow.close();
  } catch (err) {
    console.error("window action failed", action, err);
  }
}
</script>

<template>
  <header class="app-window-chrome shrink-0 border-b">
    <div class="app-container px-4 sm:px-6">
      <div class="flex h-[var(--shell-chrome-height)] items-center gap-3">
        <RouterLink
          class="app-toolbar-link app-focus-ring rounded-lg px-1 py-1 text-sm font-bold tracking-[0.22em] uppercase"
          to="/"
        >
          LE PUPITRE
        </RouterLink>

        <div class="min-w-0 flex-1" data-tauri-drag-region></div>

        <div class="flex items-center gap-2">
          <slot />

          <div v-if="supportsWindowControls" class="ml-1 flex items-center gap-1">
            <button
              class="app-window-action app-focus-ring inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md"
              type="button"
              :aria-label="t('shell.window_minimize')"
              @click="runWindowAction('minimize')"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14" />
              </svg>
            </button>
            <button
              class="app-window-action app-focus-ring inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md"
              type="button"
              :aria-label="t('shell.window_maximize')"
              @click="runWindowAction('maximize')"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="5" y="5" width="14" height="14" rx="1" />
              </svg>
            </button>
            <button
              class="app-window-action app-window-action-danger app-focus-ring inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md"
              type="button"
              :aria-label="t('shell.window_close')"
              @click="runWindowAction('close')"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
