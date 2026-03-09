import { ref, type Ref } from "vue";
import {
  RAW_CHUNK_STEP_MS,
  TIMELINE_MARKER_STEP_MS,
  type CleanAnchor,
  type RawTimelineChunk,
  type RecorderQuickCleanPanelProps,
  type TimelineMarker,
} from "@/components/recorder/composables/quickClean/quickClean.types";

/**
 * Creates and returns the create anchor map exporter contract.
 */
export function createAnchorMapExporter(options: {
  props: RecorderQuickCleanPanelProps;
  rawTranscriptDurationMs: Ref<number>;
  timelineMarkers: Ref<TimelineMarker[]>;
  rawTimelineChunks: Ref<RawTimelineChunk[]>;
  cleanTextAnchors: Ref<CleanAnchor[]>;
}) {
  const { props, rawTranscriptDurationMs, timelineMarkers, rawTimelineChunks, cleanTextAnchors } =
    options;
  const anchorMapCopied = ref(false);

  async function exportAnchorMapJson() {
    if (!props.hasTranscript) {
      return;
    }

    const payload = {
      schemaVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      timelineMarkerStepMs: TIMELINE_MARKER_STEP_MS,
      rawChunkStepMs: RAW_CHUNK_STEP_MS,
      durationMs: rawTranscriptDurationMs.value,
      timelineMarkers: timelineMarkers.value,
      rawChunks: rawTimelineChunks.value,
      cleanAnchors: cleanTextAnchors.value,
    };
    const json = JSON.stringify(payload, null, 2);

    try {
      await navigator.clipboard.writeText(json);
      anchorMapCopied.value = true;
      setTimeout(() => {
        anchorMapCopied.value = false;
      }, 3000);
      return;
    } catch {
      // Clipboard unavailable, fall back to blob download.
    }

    const blob = new Blob([json], { type: "application/json" });
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = `lepupitre-anchor-map-${Date.now()}.json`;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(blobUrl);
  }

  return {
    anchorMapCopied,
    exportAnchorMapJson,
  };
}
