<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from "vue";
import { useRouter } from "vue-router";
import AppButton from "@/components/ui/AppButton.vue";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

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

async function goToHelp() {
  await router.push("/help");
  closePanel();
}

async function goToOnboarding() {
  await router.push("/onboarding");
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
      class="app-icon-button app-icon-button-md app-toolbar-button app-focus-ring inline-flex cursor-pointer items-center justify-center border"
      type="button"
      :aria-label="t('shell.menu_toggle')"
      aria-haspopup="menu"
      :aria-expanded="open ? 'true' : 'false'"
      @click="togglePanel"
    >
      <svg
        class="h-4 w-4"
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
          <AppButton
            size="md"
            :tone="theme === 'orange' ? 'ghost' : 'secondary'"
            class="w-full app-text-body font-semibold"
            :class="theme === 'orange' ? 'app-pill-active' : ''"
            @click="updateTheme('orange')"
          >
            {{ t("theme.orange") }}
          </AppButton>
          <AppButton
            size="md"
            :tone="theme === 'terminal' ? 'ghost' : 'secondary'"
            class="w-full app-text-body font-semibold"
            :class="theme === 'terminal' ? 'app-pill-active' : ''"
            @click="updateTheme('terminal')"
          >
            {{ t("theme.terminal") }}
          </AppButton>
        </div>
      </div>

      <div class="app-divider my-3"></div>

      <div>
        <div class="app-text-eyebrow">
          {{ t("shell.menu_language") }}
        </div>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <AppButton
            size="md"
            :tone="locale === 'fr' ? 'ghost' : 'secondary'"
            class="w-full app-text-body font-semibold"
            :class="locale === 'fr' ? 'app-pill-active' : ''"
            @click="updateLocale('fr')"
          >
            FR
          </AppButton>
          <AppButton
            size="md"
            :tone="locale === 'en' ? 'ghost' : 'secondary'"
            class="w-full app-text-body font-semibold"
            :class="locale === 'en' ? 'app-pill-active' : ''"
            @click="updateLocale('en')"
          >
            EN
          </AppButton>
        </div>
      </div>

      <div class="app-divider my-3"></div>

      <div class="grid gap-1">
        <AppButton size="md" tone="secondary" class="w-full justify-start text-left app-text-body" @click="goTo('/settings')">
          {{ t("shell.menu_settings") }}
        </AppButton>
        <AppButton size="md" tone="secondary" class="w-full justify-start text-left app-text-body" @click="goTo('/packs')">
          {{ t("shell.menu_packs") }}
        </AppButton>
        <AppButton size="md" tone="secondary" class="w-full justify-start text-left app-text-body" @click="goToHelp">
          {{ t("shell.menu_help") }}
        </AppButton>
        <AppButton size="md" tone="secondary" class="w-full justify-start text-left app-text-body" @click="goToOnboarding">
          {{ t("shell.menu_onboarding") }}
        </AppButton>
        <AppButton size="md" tone="secondary" class="w-full justify-start text-left app-text-body" @click="goToAbout">
          {{ t("shell.menu_about") }}
        </AppButton>
      </div>
    </div>
  </div>
</template>
