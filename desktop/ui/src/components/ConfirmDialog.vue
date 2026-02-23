<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";

const props = withDefaults(
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

const cancelButton = ref<HTMLButtonElement | null>(null);

function onKeydown(event: KeyboardEvent) {
  if (!props.open) {
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    emit("cancel");
  }
}

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      return;
    }
    await nextTick();
    cancelButton.value?.focus();
  }
);

watch(
  () => props.open,
  (open) => {
    if (typeof document === "undefined") {
      return;
    }
    if (open) {
      document.addEventListener("keydown", onKeydown);
    } else {
      document.removeEventListener("keydown", onKeydown);
    }
  }
);

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        class="app-dialog-overlay absolute inset-0"
        type="button"
        tabindex="-1"
        aria-hidden="true"
        @click="emit('cancel')"
      ></button>
      <div
        class="app-dialog relative z-10 w-full max-w-md rounded-2xl border p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <h2 id="confirm-dialog-title" class="app-text text-base font-semibold">
          {{ title }}
        </h2>
        <p v-if="body" class="app-muted mt-2 text-sm">
          {{ body }}
        </p>
        <div class="mt-5 flex flex-wrap justify-end gap-2">
          <button
            ref="cancelButton"
            class="app-button-secondary cursor-pointer rounded-full px-4 py-2 text-sm font-semibold"
            type="button"
            :disabled="busy"
            @click="emit('cancel')"
          >
            {{ cancelLabel }}
          </button>
          <button
            class="cursor-pointer rounded-full px-4 py-2 text-sm font-semibold"
            :class="confirmVariant === 'danger' ? 'app-button-danger' : 'app-button-primary'"
            type="button"
            :disabled="busy"
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
