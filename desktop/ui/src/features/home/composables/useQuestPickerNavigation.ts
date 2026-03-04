import { nextTick, ref, type ComputedRef, type Ref } from "vue";

type QuestPickerItem = {
  code: string;
};

type MoveDelta = 1 | -1;

type UseQuestPickerNavigationOptions<TItem extends QuestPickerItem> = {
  isOpen: Ref<boolean>;
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
  visibleItems: ComputedRef<TItem[]>;
  preferredCode: ComputedRef<string | null>;
  listElement: Ref<HTMLElement | null>;
  onClose: () => void;
  onSelect: (item: TItem) => void;
};

export function useQuestPickerNavigation<TItem extends QuestPickerItem>(
  options: UseQuestPickerNavigationOptions<TItem>
) {
  const activeCode = ref<string | null>(null);

  function scrollActiveIntoView() {
    void nextTick(() => {
      const code = activeCode.value;
      const listEl = options.listElement.value;
      if (!code || !listEl) {
        return;
      }
      const rows = Array.from(listEl.querySelectorAll<HTMLElement>("[data-quest-code]"));
      const activeEl = rows.find((row) => row.dataset.questCode === code);
      activeEl?.scrollIntoView({ block: "nearest" });
    });
  }

  function syncActive() {
    if (!options.isOpen.value) {
      activeCode.value = null;
      return;
    }
    const visible = options.visibleItems.value;
    if (visible.length === 0) {
      activeCode.value = null;
      return;
    }
    if (activeCode.value && visible.some((item) => item.code === activeCode.value)) {
      return;
    }
    const preferred = options.preferredCode.value
      ? visible.find((item) => item.code === options.preferredCode.value)
      : null;
    activeCode.value = preferred?.code ?? visible[0]?.code ?? null;
    scrollActiveIntoView();
  }

  function moveActive(delta: MoveDelta) {
    const visible = options.visibleItems.value;
    if (visible.length === 0) {
      return;
    }
    const currentIndex = activeCode.value
      ? visible.findIndex((item) => item.code === activeCode.value)
      : -1;
    const nextIndex =
      currentIndex < 0
        ? 0
        : (currentIndex + delta + visible.length) % visible.length;
    activeCode.value = visible[nextIndex]?.code ?? null;
    scrollActiveIntoView();
  }

  function activateActive() {
    const code = activeCode.value;
    if (!code) {
      return;
    }
    const selectedItem = options.visibleItems.value.find((item) => item.code === code);
    if (selectedItem) {
      options.onSelect(selectedItem);
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (!options.isOpen.value) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      options.onClose();
      return;
    }
    if (
      options.isLoading.value ||
      Boolean(options.error.value) ||
      options.visibleItems.value.length === 0
    ) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
      return;
    }
    if (event.key === "Enter") {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-quest-row-action]")) {
        return;
      }
      event.preventDefault();
      activateActive();
    }
  }

  return {
    activateActive,
    activeCode,
    moveActive,
    onKeydown,
    scrollActiveIntoView,
    syncActive,
  };
}
