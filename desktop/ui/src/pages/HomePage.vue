<script setup lang="ts">
import { computed, onMounted } from "vue";
import { RouterLink } from "vue-router";
import AudioRecorder from "../components/AudioRecorder.vue";
import SecurityProbe from "../components/SecurityProbe.vue";
import { appStore } from "../stores/app";

const state = computed(() => appStore.state);
const activeProfileName = computed(() => {
  const activeId = appStore.state.activeProfileId;
  if (!activeId) {
    return null;
  }
  return appStore.state.profiles.find((profile) => profile.id === activeId)?.name ?? null;
});

onMounted(() => {
  appStore.bootstrap();
});
</script>

<template>
  <section class="space-y-6">
    <div class="space-y-2">
      <h1 class="text-2xl font-semibold">Home</h1>
      <p class="text-sm text-slate-400">Daily quest loop, local-first.</p>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div class="text-xs uppercase tracking-[0.2em] text-slate-400">Talk</div>
        <div class="mt-2 text-sm text-slate-100">
          <span v-if="state.activeProject">{{ state.activeProject.title }}</span>
          <span v-else>No active talk</span>
        </div>
        <RouterLink class="mt-3 inline-block text-xs text-emerald-300 underline" to="/project/new">
          Set up talk
        </RouterLink>
      </div>

      <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div class="text-xs uppercase tracking-[0.2em] text-slate-400">Profile</div>
        <div class="mt-2 text-sm text-slate-100">
          <span v-if="state.activeProfileId">
            Active: {{ activeProfileName || state.activeProfileId }}
          </span>
          <span v-else>No active profile</span>
        </div>
        <RouterLink class="mt-3 inline-block text-xs text-emerald-300 underline" to="/profiles">
          Manage profiles
        </RouterLink>
      </div>
    </div>

    <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div class="text-xs uppercase tracking-[0.2em] text-slate-400">Daily quest</div>
      <div v-if="state.dailyQuest" class="mt-2 space-y-2">
        <div class="text-sm text-slate-100">{{ state.dailyQuest.quest.title }}</div>
        <div class="text-xs text-slate-400">{{ state.dailyQuest.quest.prompt }}</div>
        <RouterLink
          class="mt-2 inline-block text-xs text-emerald-300 underline"
          :to="`/quest/${state.dailyQuest.quest.code}`"
        >
          Start quest
        </RouterLink>
      </div>
      <div v-else class="mt-2 text-sm text-slate-500">
        Create a profile and project to load quests.
      </div>
    </div>

    <AudioRecorder />
    <SecurityProbe />
  </section>
</template>
