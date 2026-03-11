import { computed, type Ref } from "vue";
import type { ProfileSummary } from "@/schemas/ipc";
import type { Translate } from "@/features/workspace/composables/profilesPageHelpers";

type ProfilesViewModelArgs = {
  t: Translate;
  deleteTarget: Ref<ProfileSummary | null>;
  isRenaming: Ref<boolean>;
  deletingId: Ref<string | null>;
  startRename: (profileId: string, currentName: string) => void;
  requestDelete: (profile: ProfileSummary) => void;
};

/**
 * Creates the profiles page derived labels and row menu descriptors.
 */
export function createProfilesViewModel(args: ProfilesViewModelArgs) {
  const deleteDialogTitle = computed(() => {
    if (!args.deleteTarget.value) {
      return "";
    }
    return `${args.t("profiles.delete_title_prefix")} "${args.deleteTarget.value.name}" ?`;
  });

  const deleteDialogBody = computed(() => {
    if (!args.deleteTarget.value) {
      return "";
    }
    return `${args.t("profiles.delete_body_prefix")} "${args.deleteTarget.value.name}" ${args.t(
      "profiles.delete_body_suffix"
    )}`;
  });

  function profileMenuItems(profile: ProfileSummary) {
    return [
      {
        label: args.t("profiles.rename"),
        disabled: args.isRenaming.value,
        onSelect: () => args.startRename(profile.id, profile.name),
      },
      {
        label: args.t("profiles.delete"),
        color: "error" as const,
        disabled: args.deletingId.value === profile.id,
        onSelect: () => args.requestDelete(profile),
      },
    ];
  }

  return {
    deleteDialogTitle,
    deleteDialogBody,
    profileMenuItems,
  };
}
