import { computed, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useQuestPickerNavigation } from "./useQuestPickerNavigation";

type Item = { code: string };

function setup(options?: { preferredCode?: string | null; items?: Item[] }) {
  const isOpen = ref(true);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const items = ref<Item[]>(options?.items ?? [{ code: "A" }, { code: "B" }, { code: "C" }]);
  const preferredCode = ref<string | null>(options?.preferredCode ?? null);
  const onClose = vi.fn();
  const onSelect = vi.fn();

  const navigation = useQuestPickerNavigation({
    isOpen,
    isLoading,
    error,
    visibleItems: computed(() => items.value),
    preferredCode: computed(() => preferredCode.value),
    onClose,
    onSelect,
  });

  return {
    isOpen,
    isLoading,
    error,
    items,
    preferredCode,
    onClose,
    onSelect,
    navigation,
  };
}

describe("useQuestPickerNavigation", () => {
  it("syncs active code using preferred code when available", () => {
    const ctx = setup({ preferredCode: "B" });
    ctx.navigation.syncActive();
    expect(ctx.navigation.activeCode.value).toBe("B");
  });

  it("falls back to first visible code when preferred is missing", () => {
    const ctx = setup({ preferredCode: "Z" });
    ctx.navigation.syncActive();
    expect(ctx.navigation.activeCode.value).toBe("A");
  });

  it("clears active code when picker closes", () => {
    const ctx = setup();
    ctx.navigation.syncActive();
    expect(ctx.navigation.activeCode.value).toBe("A");
    ctx.isOpen.value = false;
    ctx.navigation.syncActive();
    expect(ctx.navigation.activeCode.value).toBeNull();
  });

  it("moves active selection with wrap-around", () => {
    const ctx = setup();
    ctx.navigation.syncActive();
    ctx.navigation.moveActive(1);
    expect(ctx.navigation.activeCode.value).toBe("B");
    ctx.navigation.moveActive(1);
    expect(ctx.navigation.activeCode.value).toBe("C");
    ctx.navigation.moveActive(1);
    expect(ctx.navigation.activeCode.value).toBe("A");
    ctx.navigation.moveActive(-1);
    expect(ctx.navigation.activeCode.value).toBe("C");
  });

  it("handles Escape by closing picker", () => {
    const ctx = setup();
    const event = {
      key: "Escape",
      preventDefault: vi.fn(),
      target: null,
    } as unknown as KeyboardEvent;
    ctx.navigation.onKeydown(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(ctx.onClose).toHaveBeenCalledOnce();
  });

  it("selects active item on Enter unless row action target is focused", () => {
    const ctx = setup();
    ctx.navigation.syncActive();

    const blockedEvent = {
      key: "Enter",
      preventDefault: vi.fn(),
      target: { closest: () => ({}) },
    } as unknown as KeyboardEvent;
    ctx.navigation.onKeydown(blockedEvent);
    expect(ctx.onSelect).not.toHaveBeenCalled();

    const allowedEvent = {
      key: "Enter",
      preventDefault: vi.fn(),
      target: { closest: () => null },
    } as unknown as KeyboardEvent;
    ctx.navigation.onKeydown(allowedEvent);
    expect(allowedEvent.preventDefault).toHaveBeenCalledOnce();
    expect(ctx.onSelect).toHaveBeenCalledWith({ code: "A" });
  });
});
