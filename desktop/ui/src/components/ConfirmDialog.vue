<script setup lang="ts">
import AppButton from "./ui/AppButton.vue";
import AppDialog from "./ui/AppDialog.vue";

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
  <AppDialog
    :close="false"
    :description="body || undefined"
    :dismissible="!busy"
    :open="open"
    :title="title"
    @update:open="onOpenChange"
  >
    <template #footer>
      <AppButton autofocus :disabled="busy" size="md" tone="secondary" @click="emit('cancel')">
        {{ cancelLabel }}
      </AppButton>
      <AppButton
        :disabled="busy"
        :loading="busy"
        size="md"
        :tone="confirmVariant === 'danger' ? 'danger' : 'primary'"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </AppButton>
    </template>
  </AppDialog>
</template>
