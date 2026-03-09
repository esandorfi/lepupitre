import { invokeChecked } from "@/composables/useIpc";
import {
  EmptyPayloadSchema,
  IdSchema,
  ProfileCreatePayloadSchema,
  ProfileIdPayloadSchema,
  ProfileListResponseSchema,
  ProfileRenamePayloadSchema,
  VoidResponseSchema,
} from "@/schemas/ipc";

/**
 * Lists list profiles from domain/runtime dependencies.
 */
export async function listProfiles() {
  return invokeChecked("profile_list", EmptyPayloadSchema, ProfileListResponseSchema, {});
}

/**
 * Creates and returns the create profile contract.
 */
export async function createProfile(name: string) {
  return invokeChecked("profile_create", ProfileCreatePayloadSchema, IdSchema, { name });
}

/**
 * Implements switch profile behavior.
 */
export async function switchProfile(profileId: string) {
  await invokeChecked("profile_switch", ProfileIdPayloadSchema, VoidResponseSchema, {
    profileId,
  });
}

/**
 * Implements rename profile behavior.
 */
export async function renameProfile(profileId: string, name: string) {
  await invokeChecked("profile_rename", ProfileRenamePayloadSchema, VoidResponseSchema, {
    profileId,
    name,
  });
}

/**
 * Implements delete profile behavior.
 */
export async function deleteProfile(profileId: string) {
  await invokeChecked("profile_delete", ProfileIdPayloadSchema, VoidResponseSchema, {
    profileId,
  });
}
