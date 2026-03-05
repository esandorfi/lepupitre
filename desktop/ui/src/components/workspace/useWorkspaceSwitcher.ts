import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import {
  type ButtonRefTarget,
  type InputRefTarget,
} from "@/components/workspace/workspaceSwitcher.refs";
import { createWorkspaceSwitcherActions } from "@/components/workspace/useWorkspaceSwitcherActions";
import { createWorkspaceSwitcherModel } from "@/components/workspace/useWorkspaceSwitcherModel";

const PANEL_POPOVER_CONTENT = {
  align: "end",
  side: "bottom",
  sideOffset: 8,
} as const;

const PANEL_POPOVER_UI = {
  content:
    "z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 text-[var(--color-text)] shadow-[var(--shadow-md)]",
} as const;

export function useWorkspaceSwitcher() {
  const { t } = useI18n();
  const router = useRouter();
  const { theme } = useTheme();

  const open = ref(false);
  const search = ref("");
  const error = ref<string | null>(null);
  const switchingId = ref<string | null>(null);
  const createOpen = ref(false);
  const createName = ref("");
  const isCreating = ref(false);
  const editingId = ref<string | null>(null);
  const renameValue = ref("");
  const renameOriginal = ref("");
  const isRenaming = ref(false);
  const deletingId = ref<string | null>(null);
  const deleteTarget = ref<{ id: string; name: string } | null>(null);
  const toolbarColorTick = ref(0);
  const triggerRef = ref<ButtonRefTarget>(null);
  const searchInputRef = ref<InputRefTarget>(null);
  const createInputRef = ref<InputRefTarget>(null);
  const renameInputRef = ref<InputRefTarget>(null);

  const model = createWorkspaceSwitcherModel({
    search,
    deleteTarget,
    toolbarColorTick,
    t,
    theme,
  });

  const actions = createWorkspaceSwitcherActions({
    t,
    router,
    theme,
    open,
    search,
    error,
    switchingId,
    createOpen,
    createName,
    isCreating,
    editingId,
    renameValue,
    renameOriginal,
    isRenaming,
    deletingId,
    deleteTarget,
    toolbarColorTick,
    triggerRef,
    searchInputRef,
    createInputRef,
    renameInputRef,
    profiles: model.profiles,
    activeProfileId: model.activeProfileId,
    showSearch: model.showSearch,
  });

  return {
    t,
    open,
    search,
    error,
    switchingId,
    createOpen,
    createName,
    isCreating,
    editingId,
    renameValue,
    isRenaming,
    deletingId,
    deleteTarget,
    triggerRef,
    searchInputRef,
    createInputRef,
    renameInputRef,
    PANEL_POPOVER_CONTENT,
    PANEL_POPOVER_UI,
    activeProfileId: model.activeProfileId,
    recentProfiles: model.recentProfiles,
    showSearch: model.showSearch,
    showRecentSection: model.showRecentSection,
    mainProfiles: model.mainProfiles,
    hasNoProfiles: model.hasNoProfiles,
    hasNoSearchResults: model.hasNoSearchResults,
    currentLabel: model.currentLabel,
    deleteDialogTitle: model.deleteDialogTitle,
    deleteDialogBody: model.deleteDialogBody,
    currentToolbarColorStyle: model.currentToolbarColorStyle,
    closePanel: actions.closePanel,
    onPopoverOpenChange: actions.onPopoverOpenChange,
    toggleCreate: actions.toggleCreate,
    createProfileInline: actions.createProfileInline,
    selectProfile: actions.selectProfile,
    confirmRename: actions.confirmRename,
    onPanelMouseDownCapture: actions.onPanelMouseDownCapture,
    onRenameEditorFocusOut: actions.onRenameEditorFocusOut,
    rowMenuItems: actions.rowMenuItems,
    cancelDelete: actions.cancelDelete,
    confirmDelete: actions.confirmDelete,
    onProfileRowActivate: actions.onProfileRowActivate,
    rowMenuButtonAriaLabel: model.rowMenuButtonAriaLabel,
    workspaceMetaLabel: model.workspaceMetaLabel,
    toolbarColorPreviewStyle: model.toolbarColorPreviewStyle,
    activeRowStyle: model.activeRowStyle,
  };
}
