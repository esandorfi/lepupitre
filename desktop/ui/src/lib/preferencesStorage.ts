import { invokeChecked } from "../composables/useIpc";
import {
  PreferenceGlobalGetPayloadSchema,
  PreferenceGlobalSetPayloadSchema,
  PreferenceProfileGetPayloadSchema,
  PreferenceProfileSetPayloadSchema,
  PreferenceValueResponseSchema,
  VoidResponseSchema,
} from "../schemas/ipc";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type PreferenceScope = "global" | "profile";

export type PreferenceOptions = {
  legacyKeys?: readonly string[];
  scope?: PreferenceScope;
  profileId?: string | null;
};

type ResolvedPreferenceOptions = {
  scope: PreferenceScope;
  profileId: string | null;
};

let activeProfileId: string | null = null;
const hydrationInFlight = new Set<string>();

function resolveStorage(): StorageLike | null {
  try {
    if (typeof globalThis === "undefined" || typeof globalThis.localStorage === "undefined") {
      return null;
    }
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function hasTauriRuntime(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const runtimeWindow = window as typeof window & { __TAURI_INTERNALS__?: unknown };
  return typeof runtimeWindow.__TAURI_INTERNALS__ !== "undefined";
}

function normalizeOptions(options: PreferenceOptions): ResolvedPreferenceOptions {
  return {
    scope: options.scope ?? "global",
    profileId: options.profileId ?? activeProfileId,
  };
}

function cacheKey(key: string, options: ResolvedPreferenceOptions): string {
  return `${options.scope}:${options.profileId ?? ""}:${key}`;
}

function readRaw(key: string): string | null {
  const storage = resolveStorage();
  if (!storage) {
    return null;
  }
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function readLocalWithLegacy(key: string, options: PreferenceOptions): string | null {
  const direct = readRaw(key);
  if (direct !== null) {
    return direct;
  }

  const legacyKeys = options.legacyKeys ?? [];
  for (const legacyKey of legacyKeys) {
    const legacyValue = readRaw(legacyKey);
    if (legacyValue === null) {
      continue;
    }
    writeLocal(key, legacyValue);
    removeLocal(legacyKey);
    return legacyValue;
  }
  return null;
}

async function backendGet(
  key: string,
  options: ResolvedPreferenceOptions
): Promise<string | null> {
  if (options.scope === "profile") {
    if (!options.profileId) {
      return null;
    }
    return invokeChecked(
      "preference_profile_get",
      PreferenceProfileGetPayloadSchema,
      PreferenceValueResponseSchema,
      {
        profileId: options.profileId,
        key,
      }
    );
  }
  return invokeChecked(
    "preference_global_get",
    PreferenceGlobalGetPayloadSchema,
    PreferenceValueResponseSchema,
    { key }
  );
}

async function backendSet(
  key: string,
  value: string | null,
  options: ResolvedPreferenceOptions
): Promise<void> {
  if (options.scope === "profile") {
    if (!options.profileId) {
      return;
    }
    await invokeChecked(
      "preference_profile_set",
      PreferenceProfileSetPayloadSchema,
      VoidResponseSchema,
      {
        profileId: options.profileId,
        key,
        value,
      }
    );
    return;
  }
  await invokeChecked(
    "preference_global_set",
    PreferenceGlobalSetPayloadSchema,
    VoidResponseSchema,
    {
      key,
      value,
    }
  );
}

function writeLocal(key: string, value: string): void {
  const storage = resolveStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(key, value);
  } catch {
    // ignore storage write errors
  }
}

function removeLocal(key: string): void {
  const storage = resolveStorage();
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(key);
  } catch {
    // ignore storage remove errors
  }
}

export function setActivePreferenceProfile(profileId: string | null): void {
  activeProfileId = profileId;
}

export function readPreference(key: string, options: PreferenceOptions = {}): string | null {
  const localValue = readLocalWithLegacy(key, options);
  const resolved = normalizeOptions(options);
  if (!hasTauriRuntime()) {
    return localValue;
  }
  if (resolved.scope === "profile" && !resolved.profileId) {
    return localValue;
  }

  const scopeKey = cacheKey(key, resolved);
  if (hydrationInFlight.has(scopeKey)) {
    return localValue;
  }
  hydrationInFlight.add(scopeKey);
  void hydratePreference(key, options, localValue).finally(() => {
    hydrationInFlight.delete(scopeKey);
  });
  return localValue;
}

export async function hydratePreference(
  key: string,
  options: PreferenceOptions = {},
  cachedLocalValue?: string | null
): Promise<string | null> {
  const localValue =
    typeof cachedLocalValue === "undefined"
      ? readLocalWithLegacy(key, options)
      : cachedLocalValue;
  const resolved = normalizeOptions(options);
  if (!hasTauriRuntime()) {
    return localValue;
  }
  if (resolved.scope === "profile" && !resolved.profileId) {
    return localValue;
  }

  try {
    const backendValue = await backendGet(key, resolved);
    if (backendValue !== null) {
      if (backendValue !== localValue) {
        writeLocal(key, backendValue);
      }
      return backendValue;
    }
    if (localValue !== null) {
      await backendSet(key, localValue, resolved);
    }
  } catch {
    // keep local fallback if backend command is unavailable
  }
  return localValue;
}

export async function hydratePreferences(
  entries: Array<{ key: string; options?: PreferenceOptions }>
): Promise<void> {
  await Promise.all(
    entries.map(async (entry) => {
      await hydratePreference(entry.key, entry.options);
    })
  );
}

export function writePreference(
  key: string,
  value: string,
  options: PreferenceOptions = {}
): void {
  writeLocal(key, value);
  const resolved = normalizeOptions(options);
  if (!hasTauriRuntime()) {
    return;
  }
  if (resolved.scope === "profile" && !resolved.profileId) {
    return;
  }
  void backendSet(key, value, resolved).catch(() => {
    // keep local fallback if backend write fails
  });
}

export function removePreference(key: string, options: PreferenceOptions = {}): void {
  removeLocal(key);
  const resolved = normalizeOptions(options);
  if (!hasTauriRuntime()) {
    return;
  }
  if (resolved.scope === "profile" && !resolved.profileId) {
    return;
  }
  void backendSet(key, null, resolved).catch(() => {
    // keep local fallback if backend write fails
  });
}
