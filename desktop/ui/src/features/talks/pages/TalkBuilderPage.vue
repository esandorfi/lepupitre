<script setup lang="ts">
import { reactive } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "@/lib/i18n";
import TalkStepPageShell from "@/components/TalkStepPageShell.vue";
import { useTalkBuilderPageState } from "@/features/talks/composables/builderPage/useTalkBuilderPageState";

/**
 * Page composition root (builder step).
 * Reads: builder draft/export/blueprint state from `useTalkBuilderPageState`.
 * Actions: load/save/template/export/reveal commands delegated to builder actions runtime.
 * Boundary: page stays presentation-focused; orchestration is outside this SFC.
 */
const { t } = useI18n();
const vm = reactive(useTalkBuilderPageState());
</script>

<template>
  <TalkStepPageShell
    :project-id="vm.selectedProjectId"
    active="builder"
    :eyebrow="t('builder.title')"
    :title="t('builder.title')"
    :subtitle="t('builder.subtitle')"
  >
    <template v-if="vm.talkLabel" #meta>
      <span>{{ vm.talkLabel }}</span>
    </template>

    <UCard v-if="!vm.activeProfileId" class="app-panel app-panel-compact">
      <p class="app-body-muted">{{ t("builder.no_profile") }}</p>
      <RouterLink class="app-link-meta mt-3 inline-block underline" to="/profiles">
        {{ t("builder.setup_profile") }}
      </RouterLink>
    </UCard>

    <UCard v-else-if="!vm.selectedProjectId" class="app-panel app-panel-compact">
      <p class="app-body-muted">{{ t("builder.no_talk") }}</p>
      <RouterLink class="app-link-meta mt-3 inline-block underline" to="/project/new">
        {{ t("builder.setup_talk") }}
      </RouterLink>
    </UCard>

    <div v-else class="space-y-4">
      <UCard
        v-if="vm.blueprint"
        class="app-panel app-panel-compact border border-[var(--color-accent)] bg-[var(--color-surface-selected)]"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="app-text-eyebrow">{{ t("builder.framework_title") }}</div>
            <div class="app-text app-text-section-title mt-1">{{ vm.blueprint.framework_label }}</div>
            <div class="app-body-muted mt-1">{{ vm.blueprint.framework_summary }}</div>
          </div>
          <UButton
            :disabled="vm.isApplyingTemplate || vm.isSaving"
            @click="vm.applyFrameworkTemplate"
          >
            {{ t("builder.framework_apply_template") }}
          </UButton>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <UBadge
            v-for="(prompt, index) in vm.activeFrameworkPrompts"
            :key="`framework-prompt-${index}`"
          >
            {{ prompt }}
          </UBadge>
        </div>
      </UCard>

      <UCard class="app-panel">
        <div class="app-text-eyebrow">
          {{ t("builder.outline_label") }}
        </div>
        <UTextarea v-model="vm.outline" rows="12" class="mt-3 w-full" />
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <UButton :disabled="vm.isSaving" color="primary" @click="vm.saveOutline">
            {{ t("builder.save") }}
          </UButton>
          <UButton :disabled="vm.isExporting" @click="vm.exportOutline">
            {{ t("builder.export") }}
          </UButton>
          <span v-if="vm.saveStatus === 'saving'" class="app-meta-muted">
            {{ t("builder.saving") }}
          </span>
          <span v-else-if="vm.saveStatus === 'saved'" class="app-meta-subtle">
            {{ t("builder.saved") }}
          </span>
        </div>
        <div v-if="vm.exportPath" class="mt-3 flex flex-wrap items-center gap-2">
          <span class="app-meta-muted">{{ t("builder.export_path") }}:</span>
          <span class="app-text max-w-[360px] truncate" style="direction: rtl; text-align: left;">
            {{ vm.exportPath }}
          </span>
          <UButton
            size="sm"
            :disabled="vm.isRevealing"
            variant="ghost"
            @click="vm.revealExport"
          >
            {{ t("builder.export_reveal") }}
          </UButton>
          <span class="app-meta-subtle">{{ t("builder.export_ready") }}</span>
        </div>
        <div v-if="vm.isLoading" class="app-meta-muted mt-3">
          {{ t("builder.loading") }}
        </div>
        <div v-if="vm.error" class="app-meta-danger mt-3">
          {{ vm.error }}
        </div>
      </UCard>
    </div>
  </TalkStepPageShell>
</template>
