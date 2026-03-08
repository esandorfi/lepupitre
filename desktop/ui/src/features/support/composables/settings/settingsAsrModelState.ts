import { ref, type Ref } from "vue";
import type { AsrModelStatus } from "@/schemas/ipc";
import type { RuntimeErrorCategory } from "@/features/shared/runtime/runtimeContract";

type Translate = (key: string) => string;
export type SidecarStatus = "ready" | "missing" | "incompatible" | "unknown";
export type DownloadProgress = { downloadedBytes: number; totalBytes: number };

export type AsrModelState = {
  models: Ref<AsrModelStatus[]>;
  isLoadingModels: Ref<boolean>;
  downloadingModelId: Ref<string | null>;
  sidecarStatus: Ref<SidecarStatus>;
  sidecarMessage: Ref<string | null>;
  verifyingModelId: Ref<string | null>;
  downloadError: Ref<string | null>;
  downloadErrorCategory: Ref<RuntimeErrorCategory | null>;
  downloadProgress: Ref<Record<string, DownloadProgress>>;
};

export function createAsrModelState(): AsrModelState {
  return {
    models: ref<AsrModelStatus[]>([]),
    isLoadingModels: ref(false),
    downloadingModelId: ref<string | null>(null),
    sidecarStatus: ref<SidecarStatus>("unknown"),
    sidecarMessage: ref<string | null>(null),
    verifyingModelId: ref<string | null>(null),
    downloadError: ref<string | null>(null),
    downloadErrorCategory: ref<RuntimeErrorCategory | null>(null),
    downloadProgress: ref<Record<string, DownloadProgress>>({}),
  };
}

export function formatBytes(value?: number | null) {
  if (!value || value <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function sidecarMessageForCode(code: string | null, t: Translate) {
  if (code === "sidecar_missing") {
    return {
      status: "missing" as const,
      message: t("settings.transcription.sidecar_missing"),
    };
  }
  if (code === "sidecar_incompatible") {
    return {
      status: "incompatible" as const,
      message: t("settings.transcription.sidecar_incompatible"),
    };
  }
  return {
    status: "unknown" as const,
    message: t("settings.transcription.sidecar_unknown"),
  };
}
