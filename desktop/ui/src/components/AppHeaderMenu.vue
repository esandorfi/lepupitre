<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

const { locale, setLocale, t } = useI18n();
const { theme, setTheme } = useTheme();
const router = useRouter();

const open = ref(false);

const MENU_POPOVER_CONTENT = {
  align: "end",
  side: "bottom",
  sideOffset: 8,
} as const;

const MENU_POPOVER_UI = {
  content:
    "z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 text-[var(--color-text)] shadow-[var(--shadow-md)]",
} as const;

function closePanel() {
  open.value = false;
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
</script>

<template>
  <UPopover
    v-model:open="open"
    :portal="false"
    :content="MENU_POPOVER_CONTENT"
    :ui="MENU_POPOVER_UI"
  >
    <template #default="{ open: menuOpen }">
      <UButton
        class="app-toolbar-button border"
        :aria-label="t('shell.menu_toggle')"
        aria-haspopup="menu"
        :aria-expanded="menuOpen ? 'true' : 'false'"
        color="neutral"
        variant="outline"
        size="md"
        square
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
      </UButton>
    </template>

    <template #content>
      <div>
        <div class="app-text-eyebrow">
          {{ t("shell.menu_theme") }}
        </div>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <UButton
            size="md"
            color="neutral"
            :variant="theme === 'orange' ? 'ghost' : 'outline'"
            class="w-full app-text-body font-semibold"
            :class="theme === 'orange' ? 'app-pill-active' : ''"
            @click="updateTheme('orange')"
          >
            {{ t("theme.orange") }}
          </UButton>
          <UButton
            size="md"
            color="neutral"
            :variant="theme === 'terminal' ? 'ghost' : 'outline'"
            class="w-full app-text-body font-semibold"
            :class="theme === 'terminal' ? 'app-pill-active' : ''"
            @click="updateTheme('terminal')"
          >
            {{ t("theme.terminal") }}
          </UButton>
        </div>
      </div>

      <USeparator class="my-3" />

      <div>
        <div class="app-text-eyebrow">
          {{ t("shell.menu_language") }}
        </div>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <UButton
            size="md"
            color="neutral"
            :variant="locale === 'fr' ? 'ghost' : 'outline'"
            class="w-full app-text-body font-semibold"
            :class="locale === 'fr' ? 'app-pill-active' : ''"
            @click="updateLocale('fr')"
          >
            FR
          </UButton>
          <UButton
            size="md"
            color="neutral"
            :variant="locale === 'en' ? 'ghost' : 'outline'"
            class="w-full app-text-body font-semibold"
            :class="locale === 'en' ? 'app-pill-active' : ''"
            @click="updateLocale('en')"
          >
            EN
          </UButton>
        </div>
      </div>

      <USeparator class="my-3" />

      <div class="grid gap-1">
        <UButton size="md" class="w-full justify-start text-left app-text-body" color="neutral" variant="outline" @click="goTo('/settings')">
          {{ t("shell.menu_settings") }}
        </UButton>
        <UButton size="md" class="w-full justify-start text-left app-text-body" color="neutral" variant="outline" @click="goTo('/packs')">
          {{ t("shell.menu_packs") }}
        </UButton>
        <UButton size="md" class="w-full justify-start text-left app-text-body" color="neutral" variant="outline" @click="goToHelp">
          {{ t("shell.menu_help") }}
        </UButton>
        <UButton size="md" class="w-full justify-start text-left app-text-body" color="neutral" variant="outline" @click="goToOnboarding">
          {{ t("shell.menu_onboarding") }}
        </UButton>
        <UButton size="md" class="w-full justify-start text-left app-text-body" color="neutral" variant="outline" @click="goToAbout">
          {{ t("shell.menu_about") }}
        </UButton>
      </div>
    </template>
  </UPopover>
</template>
