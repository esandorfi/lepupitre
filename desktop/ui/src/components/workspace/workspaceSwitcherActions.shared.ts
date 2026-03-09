import type { ComputedRef, Ref } from "vue";
import type { Router } from "vue-router";
import type { ProfileSummary } from "@/schemas/ipc";
import type { Theme } from "@/lib/theme";
import { talksStore, trainingStore, workspaceStore } from "@/stores/app";
import type {
  ButtonRefTarget,
  InputRefTarget,
} from "@/components/workspace/workspaceSwitcher.refs";
import type { Translate } from "@/components/workspace/useWorkspaceSwitcherModel";

export type WorkspaceSwitcherActionDeps = {
  t: Translate;
  router: Router;
  theme: Ref<Theme>;
  open: Ref<boolean>;
  search: Ref<string>;
  error: Ref<string | null>;
  switchingId: Ref<string | null>;
  createOpen: Ref<boolean>;
  createName: Ref<string>;
  isCreating: Ref<boolean>;
  editingId: Ref<string | null>;
  renameValue: Ref<string>;
  renameOriginal: Ref<string>;
  isRenaming: Ref<boolean>;
  deletingId: Ref<string | null>;
  deleteTarget: Ref<{ id: string; name: string } | null>;
  toolbarColorTick: Ref<number>;
  triggerRef: Ref<ButtonRefTarget>;
  searchInputRef: Ref<InputRefTarget>;
  createInputRef: Ref<InputRefTarget>;
  renameInputRef: Ref<InputRefTarget>;
  profiles: ComputedRef<ProfileSummary[]>;
  activeProfileId: ComputedRef<string | null>;
  showSearch: ComputedRef<boolean>;
};

/**
 * Implements has duplicate name behavior.
 */
export function hasDuplicateName(
  profiles: ReadonlyArray<Pick<ProfileSummary, "id" | "name">>,
  nextName: string,
  exceptId?: string
) {
  return profiles.some(
    (profile) =>
      profile.id !== exceptId &&
      profile.name.trim().toLowerCase() === nextName.trim().toLowerCase()
  );
}

/**
 * Implements to workspace error behavior.
 */
export function toWorkspaceError(t: Translate, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("recording_active")) {
    return t("profiles.switch_blocked_recording");
  }
  return message;
}

/**
 * Implements refresh profile context behavior.
 */
export async function refreshProfileContext() {
  await talksStore.loadActiveProject();
  await talksStore.loadProjects();
  await trainingStore.loadDailyQuest();
}

/**
 * Creates and returns the create profile with context contract.
 */
export async function createProfileWithContext(name: string) {
  const id = await workspaceStore.createProfile(name);
  await refreshProfileContext();
  return id;
}

/**
 * Implements switch profile with context behavior.
 */
export async function switchProfileWithContext(profileId: string) {
  await workspaceStore.switchProfile(profileId);
  await refreshProfileContext();
}

/**
 * Implements delete profile with context behavior.
 */
export async function deleteProfileWithContext(profileId: string) {
  await workspaceStore.deleteProfile(profileId);
  await refreshProfileContext();
}
