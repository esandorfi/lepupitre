<script setup lang="ts">
import PageHeader from "./PageHeader.vue";
import PageShell from "./PageShell.vue";
import TalkStepTabs from "./TalkStepTabs.vue";

defineProps<{
  projectId: string;
  active: "define" | "builder" | "train" | "export";
  eyebrow: string;
  title: string;
  subtitle?: string;
}>();
</script>

<template>
  <PageShell>
    <TalkStepTabs v-if="projectId" :project-id="projectId" :active="active" />
    <PageHeader :eyebrow="eyebrow" :title="title" :subtitle="subtitle">
      <template v-if="$slots.meta" #meta>
        <slot name="meta" />
      </template>
      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </PageHeader>
    <slot />
  </PageShell>
</template>
