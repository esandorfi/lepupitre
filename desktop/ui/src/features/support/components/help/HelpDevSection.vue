<script setup lang="ts">
defineProps<{
  t: (key: string) => string;
}>();
</script>

<template>
  <UCard class="app-panel" variant="outline">
    <h2 class="app-text text-base font-semibold">{{ t("help.dev_title") }}</h2>
    <p class="app-muted mt-2 text-sm leading-6">{{ t("help.dev_subtitle") }}</p>
    <div class="mt-3 grid gap-3 lg:grid-cols-2">
      <UCard as="article" class="app-panel app-panel-compact app-radius-panel-lg" variant="outline">
        <h3 class="app-text text-sm font-semibold">{{ t("help.dev_ui_only_title") }}</h3>
        <p class="app-muted mt-2 text-sm">{{ t("help.dev_ui_only_body") }}</p>
        <pre class="app-radius-panel-md mt-3 overflow-x-auto border bg-[var(--color-surface-elevated)] p-3 text-xs">{{ t("help.dev_ui_only_command") }}</pre>
      </UCard>
      <UCard as="article" class="app-panel app-panel-compact app-radius-panel-lg" variant="outline">
        <h3 class="app-text text-sm font-semibold">{{ t("help.dev_tauri_title") }}</h3>
        <p class="app-muted mt-2 text-sm">{{ t("help.dev_tauri_body") }}</p>
        <pre class="app-radius-panel-md mt-3 overflow-x-auto border bg-[var(--color-surface-elevated)] p-3 text-xs">{{ t("help.dev_tauri_command") }}</pre>
      </UCard>
    </div>
  </UCard>
</template>
