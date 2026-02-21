<script setup lang="ts">
import AudioRecorder from "../components/AudioRecorder.vue";
</script>

<template>
  <section class="space-y-6">
    <div class="space-y-2">
      <h1 class="text-2xl font-semibold">Home</h1>
      <p class="text-sm text-slate-400">
        Pass 0 spike: validate WAV 16kHz mono capture + appdata save.
      </p>
    </div>

    <AudioRecorder />
  </section>
</template>
