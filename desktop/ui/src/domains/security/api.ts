import { invokeChecked } from "@/composables/useIpc";
import {
  EmptyPayloadSchema,
  SecurityPrepareAppdataFileResponseSchema,
  SecurityProbeFsPayloadSchema,
  SecurityProbeFsResponseSchema,
} from "@/schemas/ipc";

/**
 * Implements security probe fs behavior.
 */
export async function securityProbeFs(path: string) {
  return invokeChecked("security_probe_fs", SecurityProbeFsPayloadSchema, SecurityProbeFsResponseSchema, {
    path,
  });
}

/**
 * Implements security prepare appdata file behavior.
 */
export async function securityPrepareAppdataFile() {
  return invokeChecked(
    "security_prepare_appdata_file",
    EmptyPayloadSchema,
    SecurityPrepareAppdataFileResponseSchema,
    {}
  );
}
