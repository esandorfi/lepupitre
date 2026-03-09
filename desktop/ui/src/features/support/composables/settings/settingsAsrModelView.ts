import { computed } from "vue";
import {
  formatBytes,
  type AsrModelState,
} from "@/features/support/composables/settings/settingsAsrModelState";

type Translate = (key: string) => string;

/**
 * Creates and returns the create asr model view contract.
 */
export function createAsrModelView(t: Translate, state: AsrModelState) {
  const modelOptions = computed(() =>
    state.models.value.map((model) => {
      const label =
        model.id === "tiny"
          ? t("settings.transcription.model_tiny")
          : t("settings.transcription.model_base");
      let statusKey = "settings.transcription.model_status_missing";
      if (model.checksum_ok === false) {
        statusKey = "settings.transcription.model_status_invalid";
      } else if (model.installed && model.checksum_ok == null) {
        statusKey = "settings.transcription.model_status_unverified";
      } else if (model.installed) {
        statusKey = "settings.transcription.model_status_ready";
      } else if (model.bundled) {
        statusKey = "settings.transcription.model_status_missing_bundled";
      }
      return {
        id: model.id,
        label,
        installed: model.installed,
        expectedBytes: model.expected_bytes,
        checksum: model.expected_sha256,
        sourceUrl: model.source_url,
        checksumOk: model.checksum_ok,
        status: t(statusKey),
      };
    })
  );

  const modelSelectOptions = computed(() =>
    modelOptions.value.map((option) => ({
      value: option.id,
      label: `${option.label} - ${option.status}`,
      disabled: !option.installed,
    }))
  );

  const sidecarBadgeTone = computed<"error" | "neutral" | "success">(() => {
    if (state.sidecarStatus.value === "ready") {
      return "success";
    }
    if (
      state.sidecarStatus.value === "missing" ||
      state.sidecarStatus.value === "incompatible"
    ) {
      return "error";
    }
    return "neutral";
  });

  const sidecarStatusLabel = computed(() => {
    if (state.sidecarStatus.value === "ready") {
      return t("settings.transcription.sidecar_ready");
    }
    if (state.sidecarStatus.value === "missing") {
      return t("settings.transcription.sidecar_missing_label");
    }
    if (state.sidecarStatus.value === "incompatible") {
      return t("settings.transcription.sidecar_incompatible_label");
    }
    return t("settings.transcription.sidecar_unknown_label");
  });

  function shortHash(value: string) {
    return value.slice(0, 8);
  }

  function progressPercent(modelId: string) {
    const progress = state.downloadProgress.value[modelId];
    if (!progress || progress.totalBytes <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((progress.downloadedBytes / progress.totalBytes) * 100));
  }

  function progressLabel(modelId: string) {
    const progress = state.downloadProgress.value[modelId];
    if (!progress) {
      return "";
    }
    if (progress.totalBytes > 0) {
      return `${formatBytes(progress.downloadedBytes)} / ${formatBytes(progress.totalBytes)}`;
    }
    return formatBytes(progress.downloadedBytes);
  }

  return {
    modelOptions,
    modelSelectOptions,
    sidecarBadgeTone,
    sidecarStatusLabel,
    shortHash,
    progressPercent,
    progressLabel,
  };
}
