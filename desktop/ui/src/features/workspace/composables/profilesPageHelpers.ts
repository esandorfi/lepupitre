import type { ComponentPublicInstance } from "vue";

export type InputRefTarget =
  | HTMLInputElement
  | ComponentPublicInstance
  | { $el?: Element | null; inputRef?: HTMLInputElement | null }
  | null;

export type Translate = (key: string) => string;

/**
 * Resolves resolve input element from current inputs.
 */
export function resolveInputElement(target: InputRefTarget): HTMLInputElement | null {
  if (!target) {
    return null;
  }
  if (target instanceof HTMLInputElement) {
    return target;
  }
  if ("inputRef" in target && target.inputRef instanceof HTMLInputElement) {
    return target.inputRef;
  }
  if ("$el" in target && target.$el instanceof HTMLElement) {
    const input = target.$el.querySelector("input");
    if (input instanceof HTMLInputElement) {
      return input;
    }
  }
  return null;
}

/**
 * Implements to localized error behavior.
 */
export function toLocalizedError(t: Translate, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("recording_active")) {
    return t("profiles.switch_blocked_recording");
  }
  return message;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

/**
 * Formats values for format profile meta.
 */
export function formatProfileMeta(profile: { talks_count: number; size_bytes: number }) {
  const talksLabel = profile.talks_count === 1 ? "talk" : "talks";
  return `${profile.talks_count} ${talksLabel} - ${formatBytes(profile.size_bytes)}`;
}

/**
 * Implements initials for behavior.
 */
export function initialsFor(nameValue: string) {
  const parts = nameValue.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "WS";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

/**
 * Implements has duplicate name behavior.
 */
export function hasDuplicateName(
  profiles: ReadonlyArray<{ id: string; name: string }>,
  nextName: string,
  exceptId?: string
) {
  return profiles.some(
    (profile) =>
      profile.id !== exceptId &&
      profile.name.trim().toLowerCase() === nextName.trim().toLowerCase()
  );
}
