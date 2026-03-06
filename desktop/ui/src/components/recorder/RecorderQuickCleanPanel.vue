<script setup lang="ts">
import { useI18n } from "@/lib/i18n";
import { formatTrimClock } from "@/lib/recorderTrim";
import RecorderWaveform from "./RecorderWaveform.vue";
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
  transcriptTextareaRef,
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
</script>

<template>
  <div class="space-y-4">
    <!-- Primary CTA bar -->
    <div class="flex items-center gap-3">
      <UButton
       
        size="lg"
        :disabled="props.reviewCta.disabled"
        color="info"
       @click="handlePrimaryCta">
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

        <!-- Onboarding card: shown when no transcript exists yet (including during transcribing) -->
        <UCard
          v-if="!props.hasTranscript && showOnboarding"
          as="section"
         
          class="app-panel app-panel-compact space-y-3"
         variant="outline">
          <h3 class="app-text font-semibold">{{ t("audio.review_onboarding_title") }}</h3>
          <p class="app-muted app-text-meta">{{ t("audio.review_onboarding_hint") }}</p>

          <UFormField :label="t('audio.review_onboarding_audience')" class="app-text app-text-meta">
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="option in AUDIENCE_OPTIONS"
                :key="option"
                size="sm"
                color="neutral" :variant="onboardingAudience === option ? 'ghost' : 'outline'"
                :class="onboardingAudience === option ? 'app-pill-active-neutral font-semibold' : ''"
                @click="selectAudience(option)"
              >
                {{ t(`audio.review_onboarding_audience_${option}`) }}
              </UButton>
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
          </UFormField>

          <UFormField :label="t('audio.review_onboarding_goal')" class="app-text app-text-meta">
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="option in GOAL_OPTIONS"
                :key="option"
                size="sm"
                color="neutral" :variant="onboardingGoal === option ? 'ghost' : 'outline'"
                :class="onboardingGoal === option ? 'app-pill-active-neutral font-semibold' : ''"
                @click="selectGoal(option)"
              >
                {{ t(`audio.review_onboarding_goal_${option}`) }}
              </UButton>
            </div>
          </UFormField>

          <UFormField :label="t('audio.review_onboarding_duration')" class="app-text app-text-meta">
            <UInput
              v-model.number="onboardingTargetMinutes"
              class="w-32 app-text-body text-sm"
              size="sm"
              type="number"
              min="1"
              max="120"
              @input="emitOnboardingContext"
            />
          </UFormField>

          <UButton
           
            size="sm"
            color="neutral"
           variant="outline" @click="skipOnboarding">
            {{ t("audio.review_onboarding_skip") }}
          </UButton>
        </UCard>

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
        <UCard as="section" class="app-panel app-panel-compact space-y-3" variant="outline">
          <h3 class="app-text font-semibold">{{ t("audio.quick_clean_timeline_title") }}</h3>
          <p class="app-muted app-text-meta">{{ t("audio.quick_clean_timeline_hint") }}</p>
          <div v-if="timelineMarkers.length > 0" class="max-h-44 space-y-2 overflow-y-auto pr-1">
            <UButton
              v-for="marker in timelineMarkers"
              :key="marker.atMs"
             
              size="sm"
              class="w-full justify-start gap-3 rounded-lg px-3 py-2 text-left"
              color="neutral"
             variant="ghost" @click="seekAudio(marker.atMs)">
              <span class="app-pill-active-neutral inline-flex min-w-[3.5rem] justify-center rounded-full px-2 py-1 text-xs">
                {{ marker.label }}
              </span>
              <span class="app-text-body line-clamp-2">{{ marker.preview }}</span>
            </UButton>
          </div>
          <p v-else class="app-muted app-text-meta">{{ t("audio.quick_clean_timeline_empty") }}</p>
        </UCard>

        <UCard as="section" class="app-panel app-panel-compact space-y-3" variant="outline">
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
              <UButton
                v-for="(anchor, index) in cleanTextAnchors"
                :key="`${anchor.startMs}-${anchor.endMs}-${index}`"
               
                size="sm"
                class="w-full justify-start items-start gap-3 rounded-lg px-3 py-2 text-left"
                color="neutral"
               variant="ghost" @click="seekAudio(anchor.startMs)">
                <span class="app-pill-active-neutral inline-flex min-w-[3.5rem] justify-center rounded-full px-2 py-1 text-xs">
                  {{ formatTimelineClock(anchor.startMs) }}
                </span>
                <span class="app-text-body line-clamp-2">{{ anchor.line }}</span>
              </UButton>
            </div>
            <p v-else class="app-muted app-text-meta">{{ t("audio.quick_clean_timeline_empty") }}</p>
          </details>
          <div class="flex flex-wrap items-center gap-2">
            <UButton
             
              size="sm"
              :disabled="cleanTextAnchors.length === 0"
              color="neutral"
             variant="outline" @click="exportAnchorMapJson">
              {{ anchorMapCopied ? t("audio.quick_clean_export_anchor_map_copied") : t("audio.quick_clean_export_anchor_map") }}
            </UButton>
            <span class="app-muted app-text-meta">
              {{ t("audio.quick_clean_export_anchor_map_hint") }}
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UButton
             
              size="lg"
              :disabled="props.isSavingEdited || props.isApplyingTrim || !props.transcriptText.trim()"
              color="primary"
             @click="emit('saveEdited')">
              {{ t("audio.quick_clean_save_edited") }}
            </UButton>
            <UButton
             
              size="lg"
              :disabled="props.isSavingEdited || props.isApplyingTrim || !props.transcriptText.trim()"
              color="neutral"
             variant="outline" @click="emit('autoCleanFillers')">
              {{ t("audio.quick_clean_auto_clean") }}
            </UButton>
            <UButton
             
              size="lg"
              :disabled="props.isSavingEdited || props.isApplyingTrim || !props.transcriptText.trim()"
              color="neutral"
             variant="outline" @click="emit('fixPunctuation')">
              {{ t("audio.quick_clean_fix_punctuation") }}
            </UButton>
          </div>
        </UCard>

        <details class="app-radius-panel-md space-y-3 border bg-[var(--color-surface-elevated)] p-4">
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
              <UButton size="sm" class="app-link text-xs underline" color="neutral" variant="ghost" @click="seekAudio(chunk.startMs)">
                {{ formatTimelineClock(chunk.startMs) }} - {{ formatTimelineClock(chunk.endMs) }}
              </UButton>
              <p class="mt-1 app-text-body">{{ chunk.text }}</p>
            </div>
          </div>
          <p v-else class="app-muted app-text-meta">{{ t("audio.quick_clean_timeline_empty") }}</p>
        </details>
      </div>
    </div>

    <!-- Bottom: open original + continue secondary + trim panel -->
    <div class="flex flex-wrap items-center gap-2">
      <UButton
       
        size="lg"
        :disabled="!props.canOpenOriginal || props.isRevealing"
        color="neutral"
       variant="outline" @click="emit('openOriginal')">
        {{ t("audio.quick_clean_open_original") }}
      </UButton>
      <UButton
       
        size="lg"
        :disabled="!props.hasTranscript || props.isApplyingTrim"
        color="neutral"
       variant="outline" @click="emit('continue')">
        {{ t("audio.quick_clean_continue") }}
      </UButton>
    </div>

    <details class="app-radius-panel-md space-y-3 border bg-[var(--color-surface-elevated)] p-4">
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
          <UButton
           
            size="sm"
            :disabled="!hasTrimSourceDuration || props.isApplyingTrim"
            color="neutral"
           variant="outline" @click="resetTrimWindow">
            {{ t("audio.quick_clean_trim_reset") }}
          </UButton>
        </div>
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs">
            <span class="app-subtle">{{ t("audio.quick_clean_trim_start") }}</span>
            <span class="app-text">{{ formatTrimClock(trimStartSec) }}</span>
          </div>
          <USlider
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
          <USlider
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
        <UButton
         
          size="lg"
          :disabled="!props.canApplyTrim || !trimDirty || props.isApplyingTrim"
          color="neutral"
         variant="outline" @click="applyTrim">
          {{ props.isApplyingTrim ? t("audio.quick_clean_trim_applying") : t("audio.quick_clean_trim_apply") }}
        </UButton>
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

