<script setup lang="ts">
import { useI18n } from "@/lib/i18n";
import RecorderWaveform from "@/components/recorder/RecorderWaveform.vue";
import QuickCleanActionBar from "@/components/recorder/quick-clean/QuickCleanActionBar.vue";
import QuickCleanOnboardingSection from "@/components/recorder/quick-clean/QuickCleanOnboardingSection.vue";
import QuickCleanTimelineSection from "@/components/recorder/quick-clean/QuickCleanTimelineSection.vue";
import QuickCleanTranscriptSection from "@/components/recorder/quick-clean/QuickCleanTranscriptSection.vue";
import {
  useRecorderQuickCleanPanel,
  type RecorderQuickCleanPanelEmit,
  type RecorderQuickCleanPanelProps,
} from "@/components/recorder/composables/useRecorderQuickCleanPanel";

const props = defineProps<RecorderQuickCleanPanelProps>();
const emit = defineEmits<RecorderQuickCleanPanelEmit>();
const { t } = useI18n();

const {
  AUDIENCE_OPTIONS,
  GOAL_OPTIONS,
  trimStartSec,
  trimEndSec,
  audioPreviewRef,
  trimDurationSec,
  hasTrimSourceDuration,
  trimMaxSec,
  trimDirty,
  showOnboarding,
  onboardingAudience,
  onboardingAudienceCustom,
  onboardingGoal,
  onboardingTargetMinutes,
  showTranscriptWorkspace,
  handlePrimaryCta,
  selectAudience,
  selectGoal,
  emitOnboardingContext,
  skipOnboarding,
  applyTrim,
  onTrimStartInput,
  onTrimEndInput,
  resetTrimWindow,
  formatTimelineClock,
  timelineMarkers,
  rawTimelineChunks,
  cleanTextAnchors,
  seekToCaretAnchor,
  anchorMapCopied,
  exportAnchorMapJson,
  seekAudio,
} = useRecorderQuickCleanPanel({ props, emit, t });

function handleAudienceCustomUpdate(value: string) {
  onboardingAudienceCustom.value = value;
  emitOnboardingContext();
}

function handleTargetMinutesUpdate(value: number | null) {
  onboardingTargetMinutes.value = value;
  emitOnboardingContext();
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <UButton size="lg" :disabled="props.reviewCta.disabled" color="info" @click="handlePrimaryCta">
        {{ t(props.reviewCta.labelKey) }}
        <span v-if="props.reviewCta.progressPercent !== null" class="ml-2 app-text-meta">
          {{ props.reviewCta.progressPercent }}%
        </span>
      </UButton>
      <span
        v-if="props.reviewCta.progressPercent !== null && props.transcribeStageLabel"
        class="app-muted app-text-meta"
      >
        ({{ props.transcribeStageLabel }})
      </span>
      <p v-if="props.showTranscribeBlockedHint && props.transcribeBlockedMessage" class="app-muted app-text-meta">
        {{ props.transcribeBlockedMessage }}
      </p>
    </div>

    <div class="grid gap-4" :class="showTranscriptWorkspace ? 'md:grid-cols-2' : 'md:grid-cols-1'">
      <div class="space-y-4">
        <UCard as="section" class="app-panel app-panel-compact space-y-3" variant="outline">
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
        </UCard>

        <QuickCleanOnboardingSection
          v-if="!props.hasTranscript && showOnboarding"
          :audience-options="AUDIENCE_OPTIONS"
          :goal-options="GOAL_OPTIONS"
          :audience="onboardingAudience"
          :audience-custom="onboardingAudienceCustom"
          :goal="onboardingGoal"
          :target-minutes="onboardingTargetMinutes"
          @select-audience="selectAudience"
          @update:audience-custom="handleAudienceCustomUpdate"
          @select-goal="selectGoal"
          @update:target-minutes="handleTargetMinutesUpdate"
          @skip="skipOnboarding"
        />

        <div v-if="props.reviewState === 'review_transcribing'" class="app-muted app-text-meta">
          <p class="app-muted app-text-body">
            {{ props.transcribeProgress }}%
            <span v-if="props.transcribeStageLabel">({{ props.transcribeStageLabel }})</span>
          </p>
        </div>

        <div
          v-if="!props.hasTranscript && !showOnboarding && props.reviewState !== 'review_transcribing'"
          class="space-y-3"
        >
          <p class="app-muted app-text-body">{{ t("audio.quick_clean_transcribe_optional") }}</p>
        </div>
      </div>

      <div v-if="showTranscriptWorkspace" class="space-y-3">
        <QuickCleanTimelineSection
          :timeline-markers="timelineMarkers"
          :raw-timeline-chunks="rawTimelineChunks"
          :format-timeline-clock="formatTimelineClock"
          @seek="seekAudio"
        />
        <QuickCleanTranscriptSection
          :transcript-text="props.transcriptText"
          :clean-text-anchors="cleanTextAnchors"
          :anchor-map-copied="anchorMapCopied"
          :is-saving-edited="props.isSavingEdited"
          :is-applying-trim="props.isApplyingTrim"
          :format-timeline-clock="formatTimelineClock"
          @update:transcript-text="emit('update:transcriptText', $event)"
          @seek-caret-anchor="seekToCaretAnchor"
          @seek="seekAudio"
          @export-anchor-map="exportAnchorMapJson"
          @save-edited="emit('saveEdited')"
          @auto-clean-fillers="emit('autoCleanFillers')"
          @fix-punctuation="emit('fixPunctuation')"
        />
      </div>
    </div>

    <QuickCleanActionBar
      :can-open-original="props.canOpenOriginal"
      :is-revealing="props.isRevealing"
      :has-transcript="props.hasTranscript"
      :is-applying-trim="props.isApplyingTrim"
      :has-trim-source-duration="hasTrimSourceDuration"
      :trim-max-sec="trimMaxSec"
      :trim-start-sec="trimStartSec"
      :trim-end-sec="trimEndSec"
      :trim-duration-sec="trimDurationSec"
      :trim-dirty="trimDirty"
      :can-apply-trim="props.canApplyTrim"
      @open-original="emit('openOriginal')"
      @continue="emit('continue')"
      @reset-trim-window="resetTrimWindow"
      @update-trim-start="onTrimStartInput"
      @update-trim-end="onTrimEndInput"
      @apply-trim="applyTrim"
    />
  </div>
</template>

