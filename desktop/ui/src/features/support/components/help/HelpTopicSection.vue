<script setup lang="ts">
/* eslint-disable vue/no-v-html */
import { RouterLink } from "vue-router";
import type { RouteLocationRaw } from "vue-router";

type HelpEntry = {
  id: string;
  title: string;
  html: string;
};

defineProps<{
  t: (key: string) => string;
  title: string;
  subtitle: string;
  entries: HelpEntry[];
  unknownTopic?: boolean;
  topicDomId: (topicId: string) => string;
  topicCardStyle: (topicId: string) => Record<string, string> | undefined;
  topicDeepLink: (topicId: string) => RouteLocationRaw;
  gridClass?: string;
}>();
</script>

<template>
  <UCard class="app-panel space-y-4" variant="outline">
    <div>
      <h2 class="app-text text-base font-semibold">{{ title }}</h2>
      <p class="app-muted mt-1 text-sm">{{ subtitle }}</p>
    </div>
    <p v-if="unknownTopic" class="app-muted text-sm">{{ t("help.contextual_unknown_topic") }}</p>
    <div :class="gridClass || 'grid gap-3'">
      <UCard
        v-for="entry in entries"
        :id="topicDomId(entry.id)"
        :key="entry.id"
        as="article"
        class="app-panel app-panel-compact app-radius-panel-lg transition-colors"
        :style="topicCardStyle(entry.id)"
        variant="outline"
      >
        <h3 class="app-text text-sm font-semibold">{{ entry.title }}</h3>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="app-markdown app-muted mt-2 text-sm leading-6" v-html="entry.html" />
        <RouterLink
          class="app-link app-text-meta mt-3 inline-block underline"
          :to="topicDeepLink(entry.id)"
        >
          {{ t("help.open_deep_link") }}
        </RouterLink>
      </UCard>
    </div>
  </UCard>
</template>
