import type { PrimaryNavMode } from "./uiPreferences";

/**
 * Resolves resolve effective nav mode from current inputs.
 */
export function resolveEffectiveNavMode(
  primaryNavMode: PrimaryNavMode,
  viewportWidth: number
): PrimaryNavMode {
  if (primaryNavMode === "sidebar-icon" && viewportWidth >= 1024) {
    return "sidebar-icon";
  }
  return "top";
}
