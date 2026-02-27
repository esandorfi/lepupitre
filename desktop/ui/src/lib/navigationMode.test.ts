import { describe, expect, it } from "vitest";
import { resolveEffectiveNavMode } from "./navigationMode";

describe("resolveEffectiveNavMode", () => {
  it("keeps sidebar mode on wide viewports", () => {
    expect(resolveEffectiveNavMode("sidebar-icon", 1280)).toBe("sidebar-icon");
    expect(resolveEffectiveNavMode("sidebar-icon", 1024)).toBe("sidebar-icon");
  });

  it("falls back to top mode on narrow viewports", () => {
    expect(resolveEffectiveNavMode("sidebar-icon", 1023)).toBe("top");
  });

  it("keeps top mode regardless of viewport width", () => {
    expect(resolveEffectiveNavMode("top", 1280)).toBe("top");
    expect(resolveEffectiveNavMode("top", 800)).toBe("top");
  });
});
