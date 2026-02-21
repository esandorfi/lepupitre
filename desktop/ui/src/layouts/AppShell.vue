<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "../lib/i18n";
import { useTheme } from "../lib/theme";
import packageJson from "../../package.json";

const { locale, setLocale, t } = useI18n();
const { theme, setTheme, nextTheme } = useTheme();

const themeLabel = computed(() => t(`theme.${theme.value}`));
const appVersion = packageJson.version as string;

function toggleLocale() {
  setLocale(locale.value === "fr" ? "en" : "fr");
}

function cycleTheme() {
  setTheme(nextTheme(theme.value));
}
</script>

<template>
  <div class="app-shell min-h-screen">
    <header class="app-toolbar border-b px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="app-toolbar-muted text-xs font-bold uppercase tracking-[0.3em]">
            Le Pupitre
          </div>
          <div class="app-toolbar-muted text-[10px] font-semibold">v{{ appVersion }}</div>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="app-toolbar-button cursor-pointer rounded-full border px-3 py-1 text-xs transition"
            type="button"
            @click="cycleTheme"
          >
            {{ t("theme.label") }}: {{ themeLabel }}
          </button>
          <button
            class="app-toolbar-button cursor-pointer rounded-full border px-3 py-1 text-xs transition"
            type="button"
            @click="toggleLocale"
          >
            {{ locale.toUpperCase() }}
          </button>
        </div>
      </div>
      <nav class="mt-3 flex flex-wrap gap-3 text-xs">
        <RouterLink
          class="app-toolbar-link app-pill rounded-full px-3 py-1 transition"
          exact-active-class="app-pill-active font-semibold"
          to="/"
        >
          {{ t("nav.home") }}
        </RouterLink>
        <RouterLink
          class="app-toolbar-link app-pill rounded-full px-3 py-1 transition"
          exact-active-class="app-pill-active font-semibold"
          to="/project/new"
        >
          {{ t("nav.talk") }}
        </RouterLink>
        <RouterLink
          class="app-toolbar-link app-pill rounded-full px-3 py-1 transition"
          exact-active-class="app-pill-active font-semibold"
          to="/profiles"
        >
          {{ t("nav.profiles") }}
        </RouterLink>
      </nav>
    </header>
    <main class="px-6 py-6">
      <slot />
    </main>
  </div>
</template>
