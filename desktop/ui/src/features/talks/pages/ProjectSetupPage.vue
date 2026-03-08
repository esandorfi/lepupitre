<script setup lang="ts">
import { useProjectSetupPageState } from "@/features/talks/composables/projectSetupPage/useProjectSetupPageState";

const {
  t,
  title,
  audience,
  goal,
  duration,
  error,
  isSaving,
  activeProfileId,
  activeProject,
  saveProject,
} = useProjectSetupPageState();
</script>

<template>
  <section class="space-y-6">
    <p class="app-muted text-sm font-semibold">{{ t("talk.subtitle") }}</p>

    <UCard v-if="!activeProfileId" class="app-panel app-panel-compact" variant="outline">
      <p class="app-text text-sm">{{ t("talk.need_profile") }}</p>
      <RouterLink class="app-link text-xs underline underline-offset-4" to="/profiles">
        {{ t("talk.goto_profiles") }}
      </RouterLink>
    </UCard>

    <UCard v-else class="app-panel app-panel-compact" variant="outline">
      <UCard v-if="activeProject" as="div" class="app-panel app-panel-compact mb-4" variant="outline">
        <div class="app-subtle text-xs uppercase tracking-[0.2em]">
          {{ t("talk.active_title") }}
        </div>
        <div class="app-text text-sm">{{ activeProject.title }}</div>
      </UCard>

      <div class="space-y-3">
        <UInput
          v-model="title"
          class="w-full"
          :placeholder="t('talk.title_placeholder')"
        />
        <UInput
          v-model="audience"
          class="w-full"
          :placeholder="t('talk.audience_placeholder')"
        />
        <UInput
          v-model="goal"
          class="w-full"
          :placeholder="t('talk.goal_placeholder')"
        />
        <UInput
          v-model="duration"
          class="w-full"
          type="number"
          min="1"
          :placeholder="t('talk.duration_placeholder')"
        />
      </div>

      <div class="mt-4 flex items-center gap-3">
        <UButton
          size="md"
         
          :disabled="isSaving"
          color="primary"
         @click="saveProject">
          {{ t("talk.save") }}
        </UButton>
        <RouterLink class="app-muted text-xs underline underline-offset-4" to="/">
          {{ t("talk.back") }}
        </RouterLink>
      </div>

      <p v-if="error" class="app-danger-text mt-2 text-xs">{{ error }}</p>
    </UCard>
  </section>
</template>

