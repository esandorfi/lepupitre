<script setup lang="ts">
import { useI18n } from "../lib/i18n";

const { locale, setLocale, t } = useI18n();

function toggleLocale() {
  setLocale(locale.value === "fr" ? "en" : "fr");
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <header class="border-b border-slate-800 px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="text-xs uppercase tracking-[0.3em] text-slate-400">Le Pupitre</div>
        <button
          class="cursor-pointer rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:text-slate-100"
          type="button"
          @click="toggleLocale"
        >
          {{ locale.toUpperCase() }}
        </button>
      </div>
      <nav class="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
        <RouterLink class="hover:text-slate-100" to="/">{{ t("nav.home") }}</RouterLink>
        <RouterLink class="hover:text-slate-100" to="/project/new">
          {{ t("nav.talk") }}
        </RouterLink>
        <RouterLink class="hover:text-slate-100" to="/profiles">
          {{ t("nav.profiles") }}
        </RouterLink>
      </nav>
    </header>
    <main class="px-6 py-6">
      <slot />
    </main>
  </div>
</template>
