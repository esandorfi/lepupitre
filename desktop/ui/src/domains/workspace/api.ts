import { invokeChecked } from "../../composables/useIpc";
import {
  EmptyPayloadSchema,
  IdSchema,
  ProfileCreatePayloadSchema,
  ProfileIdPayloadSchema,
  ProfileListResponseSchema,
  ProfileRenamePayloadSchema,
  VoidResponseSchema,
} from "../../schemas/ipc";

export async function listProfiles() {
  return invokeChecked("profile_list", EmptyPayloadSchema, ProfileListResponseSchema, {});
}

export async function createProfile(name: string) {
  return invokeChecked("profile_create", ProfileCreatePayloadSchema, IdSchema, { name });
}

export async function switchProfile(profileId: string) {
  await invokeChecked("profile_switch", ProfileIdPayloadSchema, VoidResponseSchema, {
    profileId,
  });
}

export async function renameProfile(profileId: string, name: string) {
  await invokeChecked("profile_rename", ProfileRenamePayloadSchema, VoidResponseSchema, {
    profileId,
    name,
  });
}

export async function deleteProfile(profileId: string) {
  await invokeChecked("profile_delete", ProfileIdPayloadSchema, VoidResponseSchema, {
    profileId,
  });
}
