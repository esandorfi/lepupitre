<script setup lang="ts">
import { RouterLink } from "vue-router";
import { usePacksPageState } from "@/features/packs/composables/usePacksPageState";

const {
  t,
  error,
  importPath,
  importStatus,
  importResult,
  importDetails,
  isInspecting,
  isPicking,
  isDragging,
  activeProfileId,
  formatBytes,
  pickPack,
  importReview,
} = usePacksPageState();
</script>

<template>
  <section class="space-y-6">
    <UCard class="app-panel app-panel-compact" variant="outline">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t("packs.title") }}
      </div>
      <div class="app-text mt-2 text-sm">{{ t("packs.subtitle") }}</div>
    </UCard>

    <UCard v-if="!activeProfileId" class="app-panel app-panel-compact" variant="outline">
      <p class="app-muted text-sm">{{ t("packs.no_profile") }}</p>
      <RouterLink class="app-link mt-3 inline-block text-xs underline" to="/profiles">
        {{ t("packs.setup_profile") }}
      </RouterLink>
    </UCard>

    <div v-else class="space-y-4">
      <UCard class="app-panel app-panel-compact" variant="outline">
        <div class="app-subtle text-xs uppercase tracking-[0.2em]">
          {{ t("packs.import_title") }}
        </div>
        <div
          class="mt-3 rounded-xl border border-dashed border-[var(--app-border)] px-4 py-6 text-center text-xs"
          :class="isDragging ? 'bg-[var(--color-surface-elevated)]' : 'bg-transparent'"
        >
          <div class="app-text text-sm">{{ t("packs.import_drop_title") }}</div>
          <div class="app-muted mt-1">{{ t("packs.import_drop_hint") }}</div>
          <UButton
           
            size="sm"
            class="mt-3"
            :disabled="isPicking"
            color="neutral"
           variant="ghost" @click="pickPack">
            {{ t("packs.import_pick") }}
          </UButton>
        </div>
        <div v-if="isInspecting" class="app-muted mt-3 text-xs">
          {{ t("packs.import_checking") }}
        </div>
        <div v-else-if="importDetails" class="mt-3 space-y-2 text-xs">
          <div class="flex flex-wrap items-center gap-2">
            <span class="app-text text-sm font-semibold">{{ importDetails.fileName }}</span>
            <span class="app-muted">{{ formatBytes(importDetails.fileBytes) }}</span>
          </div>
          <div class="app-text">
            <span class="app-muted">{{ t("packs.import_from") }}:</span>
            {{
              importDetails.reviewerTag ||
              importDetails.profileId ||
              t("packs.import_from_unknown")
            }}
          </div>
          <div class="app-text">
            <span class="app-muted">{{ t("packs.import_contents") }}:</span>
            {{
              importDetails.files
                .map((item) => `${item.role} ${formatBytes(item.bytes)}`)
                .join(", ")
            }}
          </div>
          <div class="app-muted">
            {{ t("packs.import_pack_id") }}: {{ importDetails.packId }}
          </div>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <UButton
           
            size="md"
            :disabled="importStatus === 'importing' || !importPath || !importDetails"
            color="info"
           @click="importReview">
            {{ t("packs.import_action") }}
          </UButton>
        </div>
        <div v-if="importStatus === 'success'" class="app-subtle mt-2 text-xs">
          {{ t("packs.import_success") }}
        </div>
        <RouterLink
          v-if="importResult"
          class="app-link mt-2 inline-block text-xs underline"
          :to="`/talks/${importResult.projectId}`"
        >
          {{ t("packs.import_view_talk") }}
        </RouterLink>
      </UCard>
    </div>

    <div v-if="error" class="app-danger-text text-xs">
      {{ error }}
    </div>
  </section>
</template>

