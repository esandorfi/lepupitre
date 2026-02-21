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
    <div class="app-surface rounded-2xl border p-4">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t("home.quest_title") }}
      </div>
      <div v-if="state.dailyQuest" class="mt-2 space-y-2">
        <div class="app-text text-sm">{{ state.dailyQuest.quest.title }}</div>
        <div class="app-muted text-xs">{{ state.dailyQuest.quest.prompt }}</div>
        <RouterLink
          class="app-link mt-2 inline-block text-xs underline"
          :to="`/quest/${state.dailyQuest.quest.code}`"
        >
          {{ t("home.quest_action") }}
        </RouterLink>
      </div>
      <div v-else class="app-muted mt-2 text-sm">
        {{ t("home.quest_empty") }}
      </div>
      <div class="app-muted mt-3 text-sm font-semibold whitespace-pre-line">
        {{ t("home.subtitle") }}
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div class="app-surface rounded-2xl border p-4">
        <div class="app-subtle text-xs uppercase tracking-[0.2em]">
          {{ t("home.talk_title") }}
        </div>
        <div class="app-text mt-2 text-sm">
          <span v-if="state.activeProject">{{ state.activeProject.title }}</span>
          <span v-else>{{ t("home.talk_empty") }}</span>
        </div>
        <RouterLink class="app-link mt-3 inline-block text-xs underline" to="/project/new">
          {{ t("home.talk_action") }}
        </RouterLink>
      </div>

      <div class="app-surface rounded-2xl border p-4">
        <div class="app-subtle text-xs uppercase tracking-[0.2em]">
          {{ t("home.profile_title") }}
        </div>
        <div class="app-text mt-2 text-sm">
          <span v-if="state.activeProfileId">
            {{ t("home.profile_active") }}: {{ activeProfileName || state.activeProfileId }}
          </span>
          <span v-else>{{ t("home.profile_empty") }}</span>
        </div>
        <RouterLink class="app-link mt-3 inline-block text-xs underline" to="/profiles">
          {{ t("home.profile_action") }}
        </RouterLink>
      </div>
    </div>

    <AudioRecorder />
    <SecurityProbe />
  </section>
</template>
