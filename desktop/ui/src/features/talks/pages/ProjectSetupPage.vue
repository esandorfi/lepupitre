<script setup lang="ts">
import { reactive } from "vue";
import { useI18n } from "@/lib/i18n";
import { useProjectSetupPageState } from "@/features/talks/composables/projectSetupPage/useProjectSetupPageState";

/**
 * Page composition root (project setup).
 * Reads: setup draft/profile/project state from `useProjectSetupPageState`.
 * Actions: save-project command delegated to project-setup runtime.
 * Boundary: this page remains a form/layout surface without direct store side-effect code.
 */
const { t } = useI18n();
const vm = reactive(useProjectSetupPageState());
</script>

<template>
  <section class="space-y-6">
    <p class="app-muted text-sm font-semibold">{{ t("talk.subtitle") }}</p>

    <UCard v-if="!vm.activeProfileId" class="app-panel app-panel-compact">
      <p class="app-text text-sm">{{ t("talk.need_profile") }}</p>
      <RouterLink class="app-link text-xs underline underline-offset-4" to="/profiles">
        {{ t("talk.goto_profiles") }}
      </RouterLink>
    </UCard>

    <UCard v-else class="app-panel app-panel-compact">
      <UCard v-if="vm.activeProject" as="div" class="app-panel app-panel-compact mb-4">
        <div class="app-subtle text-xs uppercase tracking-[0.2em]">
          {{ t("talk.active_title") }}
        </div>
        <div class="app-text text-sm">{{ vm.activeProject.title }}</div>
      </UCard>

      <div class="space-y-3">
        <UInput
          v-model="vm.title"
          class="w-full"
          :placeholder="t('talk.title_placeholder')"
        />
        <UInput
          v-model="vm.audience"
          class="w-full"
          :placeholder="t('talk.audience_placeholder')"
        />
        <UInput
          v-model="vm.goal"
          class="w-full"
          :placeholder="t('talk.goal_placeholder')"
        />
        <UInput
          v-model="vm.duration"
          class="w-full"
          type="number"
          min="1"
          :placeholder="t('talk.duration_placeholder')"
        />
      </div>

      <div class="mt-4 flex items-center gap-3">
        <UButton
          :disabled="vm.isSaving"
          color="primary"
          @click="vm.saveProject"
        >
          {{ t("talk.save") }}
        </UButton>
        <RouterLink class="app-muted text-xs underline underline-offset-4" to="/">
          {{ t("talk.back") }}
        </RouterLink>
      </div>

      <p v-if="vm.error" class="app-danger-text mt-2 text-xs">{{ vm.error }}</p>
    </UCard>
  </section>
</template>
