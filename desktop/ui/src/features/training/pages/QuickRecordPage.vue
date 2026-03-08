<script setup lang="ts">
import { RouterLink } from "vue-router";
import AudioRecorder from "@/components/AudioRecorder.vue";
import { useQuickRecordPageState } from "@/features/training/composables/useQuickRecordPageState";

const { t, activeProfileId } = useQuickRecordPageState();
</script>

<template>
  <section class="space-y-6">
    <header class="space-y-2">
      <h1 class="app-text text-2xl font-semibold tracking-tight">
        {{ t("quick_record.title") }}
      </h1>
      <p class="app-muted text-sm">
        {{ t("quick_record.subtitle") }}
      </p>
    </header>

    <UCard v-if="!activeProfileId" class="app-panel app-panel-compact" variant="outline">
      <p class="app-muted text-sm">{{ t("quick_record.need_profile") }}</p>
      <RouterLink class="app-link mt-3 inline-block text-xs underline" to="/profiles">
        {{ t("quick_record.setup_profile") }}
      </RouterLink>
    </UCard>

    <div v-else class="space-y-4">
      <AudioRecorder
        title-key="quick_record.audio_title"
        subtitle-key="quick_record.audio_subtitle"
        :show-pass-label="false"
        :can-analyze="false"
      />
      <p class="app-muted text-xs">
        {{ t("quick_record.transcribe_optional_hint") }}
      </p>
    </div>
  </section>
</template>

