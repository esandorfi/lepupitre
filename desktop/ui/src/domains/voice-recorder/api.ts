import { invokeChecked } from "@/composables/useIpc";
import { VoiceMemoDeletePayloadSchema, VoidResponseSchema } from "@/schemas/ipc";
import {
  recordingStart,
  recordingPause,
  recordingResume,
  recordingStop,
} from "@/domains/recorder/api";

export async function voiceMemoStart(profileId: string, inputDeviceId?: string | null) {
  return recordingStart({
    profileId,
    asrSettings: { mode: "final-only" },
    inputDeviceId,
  });
}

export async function voiceMemoPause(recordingId: string) {
  return recordingPause(recordingId);
}

export async function voiceMemoResume(recordingId: string) {
  return recordingResume(recordingId);
}

export async function voiceMemoStop(profileId: string, recordingId: string) {
  return recordingStop(profileId, recordingId);
}

export async function voiceMemoDelete(path: string) {
  await invokeChecked("voice_memo_delete", VoiceMemoDeletePayloadSchema, VoidResponseSchema, {
    path,
  });
}
