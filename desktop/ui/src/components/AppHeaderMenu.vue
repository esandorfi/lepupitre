<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "../lib/i18n";
import { useTheme } from "../lib/theme";

const { locale, setLocale, t } = useI18n();
const { theme, setTheme } = useTheme();
const router = useRouter();

const open = ref(false);
const triggerRef = ref<HTMLButtonElement | null>(null);
const panelRef = ref<HTMLDivElement | null>(null);

function closePanel() {
  open.value = false;
  nextTick(() => {
    triggerRef.value?.focus();
  });
}

function togglePanel() {
  open.value = !open.value;
}

async function goTo(path: string) {
  await router.push(path);
  closePanel();
}

async function goToAbout() {
  await router.push("/about");
  closePanel();
}

function updateTheme(next: "orange" | "terminal") {
  setTheme(next);
}

function updateLocale(next: "fr" | "en") {
  setLocale(next);
}

function onDocumentMouseDown(event: MouseEvent) {
  if (!open.value) {
    return;
  }
  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }
  if (panelRef.value?.contains(target) || triggerRef.value?.contains(target)) {
    return;
  }
  closePanel();
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (!open.value) {
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closePanel();
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("mousedown", onDocumentMouseDown);
  document.addEventListener("keydown", onDocumentKeydown);
}

onBeforeUnmount(() => {
  if (typeof document !== "undefined") {
    document.removeEventListener("mousedown", onDocumentMouseDown);
    document.removeEventListener("keydown", onDocumentKeydown);
  }
});
</script>

<template>
  <div class="relative">
    <button
      ref="triggerRef"
      class="app-icon-button app-icon-button-xl app-toolbar-button app-focus-ring inline-flex cursor-pointer items-center justify-center border"
      type="button"
      :aria-label="t('shell.menu_toggle')"
      aria-haspopup="menu"
      :aria-expanded="open ? 'true' : 'false'"
      @click="togglePanel"
    >
      <svg
        class="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01A1.65 1.65 0 0 0 9.93 3.1V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>

    <div
      v-if="open"
      ref="panelRef"
      class="app-menu-panel absolute top-[calc(100%+0.5rem)] right-0 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border p-3 shadow-xl"
      role="menu"
    >
      <div>
        <div class="app-text-eyebrow">
          {{ t("shell.menu_theme") }}
        </div>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <button
            class="app-focus-ring app-control-md cursor-pointer rounded-xl px-3 py-2 app-text-body font-semibold"
            :class="theme === 'orange' ? 'app-pill-active' : 'app-menu-item'"
            type="button"
            @click="updateTheme('orange')"
          >
            {{ t("theme.orange") }}
          </button>
          <button
            class="app-focus-ring app-control-md cursor-pointer rounded-xl px-3 py-2 app-text-body font-semibold"
            :class="theme === 'terminal' ? 'app-pill-active' : 'app-menu-item'"
            type="button"
            @click="updateTheme('terminal')"
          >
            {{ t("theme.terminal") }}
          </button>
        </div>
      </div>

      <div class="app-divider my-3"></div>

      <div>
        <div class="app-text-eyebrow">
          {{ t("shell.menu_language") }}
        </div>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <button
            class="app-focus-ring app-control-md cursor-pointer rounded-xl px-3 py-2 app-text-body font-semibold"
            :class="locale === 'fr' ? 'app-pill-active' : 'app-menu-item'"
            type="button"
            @click="updateLocale('fr')"
          >
            FR
          </button>
          <button
            class="app-focus-ring app-control-md cursor-pointer rounded-xl px-3 py-2 app-text-body font-semibold"
            :class="locale === 'en' ? 'app-pill-active' : 'app-menu-item'"
            type="button"
            @click="updateLocale('en')"
          >
            EN
          </button>
        </div>
      </div>

      <div class="app-divider my-3"></div>

      <div class="grid gap-1">
        <button
          class="app-menu-item app-focus-ring app-control-md cursor-pointer rounded-xl px-3 py-2 text-left app-text-body"
          type="button"
          @click="goTo('/settings')"
        >
          {{ t("shell.menu_settings") }}
        </button>
        <button
          class="app-menu-item app-focus-ring app-control-md cursor-pointer rounded-xl px-3 py-2 text-left app-text-body"
          type="button"
          @click="goTo('/packs')"
        >
          {{ t("shell.menu_packs") }}
        </button>
        <button
          class="app-menu-item app-focus-ring app-control-md cursor-pointer rounded-xl px-3 py-2 text-left app-text-body"
          type="button"
          @click="goToAbout"
        >
          {{ t("shell.menu_about") }}
        </button>
      </div>
    </div>
  </div>
</template>
