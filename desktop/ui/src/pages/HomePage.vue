<script setup lang="ts">
import { computed, onMounted } from "vue";
import { RouterLink } from "vue-router";
import AudioRecorder from "../components/AudioRecorder.vue";
import SecurityProbe from "../components/SecurityProbe.vue";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";

const { t } = useI18n();
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
      <h1 class="text-2xl font-semibold">{{ t("home.title") }}</h1>
      <p class="text-sm text-slate-400">{{ t("home.subtitle") }}</p>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div class="text-xs uppercase tracking-[0.2em] text-slate-400">
          {{ t("home.talk_title") }}
        </div>
        <div class="mt-2 text-sm text-slate-100">
          <span v-if="state.activeProject">{{ state.activeProject.title }}</span>
          <span v-else>{{ t("home.talk_empty") }}</span>
        </div>
        <RouterLink class="mt-3 inline-block text-xs text-emerald-300 underline" to="/project/new">
          {{ t("home.talk_action") }}
        </RouterLink>
      </div>

      <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div class="text-xs uppercase tracking-[0.2em] text-slate-400">
          {{ t("home.profile_title") }}
        </div>
        <div class="mt-2 text-sm text-slate-100">
          <span v-if="state.activeProfileId">
            {{ t("home.profile_active") }}: {{ activeProfileName || state.activeProfileId }}
          </span>
          <span v-else>{{ t("home.profile_empty") }}</span>
        </div>
        <RouterLink class="mt-3 inline-block text-xs text-emerald-300 underline" to="/profiles">
          {{ t("home.profile_action") }}
        </RouterLink>
      </div>
    </div>

    <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div class="text-xs uppercase tracking-[0.2em] text-slate-400">
        {{ t("home.quest_title") }}
      </div>
      <div v-if="state.dailyQuest" class="mt-2 space-y-2">
        <div class="text-sm text-slate-100">{{ state.dailyQuest.quest.title }}</div>
        <div class="text-xs text-slate-400">{{ state.dailyQuest.quest.prompt }}</div>
        <RouterLink
          class="mt-2 inline-block text-xs text-emerald-300 underline"
          :to="`/quest/${state.dailyQuest.quest.code}`"
        >
          {{ t("home.quest_action") }}
        </RouterLink>
      </div>
      <div v-else class="mt-2 text-sm text-slate-500">
        {{ t("home.quest_empty") }}
      </div>
    </div>

    <AudioRecorder />
    <SecurityProbe />
  </section>
</template>
