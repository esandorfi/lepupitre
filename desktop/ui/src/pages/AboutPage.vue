<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "../lib/i18n";
import { renderMarkdown } from "../lib/markdown";
import packageJson from "../../package.json";
import readmeRaw from "../../../../README.md?raw";

const { t } = useI18n();
const appVersion = packageJson.version as string;

const readmeIntro = computed(() => {
  const endMarker = "\n## 3)";
  const endIndex = readmeRaw.indexOf(endMarker);
  const excerpt = endIndex >= 0 ? readmeRaw.slice(0, endIndex) : readmeRaw;
  return excerpt.trim();
});
const readmeIntroHtml = computed(() => renderMarkdown(readmeIntro.value));
</script>

<template>
  <section class="space-y-6">
    <header>
      <h1 class="app-text text-2xl font-semibold tracking-tight">{{ t("about.title") }}</h1>
      <p class="app-muted mt-1 text-sm">{{ t("about.subtitle") }}</p>
    </header>

    <div class="app-card rounded-2xl border p-4">
      <div class="app-subtle text-xs font-semibold uppercase tracking-[0.2em]">
        {{ t("settings.about.version") }}
      </div>
      <div class="app-text mt-2 text-lg font-semibold">Le Pupitre</div>
      <div class="app-muted text-sm">v{{ appVersion }}</div>
    </div>

    <div class="app-surface rounded-2xl border p-4">
      <div class="app-subtle text-xs font-semibold uppercase tracking-[0.2em]">
        {{ t("about.readme_intro") }}
      </div>
      <div class="app-markdown app-text mt-3 text-sm leading-6" v-html="readmeIntroHtml"></div>
    </div>
  </section>
</template>
