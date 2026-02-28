type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type ReadPreferenceOptions = {
  legacyKeys?: readonly string[];
};

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

export function readPreference(key: string, options: ReadPreferenceOptions = {}): string | null {
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
    writePreference(key, legacyValue);
    removePreference(legacyKey);
    return legacyValue;
  }
  return null;
}

export function writePreference(key: string, value: string): void {
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

export function removePreference(key: string): void {
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
