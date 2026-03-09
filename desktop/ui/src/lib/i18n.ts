import { ref } from "vue";
import { hydratePreference, readPreference, writePreference } from "./preferencesStorage";
import { enMessages } from "./i18n.messages.en";
import { frMessages } from "./i18n.messages.fr";

type Locale = "en" | "fr";

const STORAGE_KEY = "lepupitre_locale";
const LEGACY_STORAGE_KEYS = ["lepupitre_language"] as const;

const messages: Record<Locale, Record<string, string>> = {
  en: enMessages,
  fr: frMessages,
};

function loadLocale(): Locale {
  try {
    const stored = readPreference(STORAGE_KEY, { legacyKeys: LEGACY_STORAGE_KEYS });
    if (stored === "en" || stored === "fr") {
      return stored;
    }
  } catch {
    return "en";
  }
  return "en";
}

const locale = ref<Locale>(loadLocale());
void hydratePreference(STORAGE_KEY, { legacyKeys: LEGACY_STORAGE_KEYS }).then((stored) => {
  if (stored === "en" || stored === "fr") {
    locale.value = stored;
  }
});

function setLocale(next: Locale) {
  locale.value = next;
  writePreference(STORAGE_KEY, next);
}

function t(key: string) {
  return messages[locale.value][key] ?? key;
}

/**
 * Provides the use i18n composable contract.
 */
export function useI18n() {
  return { locale, setLocale, t };
}

