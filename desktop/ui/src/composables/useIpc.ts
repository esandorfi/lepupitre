import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";
import { AppError } from "../lib/errors";
import { hasTauriRuntime, isUiDevWithoutTauri } from "../lib/runtime";

export async function invokeChecked<TPayload, TResponse>(
  command: string,
  payloadSchema: z.ZodType<TPayload>,
  responseSchema: z.ZodType<TResponse>,
  payload: TPayload
): Promise<TResponse> {
  const parsedPayload = payloadSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new AppError(
      "IPC_INVALID_PAYLOAD",
      parsedPayload.error.flatten().formErrors.join("; ") || "Invalid payload"
    );
  }

  let response: unknown;
  try {
    if (!hasTauriRuntime()) {
      const hint = isUiDevWithoutTauri()
        ? "Tauri runtime is unavailable in `ui:dev`. Use `pnpm -C desktop dev` for full backend behavior."
        : "Tauri runtime is unavailable.";
      throw new AppError("IPC_UNAVAILABLE", hint);
    }
    response = await invoke(command, parsedPayload.data as Record<string, unknown>);
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError(
      "IPC_COMMAND_FAILED",
      err instanceof Error ? err.message : String(err)
    );
  }

  const parsedResponse = responseSchema.safeParse(response);
  if (!parsedResponse.success) {
    throw new AppError(
      "IPC_INVALID_RESPONSE",
      parsedResponse.error.flatten().formErrors.join("; ") || "Invalid response"
    );
  }

  return parsedResponse.data;
}
