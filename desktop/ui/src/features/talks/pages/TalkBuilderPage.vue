<script setup lang="ts">
import { RouterLink } from "vue-router";
import TalkStepPageShell from "@/components/TalkStepPageShell.vue";
import { useTalkBuilderPageState } from "@/features/talks/composables/useTalkBuilderPageState";

const {
  t,
  error,
  isLoading,
  isSaving,
  saveStatus,
  outline,
  exportPath,
  isExporting,
  isRevealing,
  blueprint,
  isApplyingTemplate,
  activeProfileId,
  selectedProjectId,
  talkLabel,
  activeFrameworkPrompts,
  applyFrameworkTemplate,
  saveOutline,
  exportOutline,
  revealExport,
} = useTalkBuilderPageState();
</script>

<template>
  <TalkStepPageShell
    :project-id="selectedProjectId"
    active="builder"
    :eyebrow="t('builder.title')"
    :title="t('builder.title')"
    :subtitle="t('builder.subtitle')"
  >
    <template v-if="talkLabel" #meta>
      <span>{{ talkLabel }}</span>
    </template>

    <UCard v-if="!activeProfileId" class="app-panel app-panel-compact" variant="outline">
      <p class="app-muted app-text-body">{{ t("builder.no_profile") }}</p>
      <RouterLink class="app-link app-text-meta mt-3 inline-block underline" to="/profiles">
        {{ t("builder.setup_profile") }}
      </RouterLink>
    </UCard>

    <UCard v-else-if="!selectedProjectId" class="app-panel app-panel-compact" variant="outline">
      <p class="app-muted app-text-body">{{ t("builder.no_talk") }}</p>
      <RouterLink class="app-link app-text-meta mt-3 inline-block underline" to="/project/new">
        {{ t("builder.setup_talk") }}
      </RouterLink>
    </UCard>

    <div v-else class="space-y-4">
      <UCard
        v-if="blueprint"
        class="app-panel app-panel-compact border border-[var(--color-accent)] bg-[var(--color-surface-selected)]"
        variant="outline"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="app-text-eyebrow">{{ t("builder.framework_title") }}</div>
            <div class="app-text app-text-section-title mt-1">{{ blueprint.framework_label }}</div>
            <div class="app-muted app-text-body mt-1">{{ blueprint.framework_summary }}</div>
          </div>
          <UButton
            size="md"
            :disabled="isApplyingTemplate || isSaving"
            color="neutral"
            variant="outline"
            @click="applyFrameworkTemplate"
          >
            {{ t("builder.framework_apply_template") }}
          </UButton>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <UBadge
            v-for="(prompt, index) in activeFrameworkPrompts"
            :key="`framework-prompt-${index}`"
            color="neutral"
            variant="solid"
          >
            {{ prompt }}
          </UBadge>
        </div>
      </UCard>

      <UCard class="app-panel" variant="outline">
        <div class="app-text-eyebrow">
          {{ t("builder.outline_label") }}
        </div>
        <UTextarea v-model="outline" rows="12" class="mt-3 w-full" />
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <UButton size="md" :disabled="isSaving" color="primary" @click="saveOutline">
            {{ t("builder.save") }}
          </UButton>
          <UButton size="md" :disabled="isExporting" color="neutral" variant="outline" @click="exportOutline">
            {{ t("builder.export") }}
          </UButton>
          <span v-if="saveStatus === 'saving'" class="app-muted app-text-meta">
            {{ t("builder.saving") }}
          </span>
          <span v-else-if="saveStatus === 'saved'" class="app-subtle app-text-meta">
            {{ t("builder.saved") }}
          </span>
        </div>
        <div v-if="exportPath" class="mt-3 flex flex-wrap items-center gap-2">
          <span class="app-muted app-text-meta">{{ t("builder.export_path") }}:</span>
          <span class="app-text max-w-[360px] truncate" style="direction: rtl; text-align: left;">
            {{ exportPath }}
          </span>
          <UButton
            size="sm"
            :disabled="isRevealing"
            color="neutral"
            variant="ghost"
            @click="revealExport"
          >
            {{ t("builder.export_reveal") }}
          </UButton>
          <span class="app-subtle app-text-meta">{{ t("builder.export_ready") }}</span>
        </div>
        <div v-if="isLoading" class="app-muted app-text-meta mt-3">
          {{ t("builder.loading") }}
        </div>
        <div v-if="error" class="app-danger-text app-text-meta mt-3">
          {{ error }}
        </div>
      </UCard>
    </div>
  </TalkStepPageShell>
</template>
