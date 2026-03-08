<script setup lang="ts">
import EntityRow from "@/components/EntityRow.vue";
import SectionPanel from "@/components/SectionPanel.vue";
import { useI18n } from "@/lib/i18n";
import type { ProjectListItem } from "@/schemas/ipc";
import {
  formatDuration,
  formatLastActivity,
  talkNumberLabel,
  talkStageLabel,
} from "@/features/talks/composables/talksPage/talksPageHelpers";

const { t } = useI18n();

defineProps<{
  isLoading: boolean;
  error: string | null;
  hasActiveProfile: boolean;
  projects: ProjectListItem[];
  switchingProjectId: string | null;
  onGoToDefine: (projectId: string) => void;
  onSetActive: (projectId: string) => void;
}>();
</script>

<template>
  <SectionPanel variant="dense-list">
    <div v-if="isLoading" class="app-muted app-text-meta">
      {{ t("talks.loading") }}
    </div>
    <div v-else-if="error" class="app-danger-text app-text-meta">
      {{ error }}
    </div>
    <div v-else-if="hasActiveProfile && projects.length === 0" class="app-muted app-text-body">
      {{ t("talks.empty") }}
    </div>
    <div v-else-if="hasActiveProfile" class="space-y-3">
      <EntityRow
        v-for="project in projects"
        :key="project.id"
        interactive
        role="button"
        tabindex="0"
        @click="onGoToDefine(project.id)"
        @keydown.enter.prevent="onGoToDefine(project.id)"
        @keydown.space.prevent="onGoToDefine(project.id)"
      >
        <template #main>
          <div class="flex flex-wrap items-center gap-2">
            <span
              v-if="talkNumberLabel(project.talk_number)"
              class="app-pill app-text-caption inline-flex items-center rounded-full px-2 py-1 font-semibold"
            >
              {{ talkNumberLabel(project.talk_number) }}
            </span>
            <UBadge color="neutral" variant="solid">
              {{ talkStageLabel(t, project.stage) }}
            </UBadge>
            <div class="app-text app-text-body-strong">{{ project.title }}</div>
          </div>
          <div class="app-subtle app-text-meta mt-1">
            {{ t("talks.duration") }}: {{ formatDuration(project.duration_target_sec) }}
            {{ t("talks.minutes") }} -
            {{ t("talks.last_activity") }}: {{ formatLastActivity(t, project.updated_at) }}
          </div>
        </template>

        <template #actions>
          <UButton
            :aria-label="t('talks.view_report')"
            :title="t('talks.view_report')"
            color="neutral"
            variant="outline"
            size="md"
            square
            @click.stop="onGoToDefine(project.id)"
          >
            <svg
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </UButton>
          <span
            v-if="project.is_active"
            class="app-pill app-pill-active app-text-meta inline-flex items-center rounded-full px-3 py-1 font-semibold"
          >
            {{ t("talks.active") }}
          </span>
          <UButton
            v-else
            size="sm"
            :disabled="switchingProjectId === project.id"
            color="neutral"
            variant="outline"
            @click.stop="onSetActive(project.id)"
          >
            {{ t("talks.set_active") }}
          </UButton>
        </template>
      </EntityRow>
    </div>
  </SectionPanel>
</template>
