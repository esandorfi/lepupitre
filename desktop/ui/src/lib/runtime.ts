export function hasTauriRuntime(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const runtimeWindow = window as typeof window & { __TAURI_INTERNALS__?: unknown };
  return typeof runtimeWindow.__TAURI_INTERNALS__ !== "undefined";
}

export function isUiDevWithoutTauri(): boolean {
  return import.meta.env.DEV && !hasTauriRuntime();
}
