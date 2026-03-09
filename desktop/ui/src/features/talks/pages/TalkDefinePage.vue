<script setup lang="ts">
import { RouterLink } from "vue-router";
import TalkStepPageShell from "@/components/TalkStepPageShell.vue";
import TalkDefineEditorPanel from "@/features/talks/components/TalkDefineEditorPanel.vue";
import { talksRoute } from "@/features/talks/composables/shared/talkRoutes";
import { useTalkDefinePageState } from "@/features/talks/composables/definePage/useTalkDefinePageState";

const {
  t,
  projectId,
  activeProfileId,
  project,
  error,
  isLoading,
  saveError,
  saveState,
  form,
  stageOptions,
  projectStage,
  defineChecklist,
  defineCompletedCount,
  defineCompletionPercent,
  defineReady,
  nextMissingDefineItem,
  nextAction,
  saveDefine,
  setStage,
  runNextAction,
} = useTalkDefinePageState();
</script>

<template>
  <TalkStepPageShell
    :project-id="projectId"
    active="define"
    :eyebrow="t('talk_define.title')"
    :title="t('talk_define.title')"
    :subtitle="t('talk_define.subtitle')"
  >

    <UCard v-if="!activeProfileId" class="app-panel app-panel-compact">
      <p class="app-body-muted">{{ t("talk.need_profile") }}</p>
      <RouterLink class="app-link-meta mt-3 inline-block underline" to="/profiles">
        {{ t("talk.goto_profiles") }}
      </RouterLink>
    </UCard>

    <UCard v-else-if="isLoading" class="app-panel app-panel-compact">
      <p class="app-body-muted">{{ t("talks.loading") }}</p>
    </UCard>

    <UCard v-else-if="error" class="app-panel app-panel-compact">
      <p class="app-danger-text app-text-body">{{ error }}</p>
    </UCard>

    <UCard v-else-if="!project" class="app-panel app-panel-compact">
      <p class="app-body-muted">{{ t("talk_define.missing") }}</p>
      <RouterLink class="app-link-meta mt-3 inline-block underline" :to="talksRoute()">
        {{ t("talk_report.back") }}
      </RouterLink>
    </UCard>

    <TalkDefineEditorPanel
      v-else
      :form="form"
      :save-error="saveError"
      :save-state="saveState"
      :stage-options="stageOptions"
      :project-stage="projectStage"
      :define-checklist="defineChecklist"
      :define-completed-count="defineCompletedCount"
      :define-completion-percent="defineCompletionPercent"
      :define-ready="defineReady"
      :next-missing-define-item="nextMissingDefineItem"
      :next-action="nextAction"
      :project="project"
      :on-save-define="saveDefine"
      :on-set-stage="setStage"
      :on-run-next-action="runNextAction"
    />
  </TalkStepPageShell>
</template>

