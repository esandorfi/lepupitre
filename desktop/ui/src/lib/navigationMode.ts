import type { PrimaryNavMode } from "./uiPreferences";

export function resolveEffectiveNavMode(
  primaryNavMode: PrimaryNavMode,
  viewportWidth: number
): PrimaryNavMode {
  if (primaryNavMode === "sidebar-icon" && viewportWidth >= 1024) {
    return "sidebar-icon";
  }
  return "top";
}
