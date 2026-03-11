<script setup lang="ts">
import { ref } from "vue";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useI18n } from "@/lib/i18n";
import { formatDuration } from "@/components/recorder/composables/runtime/audioRecorderCaptureUtils";
import type { VoiceMemo } from "@/features/voice-recorder/stores/voiceMemoStore";

const props = defineProps<{
  memos: VoiceMemo[];
}>();

const emit = defineEmits<{
  (event: "delete", id: string): void;
  (event: "rename", id: string, name: string): void;
}>();

const { t } = useI18n();
const playingId = ref<string | null>(null);
const audioRef = ref<HTMLAudioElement | null>(null);
const confirmDeleteId = ref<string | null>(null);

function audioSrc(path: string): string {
  return convertFileSrc(path);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatMemoDuration(ms: number): string {
  return formatDuration(ms / 1000);
}

function play(memo: VoiceMemo) {
  if (playingId.value === memo.id) {
    audioRef.value?.pause();
    playingId.value = null;
    return;
  }
  playingId.value = memo.id;
  const audio = new Audio(audioSrc(memo.path));
  audioRef.value = audio;
  audio.addEventListener("ended", () => {
    playingId.value = null;
  });
  audio.play();
}

function confirmDelete(id: string) {
  confirmDeleteId.value = id;
}

function cancelDelete() {
  confirmDeleteId.value = null;
}

function executeDelete(id: string) {
  confirmDeleteId.value = null;
  emit("delete", id);
}
</script>

<template>
  <UCard variant="outline" class="app-panel">
    <template #header>
      <span class="app-text text-sm font-semibold uppercase tracking-wider">
        {{ t("voice_recorder.memos_title") }}
      </span>
    </template>

    <div v-if="props.memos.length === 0" class="py-6 text-center">
      <p class="app-muted text-sm">{{ t("voice_recorder.no_memos") }}</p>
    </div>

    <div v-else class="divide-y">
      <div
        v-for="memo in props.memos"
        :key="memo.id"
        class="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
      >
        <UButton
          :icon="playingId === memo.id ? 'i-heroicons-pause-solid' : 'i-heroicons-play-solid'"
          color="neutral"
          variant="ghost"
          size="sm"
          square
          :aria-label="playingId === memo.id ? t('voice_recorder.pause_memo') : t('voice_recorder.play_memo')"
          @click="play(memo)"
        />

        <div class="min-w-0 flex-1">
          <p class="app-text truncate text-sm font-medium">{{ memo.name }}</p>
          <p class="app-muted text-xs">
            {{ formatMemoDuration(memo.durationMs) }} &middot; {{ formatDate(memo.createdAt) }}
          </p>
        </div>

        <div v-if="confirmDeleteId === memo.id" class="flex items-center gap-1">
          <UButton
            color="error"
            variant="soft"
            size="xs"
            @click="executeDelete(memo.id)"
          >
            {{ t("voice_recorder.confirm_delete") }}
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            @click="cancelDelete()"
          >
            {{ t("voice_recorder.cancel") }}
          </UButton>
        </div>
        <UButton
          v-else
          icon="i-heroicons-trash"
          color="neutral"
          variant="ghost"
          size="sm"
          square
          :aria-label="t('voice_recorder.delete_memo')"
          @click="confirmDelete(memo.id)"
        />
      </div>
    </div>
  </UCard>
</template>
