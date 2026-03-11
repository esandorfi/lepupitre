<script setup lang="ts">
import { computed, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "@/lib/i18n";
import { appState } from "@/stores/appState";
import { useVoiceRecorder } from "@/features/voice-recorder/composables/useVoiceRecorder";
import { createVoiceMemoStore } from "@/features/voice-recorder/stores/voiceMemoStore";
import VoiceRecorderCard from "@/features/voice-recorder/components/VoiceRecorderCard.vue";
import VoiceMemoList from "@/features/voice-recorder/components/VoiceMemoList.vue";

const { t } = useI18n();
const activeProfileId = computed(() => appState.activeProfileId);

const recorder = useVoiceRecorder();
const memoStore = createVoiceMemoStore();

onMounted(() => {
  if (activeProfileId.value) {
    memoStore.load();
  }
});

async function handleStop() {
  const peaks = recorder.waveformPeaks.value.slice();
  const result = await recorder.stop();
  if (result) {
    memoStore.addMemo({
      id: result.artifactId,
      name: `Memo ${new Date().toLocaleTimeString()}`,
      path: result.path,
      durationMs: result.durationMs,
      bytes: result.bytes,
      createdAt: new Date().toISOString(),
      waveformPeaks: peaks,
    });
  }
}
</script>

<template>
  <section class="space-y-6">
    <header class="space-y-2">
      <h1 class="app-text text-2xl font-semibold tracking-tight">
        {{ t("voice_recorder.page_title") }}
      </h1>
      <p class="app-muted text-sm">
        {{ t("voice_recorder.page_subtitle") }}
      </p>
    </header>

    <UCard v-if="!activeProfileId" class="app-panel app-panel-compact" variant="outline">
      <p class="app-muted text-sm">{{ t("voice_recorder.need_profile") }}</p>
      <RouterLink class="app-link mt-3 inline-block text-xs underline" to="/profiles">
        {{ t("voice_recorder.setup_profile") }}
      </RouterLink>
    </UCard>

    <div v-else class="space-y-4">
      <VoiceRecorderCard
        :status="recorder.status.value"
        :duration-ms="recorder.durationMs.value"
        :level="recorder.level.value"
        :waveform-peaks="recorder.waveformPeaks.value"
        :quality-hint-key="recorder.qualityHintKey.value"
        :error="recorder.error.value"
        @start="recorder.start()"
        @pause="recorder.pause()"
        @resume="recorder.resume()"
        @stop="handleStop()"
      />

      <VoiceMemoList
        :memos="memoStore.state.memos"
        @delete="memoStore.removeMemo($event)"
        @rename="memoStore.renameMemo($event, $event)"
      />
    </div>
  </section>
</template>
