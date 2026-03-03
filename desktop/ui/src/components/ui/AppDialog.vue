<script setup lang="ts">
defineOptions({
  name: "AppDialog",
  inheritAttrs: false,
});

withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    description?: string;
    dismissible?: boolean;
    fullscreen?: boolean;
    close?: boolean | Record<string, unknown>;
  }>(),
  {
    title: "",
    description: "",
    dismissible: true,
    fullscreen: false,
    close: false,
  }
);

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

function onUpdateOpen(value: boolean) {
  emit("update:open", value);
}

const modalUi = {
  body: "p-5",
  content: "app-dialog rounded-2xl border shadow-xl",
  description: "app-muted mt-2 text-sm",
  footer: "p-5 pt-0 flex flex-wrap justify-end gap-2",
  header: "p-5 pb-0",
  overlay: "app-dialog-overlay",
  title: "app-text text-base font-semibold",
} as const;
</script>

<template>
  <UModal
    :close="close"
    :description="description || undefined"
    :dismissible="dismissible"
    :fullscreen="fullscreen"
    :open="open"
    :title="title || undefined"
    :ui="modalUi"
    v-bind="$attrs"
    @update:open="onUpdateOpen"
  >
    <template #body>
      <slot />
    </template>
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </UModal>
</template>
