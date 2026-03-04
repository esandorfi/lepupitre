<script setup lang="ts">
const DIALOG_UI = {
  body: "p-5",
  content: "app-dialog rounded-2xl border shadow-xl",
  description: "app-muted mt-2 text-sm",
  footer: "p-5 pt-0 flex flex-wrap justify-end gap-2",
  header: "p-5 pb-0",
  overlay: "app-dialog-overlay",
  title: "app-text text-base font-semibold",
} as const;

withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    body?: string;
    confirmLabel: string;
    cancelLabel: string;
    confirmVariant?: "primary" | "danger";
    busy?: boolean;
  }>(),
  {
    body: "",
    confirmVariant: "primary",
    busy: false,
  }
);

const emit = defineEmits<{
  cancel: [];
  confirm: [];
}>();

function onOpenChange(nextOpen: boolean) {
  if (!nextOpen) {
    emit("cancel");
  }
}
</script>

<template>
  <UModal
    :close="false"
    :description="body || undefined"
    :dismissible="!busy"
    :open="open"
    :title="title"
    :ui="DIALOG_UI"
    @update:open="onOpenChange"
  >
    <template #footer>
      <UButton autofocus :disabled="busy" size="md" color="neutral" variant="outline" @click="emit('cancel')">
        {{ cancelLabel }}
      </UButton>
      <UButton
        :disabled="busy"
        :loading="busy"
        size="md"
        :color="confirmVariant === 'danger' ? 'error' : 'primary'"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </UButton>
    </template>
  </UModal>
</template>
