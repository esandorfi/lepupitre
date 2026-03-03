<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppPanel from "@/components/ui/AppPanel.vue";
import AppRange from "@/components/ui/AppRange.vue";
import { useI18n } from "@/lib/i18n";
import type { ReviewState, ReviewCtaConfig } from "@/lib/recorderFlow";
import { formatTrimClock, normalizeTrimWindow } from "@/lib/recorderTrim";
import type { WaveformStyle } from "@/lib/waveform";
import type { TranscriptSegment } from "@/schemas/ipc";
import RecorderWaveform from "./RecorderWaveform.vue";

const AUDIENCE_OPTIONS = ["team", "conference", "client", "other"] as const;
const GOAL_OPTIONS = ["inform", "persuade", "instruct", "inspire"] as const;

const props = defineProps<{
  transcriptText: string;
  rawTranscriptSegments: TranscriptSegment[];
  sourceDurationSec: number | null;
  hasTranscript: boolean;
  isTranscribing: boolean;
  transcribeProgress: number;
  transcribeStageLabel: string | null;
  canTranscribe: boolean;
  showTranscribeBlockedHint: boolean;
  transcribeBlockedMessage: string | null;
  isSavingEdited: boolean;
  canOpenOriginal: boolean;
  isRevealing: boolean;
  isApplyingTrim: boolean;
  canApplyTrim: boolean;
  audioPreviewSources: string[];
  waveformPeaks: number[];
  waveformStyle: WaveformStyle;
  reviewState: ReviewState;
  reviewCta: ReviewCtaConfig;
  canAnalyze: boolean;
  hasAnalysisResult: boolean;
}>();

const emit = defineEmits<{
  (event: "update:transcriptText", value: string): void;
  (event: "transcribe"): void;
  (event: "saveEdited"): void;
  (event: "autoCleanFillers"): void;
  (event: "fixPunctuation"): void;
  (event: "openOriginal"): void;
  (event: "applyTrim", value: { startMs: number; endMs: number }): void;
  (event: "continue"): void;
  (event: "viewFeedback"): void;
  (event: "analyze"): void;
  (event: "onboardingContext", value: {
    audience: string;
    audienceCustom: string;
    goal: string;
    targetMinutes: number | null;
  }): void;
}>();

const { t } = useI18n();
const TIMELINE_MARKER_STEP_MS = 30_000;
const RAW_CHUNK_STEP_MS = 10_000;
const trimStartSec = ref(0);
const trimEndSec = ref(0);
const audioPreviewRef = ref<HTMLAudioElement | null>(null);
const transcriptTextareaRef = ref<HTMLTextAreaElement | null>(null);
const trimDurationSec = computed(() => Math.max(0, trimEndSec.value - trimStartSec.value));
const hasTrimSourceDuration = computed(
  () => typeof props.sourceDurationSec === "number" && props.sourceDurationSec > 0
);
const trimMaxSec = computed(() => (hasTrimSourceDuration.value ? props.sourceDurationSec ?? 0 : 0));
const trimDirty = computed(
  () =>
    hasTrimSourceDuration.value &&
    (trimStartSec.value > 0.001 || Math.abs(trimEndSec.value - trimMaxSec.value) > 0.001)
);

const showOnboarding = ref(true);
const onboardingAudience = ref("");
const onboardingAudienceCustom = ref("");
const onboardingGoal = ref("");
const onboardingTargetMinutes = ref<number | null>(null);

const showTranscriptWorkspace = computed(
  () => props.reviewState === "review_transcript_ready" || props.reviewState === "review_analysis_ready"
);

function handlePrimaryCta() {
  switch (props.reviewCta.actionName) {
    case "transcribe":
      emit("transcribe");
      break;
    case "analyze":
      emit("analyze");
      break;
    case "view_feedback":
      emit("viewFeedback");
      break;
    case "export_fallback":
      emit("continue");
      break;
  }
}

function selectAudience(value: string) {
  onboardingAudience.value = onboardingAudience.value === value ? "" : value;
  if (onboardingAudience.value !== "other") {
    onboardingAudienceCustom.value = "";
  }
  emitOnboardingContext();
}

function selectGoal(value: string) {
  onboardingGoal.value = onboardingGoal.value === value ? "" : value;
  emitOnboardingContext();
}

function emitOnboardingContext() {
  emit("onboardingContext", {
    audience: onboardingAudience.value,
    audienceCustom: onboardingAudienceCustom.value,
    goal: onboardingGoal.value,
    targetMinutes: onboardingTargetMinutes.value,
  });
}

function skipOnboarding() {
  showOnboarding.value = false;
}

function applyTrim() {
  if (!trimDirty.value || props.isApplyingTrim) {
    return;
  }
  const startMs = Math.round(trimStartSec.value * 1000);
  const endMs = Math.round(trimEndSec.value * 1000);
  if (endMs <= startMs) {
    return;
  }
  emit("applyTrim", { startMs, endMs });
}

function applyTrimWindow(startSec: number, endSec: number) {
  const normalized = normalizeTrimWindow(trimMaxSec.value, startSec, endSec);
  if (trimStartSec.value !== normalized.startSec) {
    trimStartSec.value = normalized.startSec;
  }
  if (trimEndSec.value !== normalized.endSec) {
    trimEndSec.value = normalized.endSec;
  }
}

function onTrimStartInput(value: number) {
  if (Number.isNaN(value)) {
    return;
  }
  applyTrimWindow(value, trimEndSec.value);
}

function onTrimEndInput(value: number) {
  if (Number.isNaN(value)) {
    return;
  }
  applyTrimWindow(trimStartSec.value, value);
}

function resetTrimWindow() {
  applyTrimWindow(0, trimMaxSec.value);
}

const rawTranscriptSegmentsSorted = computed(() => {
  return [...props.rawTranscriptSegments].sort((a, b) => a.t_start_ms - b.t_start_ms);
});

const rawTranscriptDurationMs = computed(() => {
  const lastSegment =
    rawTranscriptSegmentsSorted.value[rawTranscriptSegmentsSorted.value.length - 1] ?? null;
  const fromSegments = lastSegment?.t_end_ms ?? 0;
  const fromAudio = Math.round((props.sourceDurationSec ?? 0) * 1000);
  return Math.max(fromSegments, fromAudio, 0);
});

function formatTimelineClock(totalMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function resolveWindowText(startMs: number, endMs: number): string {
  return rawTranscriptSegmentsSorted.value
    .filter((segment) => segment.t_end_ms > startMs && segment.t_start_ms < endMs)
    .map((segment) => segment.text.trim())
    .filter((text) => text.length > 0)
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function compactPreview(value: string, max = 120): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max).trimEnd()}...`;
}

const timelineMarkers = computed(() => {
  if (!props.hasTranscript || rawTranscriptDurationMs.value <= 0) {
    return [] as Array<{ atMs: number; label: string; preview: string }>;
  }

  const markers: Array<{ atMs: number; label: string; preview: string }> = [];
  for (let atMs = 0; atMs <= rawTranscriptDurationMs.value; atMs += TIMELINE_MARKER_STEP_MS) {
    const preview = resolveWindowText(atMs, atMs + RAW_CHUNK_STEP_MS);
    markers.push({
      atMs,
      label: formatTimelineClock(atMs),
      preview:
        preview.length > 0 ? compactPreview(preview) : t("audio.quick_clean_timeline_empty"),
    });
  }

  return markers;
});

const rawTimelineChunks = computed(() => {
  if (!props.hasTranscript || rawTranscriptDurationMs.value <= 0) {
    return [] as Array<{ startMs: number; endMs: number; text: string }>;
  }

  const chunks: Array<{ startMs: number; endMs: number; text: string }> = [];
  for (
    let startMs = 0;
    startMs < rawTranscriptDurationMs.value;
    startMs += RAW_CHUNK_STEP_MS
  ) {
    const endMs = Math.min(rawTranscriptDurationMs.value, startMs + RAW_CHUNK_STEP_MS);
    const text = resolveWindowText(startMs, endMs);
    if (!text) {
      continue;
    }
    chunks.push({ startMs, endMs, text });
  }
  return chunks;
});

function normalizeTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function tokenOverlapScore(left: string, right: string): number {
  const leftTokens = normalizeTokens(left);
  const rightTokens = new Set(normalizeTokens(right));
  if (leftTokens.length === 0 || rightTokens.size === 0) {
    return 0;
  }
  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }
  return overlap / leftTokens.length;
}

function resolveChunkForLine(
  line: string,
  lineIndex: number,
  totalLines: number,
  chunks: Array<{ startMs: number; endMs: number; text: string }>
) {
  const fallbackIndex = Math.min(
    chunks.length - 1,
    Math.floor((lineIndex * chunks.length) / Math.max(totalLines, 1))
  );
  let bestIndex = fallbackIndex;
  let bestScore = 0;

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
    const score = tokenOverlapScore(line, chunks[chunkIndex]?.text ?? "");
    if (score > bestScore) {
      bestScore = score;
      bestIndex = chunkIndex;
    }
  }

  return chunks[bestIndex] ?? chunks[fallbackIndex];
}

const cleanTextLineAnchors = computed(() => {
  const lines = props.transcriptText.split("\n");
  const chunks = rawTimelineChunks.value;
  if (!props.hasTranscript || lines.length === 0 || chunks.length === 0) {
    return [] as Array<{ line: string; startMs: number; endMs: number } | null>;
  }

  return lines.map((line, lineIndex) => {
    const normalized = line.trim();
    if (!normalized) {
      return null;
    }
    const chunk = resolveChunkForLine(normalized, lineIndex, lines.length, chunks);
    return {
      line: normalized,
      startMs: chunk.startMs,
      endMs: chunk.endMs,
    };
  });
});

const cleanTextAnchors = computed(() => {
  const lines = props.transcriptText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const chunks = rawTimelineChunks.value;
  if (!props.hasTranscript || lines.length === 0 || chunks.length === 0) {
    return [] as Array<{ line: string; startMs: number; endMs: number }>;
  }

  return lines.map((line, index) => {
    const primary = resolveChunkForLine(line, index, lines.length, chunks);
    return {
      line,
      startMs: primary.startMs,
      endMs: primary.endMs,
    };
  });
});

function seekToCaretAnchor(event: Event) {
  const target = event.target as HTMLTextAreaElement | null;
  if (!target) {
    return;
  }
  const anchors = cleanTextLineAnchors.value;
  if (anchors.length === 0) {
    return;
  }
  const caretIndex = target.selectionStart ?? 0;
  const lineIndex = props.transcriptText.slice(0, caretIndex).split("\n").length - 1;
  const safeLineIndex = Math.max(0, Math.min(anchors.length - 1, lineIndex));
  const anchor = anchors[safeLineIndex];
  if (!anchor) {
    return;
  }
  seekAudio(anchor.startMs);
}

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

  // Try clipboard first (reliable in Tauri webview)
  try {
    await navigator.clipboard.writeText(json);
    anchorMapCopied.value = true;
    setTimeout(() => { anchorMapCopied.value = false; }, 3000);
    return;
  } catch {
    // Clipboard unavailable, fall back to blob download
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

function seekAudio(ms: number) {
  const audioElement = audioPreviewRef.value;
  if (!audioElement) {
    return;
  }
  audioElement.currentTime = Math.max(0, ms / 1000);
  if (audioElement.paused) {
    void audioElement.play().catch(() => undefined);
  }
}

watch(
  () => props.sourceDurationSec,
  (nextDuration) => {
    if (typeof nextDuration !== "number" || nextDuration <= 0) {
      trimStartSec.value = 0;
      trimEndSec.value = 0;
      return;
    }
    applyTrimWindow(0, nextDuration);
  },
  { immediate: true }
);
</script>

<template>
  <div class="space-y-4">
    <!-- Primary CTA bar -->
    <div class="flex items-center gap-3">
      <AppButton
        tone="info"
        size="lg"
        :disabled="props.reviewCta.disabled"
        @click="handlePrimaryCta"
      >
        {{ t(props.reviewCta.labelKey) }}
        <span v-if="props.reviewCta.progressPercent !== null" class="ml-2 app-text-meta">
          {{ props.reviewCta.progressPercent }}%
        </span>
      </AppButton>
      <span
        v-if="props.reviewCta.progressPercent !== null && props.transcribeStageLabel"
        class="app-muted app-text-meta"
      >
        ({{ props.transcribeStageLabel }})
      </span>
      <p
        v-if="props.showTranscribeBlockedHint && props.transcribeBlockedMessage"
        class="app-muted app-text-meta"
      >
        {{ props.transcribeBlockedMessage }}
      </p>
    </div>

    <!-- Responsive grid: 2-col on md+ when transcript exists, 1-col otherwise -->
    <div
      class="grid gap-4"
      :class="showTranscriptWorkspace ? 'md:grid-cols-2' : 'md:grid-cols-1'"
    >
      <!-- LEFT column: Playback + onboarding + transcription progress -->
      <div class="space-y-4">
        <AppPanel as="section" variant="compact" class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <h3 class="app-text font-semibold">{{ t("audio.quick_clean_playback_title") }}</h3>
          </div>
          <p class="app-muted app-text-meta">{{ t("audio.quick_clean_playback_hint") }}</p>
          <div class="space-y-2">
            <RecorderWaveform :peaks="props.waveformPeaks" :style-mode="props.waveformStyle" />
            <audio
              v-if="props.audioPreviewSources.length > 0"
              ref="audioPreviewRef"
              :key="props.audioPreviewSources.join('|')"
              class="w-full"
              controls
              preload="metadata"
            >
              <source
                v-for="source in props.audioPreviewSources"
                :key="source"
                :src="source"
                type="audio/wav"
              />
            </audio>
          </div>
        </AppPanel>

        <!-- Onboarding card: shown when no transcript exists yet (including during transcribing) -->
        <AppPanel
          v-if="!props.hasTranscript && showOnboarding"
          as="section"
          variant="compact"
          class="space-y-3"
        >
          <h3 class="app-text font-semibold">{{ t("audio.review_onboarding_title") }}</h3>
          <p class="app-muted app-text-meta">{{ t("audio.review_onboarding_hint") }}</p>

          <div class="space-y-2">
            <label class="app-text app-text-meta font-medium">{{ t("audio.review_onboarding_audience") }}</label>
            <div class="flex flex-wrap gap-2">
              <AppButton
                v-for="option in AUDIENCE_OPTIONS"
                :key="option"
                size="sm"
                :tone="onboardingAudience === option ? 'ghost' : 'secondary'"
                :class="onboardingAudience === option ? 'app-pill-active-neutral font-semibold' : ''"
                @click="selectAudience(option)"
              >
                {{ t(`audio.review_onboarding_audience_${option}`) }}
              </AppButton>
            </div>
            <UInput
              v-if="onboardingAudience === 'other'"
              v-model="onboardingAudienceCustom"
              class="w-full app-text-body text-sm"
              size="sm"
              type="text"
              :placeholder="t('audio.review_onboarding_audience_other')"
              @input="emitOnboardingContext"
            />
          </div>

          <div class="space-y-2">
            <label class="app-text app-text-meta font-medium">{{ t("audio.review_onboarding_goal") }}</label>
            <div class="flex flex-wrap gap-2">
              <AppButton
                v-for="option in GOAL_OPTIONS"
                :key="option"
                size="sm"
                :tone="onboardingGoal === option ? 'ghost' : 'secondary'"
                :class="onboardingGoal === option ? 'app-pill-active-neutral font-semibold' : ''"
                @click="selectGoal(option)"
              >
                {{ t(`audio.review_onboarding_goal_${option}`) }}
              </AppButton>
            </div>
          </div>

          <div class="space-y-2">
            <label class="app-text app-text-meta font-medium">{{ t("audio.review_onboarding_duration") }}</label>
            <UInput
              v-model.number="onboardingTargetMinutes"
              class="w-32 app-text-body text-sm"
              size="sm"
              type="number"
              min="1"
              max="120"
              @input="emitOnboardingContext"
            />
          </div>

          <AppButton
            tone="secondary"
            size="sm"
            @click="skipOnboarding"
          >
            {{ t("audio.review_onboarding_skip") }}
          </AppButton>
        </AppPanel>

        <!-- Transcription progress (transcribing state, inline in left col) -->
        <div
          v-if="props.reviewState === 'review_transcribing'"
          class="app-muted app-text-meta"
        >
          <p class="app-muted app-text-body">
            {{ props.transcribeProgress }}%
            <span v-if="props.transcribeStageLabel">({{ props.transcribeStageLabel }})</span>
          </p>
        </div>

        <!-- No-transcript hint (when onboarding dismissed and not yet transcribing) -->
        <div
          v-if="!props.hasTranscript && !showOnboarding && props.reviewState !== 'review_transcribing'"
          class="space-y-3"
        >
          <p class="app-muted app-text-body">{{ t("audio.quick_clean_transcribe_optional") }}</p>
        </div>
      </div>

      <!-- RIGHT column: Transcript workspace (only when transcript exists) -->
      <div v-if="showTranscriptWorkspace" class="space-y-3">
        <AppPanel as="section" variant="compact" class="space-y-3">
          <h3 class="app-text font-semibold">{{ t("audio.quick_clean_timeline_title") }}</h3>
          <p class="app-muted app-text-meta">{{ t("audio.quick_clean_timeline_hint") }}</p>
          <div v-if="timelineMarkers.length > 0" class="max-h-44 space-y-2 overflow-y-auto pr-1">
            <AppButton
              v-for="marker in timelineMarkers"
              :key="marker.atMs"
              tone="ghost"
              size="sm"
              class="w-full justify-start gap-3 rounded-lg px-3 py-2 text-left"
              @click="seekAudio(marker.atMs)"
            >
              <span class="app-pill-active-neutral inline-flex min-w-[3.5rem] justify-center rounded-full px-2 py-1 text-xs">
                {{ marker.label }}
              </span>
              <span class="app-text-body line-clamp-2">{{ marker.preview }}</span>
            </AppButton>
          </div>
          <p v-else class="app-muted app-text-meta">{{ t("audio.quick_clean_timeline_empty") }}</p>
        </AppPanel>

        <AppPanel as="section" variant="compact" class="space-y-3">
          <h3 class="app-text font-semibold">{{ t("audio.quick_clean_clean_text_title") }}</h3>
          <UTextarea
            ref="transcriptTextareaRef"
            :value="props.transcriptText"
            rows="12"
            class="min-h-56 max-h-[56vh] w-full overflow-y-auto app-text-body"
            style="resize: vertical;"
            :placeholder="t('audio.quick_clean_placeholder')"
            @input="emit('update:transcriptText', ($event.target as HTMLTextAreaElement).value)"
            @click="seekToCaretAnchor"
          />
          <details class="space-y-2">
            <summary class="cursor-pointer app-text-meta app-link">
              <span class="collapse-chevron mr-1" aria-hidden="true">></span>
              {{ t("audio.quick_clean_clean_anchors_title") }}
            </summary>
            <p class="app-muted app-text-meta">{{ t("audio.quick_clean_clean_anchors_hint") }}</p>
            <div v-if="cleanTextAnchors.length > 0" class="max-h-44 space-y-2 overflow-y-auto pr-1">
              <AppButton
                v-for="(anchor, index) in cleanTextAnchors"
                :key="`${anchor.startMs}-${anchor.endMs}-${index}`"
                tone="ghost"
                size="sm"
                class="w-full justify-start items-start gap-3 rounded-lg px-3 py-2 text-left"
                @click="seekAudio(anchor.startMs)"
              >
                <span class="app-pill-active-neutral inline-flex min-w-[3.5rem] justify-center rounded-full px-2 py-1 text-xs">
                  {{ formatTimelineClock(anchor.startMs) }}
                </span>
                <span class="app-text-body line-clamp-2">{{ anchor.line }}</span>
              </AppButton>
            </div>
            <p v-else class="app-muted app-text-meta">{{ t("audio.quick_clean_timeline_empty") }}</p>
          </details>
          <div class="flex flex-wrap items-center gap-2">
            <AppButton
              tone="secondary"
              size="sm"
              :disabled="cleanTextAnchors.length === 0"
              @click="exportAnchorMapJson"
            >
              {{ anchorMapCopied ? t("audio.quick_clean_export_anchor_map_copied") : t("audio.quick_clean_export_anchor_map") }}
            </AppButton>
            <span class="app-muted app-text-meta">
              {{ t("audio.quick_clean_export_anchor_map_hint") }}
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <AppButton
              tone="primary"
              size="lg"
              :disabled="props.isSavingEdited || props.isApplyingTrim || !props.transcriptText.trim()"
              @click="emit('saveEdited')"
            >
              {{ t("audio.quick_clean_save_edited") }}
            </AppButton>
            <AppButton
              tone="secondary"
              size="lg"
              :disabled="props.isSavingEdited || props.isApplyingTrim || !props.transcriptText.trim()"
              @click="emit('autoCleanFillers')"
            >
              {{ t("audio.quick_clean_auto_clean") }}
            </AppButton>
            <AppButton
              tone="secondary"
              size="lg"
              :disabled="props.isSavingEdited || props.isApplyingTrim || !props.transcriptText.trim()"
              @click="emit('fixPunctuation')"
            >
              {{ t("audio.quick_clean_fix_punctuation") }}
            </AppButton>
          </div>
        </AppPanel>

        <details class="app-card app-radius-panel-md space-y-3 border p-4">
          <summary class="cursor-pointer app-text font-semibold">
            <span class="collapse-chevron mr-1" aria-hidden="true">></span>
            {{ t("audio.quick_clean_raw_chunks_title") }}
          </summary>
          <p class="app-muted app-text-meta">{{ t("audio.quick_clean_raw_chunks_hint") }}</p>
          <div v-if="rawTimelineChunks.length > 0" class="max-h-56 space-y-2 overflow-y-auto pr-1">
            <div
              v-for="chunk in rawTimelineChunks"
              :key="`${chunk.startMs}-${chunk.endMs}`"
              class="app-surface rounded-lg border border-[var(--color-border-muted)] px-3 py-2"
            >
              <AppButton tone="ghost" size="sm" class="app-link text-xs underline" @click="seekAudio(chunk.startMs)">
                {{ formatTimelineClock(chunk.startMs) }} - {{ formatTimelineClock(chunk.endMs) }}
              </AppButton>
              <p class="mt-1 app-text-body">{{ chunk.text }}</p>
            </div>
          </div>
          <p v-else class="app-muted app-text-meta">{{ t("audio.quick_clean_timeline_empty") }}</p>
        </details>
      </div>
    </div>

    <!-- Bottom: open original + continue secondary + trim panel -->
    <div class="flex flex-wrap items-center gap-2">
      <AppButton
        tone="secondary"
        size="lg"
        :disabled="!props.canOpenOriginal || props.isRevealing"
        @click="emit('openOriginal')"
      >
        {{ t("audio.quick_clean_open_original") }}
      </AppButton>
      <AppButton
        tone="secondary"
        size="lg"
        :disabled="!props.hasTranscript || props.isApplyingTrim"
        @click="emit('continue')"
      >
        {{ t("audio.quick_clean_continue") }}
      </AppButton>
    </div>

    <details class="app-card app-radius-panel-md space-y-3 border p-4">
      <summary class="cursor-pointer app-text font-semibold">
        <span class="collapse-chevron mr-1" aria-hidden="true">></span>
        {{ t("audio.quick_clean_trim_advanced_title") }}
      </summary>
      <p class="app-muted app-text-meta">{{ t("audio.quick_clean_trim_hint") }}</p>
      <p v-if="!hasTrimSourceDuration" class="app-muted app-text-meta">
        {{ t("audio.quick_clean_trim_unavailable") }}
      </p>
      <div v-else class="space-y-3">
        <div class="flex items-center justify-between gap-2">
          <span class="app-text font-medium">{{ t("audio.quick_clean_trim_title") }}</span>
          <AppButton
            tone="secondary"
            size="sm"
            :disabled="!hasTrimSourceDuration || props.isApplyingTrim"
            @click="resetTrimWindow"
          >
            {{ t("audio.quick_clean_trim_reset") }}
          </AppButton>
        </div>
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs">
            <span class="app-subtle">{{ t("audio.quick_clean_trim_start") }}</span>
            <span class="app-text">{{ formatTrimClock(trimStartSec) }}</span>
          </div>
          <AppRange
            min="0"
            :max="trimMaxSec"
            step="0.1"
            :model-value="trimStartSec"
            @update:model-value="onTrimStartInput"
          />
        </div>
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs">
            <span class="app-subtle">{{ t("audio.quick_clean_trim_end") }}</span>
            <span class="app-text">{{ formatTrimClock(trimEndSec) }}</span>
          </div>
          <AppRange
            min="0"
            :max="trimMaxSec"
            step="0.1"
            :model-value="trimEndSec"
            @update:model-value="onTrimEndInput"
          />
        </div>
        <div class="app-muted app-text-meta">
          {{ t("audio.quick_clean_trim_duration") }}: {{ formatTrimClock(trimDurationSec) }}
        </div>
        <AppButton
          tone="secondary"
          size="lg"
          :disabled="!props.canApplyTrim || !trimDirty || props.isApplyingTrim"
          @click="applyTrim"
        >
          {{ props.isApplyingTrim ? t("audio.quick_clean_trim_applying") : t("audio.quick_clean_trim_apply") }}
        </AppButton>
      </div>
    </details>
  </div>
</template>

<style scoped>
summary {
  list-style: none;
}

summary::-webkit-details-marker {
  display: none;
}

.collapse-chevron {
  display: inline-block;
  transition: transform 120ms ease-out;
}

details[open] > summary .collapse-chevron {
  transform: rotate(90deg);
}
</style>
