<script setup lang="ts">
import { RouterLink } from "vue-router";
import EntityRow from "@/components/EntityRow.vue";
import PageHeader from "@/components/PageHeader.vue";
import PageShell from "@/components/PageShell.vue";
import SectionPanel from "@/components/SectionPanel.vue";
import { useTalksPageState } from "@/features/talks/composables/useTalksPageState";

const {
  t,
  state,
  error,
  isLoading,
  isBlueprintLoading,
  isSwitching,
  mascotMessage,
  talksBlueprint,
  showMascotCard,
  mascotBody,
  mascotToneClass,
  blueprintPercentClass,
  blueprintStepClass,
  formatDuration,
  formatLastActivity,
  talkNumberLabel,
  talkStageLabel,
  setActive,
  goToDefine,
} = useTalksPageState();
</script>

<template>
  <PageShell>
    <PageHeader :eyebrow="t('talks.title')" :title="t('talks.title')" :subtitle="t('talks.subtitle')">
      <template #actions>
        <UButton size="md" to="/project/new" color="primary">
          {{ t("talks.create") }}
        </UButton>
      </template>
    </PageHeader>

    <SectionPanel
      v-if="showMascotCard && mascotMessage"
      variant="compact"
      class="border"
      :class="mascotToneClass(mascotMessage.kind)"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="app-text-eyebrow">{{ t("talks.mascot_label") }}</div>
          <div class="app-text app-text-subheadline mt-1">{{ mascotMessage.title }}</div>
          <div v-if="mascotBody" class="app-muted app-text-body mt-1">{{ mascotBody }}</div>
        </div>
        <UButton
          v-if="mascotMessage.cta_route && mascotMessage.cta_label"
          size="md"
          :to="mascotMessage.cta_route"
          color="neutral"
          variant="outline"
        >
          {{ mascotMessage.cta_label }}
        </UButton>
      </div>
    </SectionPanel>

    <SectionPanel v-if="state.activeProfileId && state.activeProject" variant="compact" class="border">
      <div v-if="isBlueprintLoading" class="app-muted app-text-meta">
        {{ t("talks.loading") }}
      </div>
      <div v-else-if="talksBlueprint" class="space-y-3">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div class="app-text-eyebrow">{{ t("talks.blueprint_label") }}</div>
            <div class="app-text app-text-subheadline mt-1">{{ talksBlueprint.framework_label }}</div>
            <div class="app-muted app-text-body mt-1">{{ talksBlueprint.framework_summary }}</div>
          </div>
          <UBadge color="neutral" variant="solid">
            {{ talksBlueprint.completion_percent }}%
          </UBadge>
        </div>

        <div class="h-2 overflow-hidden rounded-full app-meter-bg">
          <div
            class="h-full rounded-full transition-all"
            :class="blueprintPercentClass(talksBlueprint.completion_percent)"
            :style="{ width: `${talksBlueprint.completion_percent}%` }"
          ></div>
        </div>

        <div class="space-y-2">
          <div
            v-for="step in talksBlueprint.steps"
            :key="step.id"
            class="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2"
            :class="blueprintStepClass(step.done)"
          >
            <div class="min-w-0 flex-1">
              <div class="app-text app-text-body-strong">{{ step.title }}</div>
              <div class="app-muted app-text-meta mt-1">
                +{{ step.reward_credits }} {{ t("training.progress_credits") }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <UBadge :color="step.done ? 'success' : 'neutral'" variant="solid">
                {{ step.done ? t("talks.blueprint_done") : t("talks.blueprint_pending") }}
              </UBadge>
              <RouterLink
                v-if="!step.done && step.cta_route"
                class="app-link app-text-meta underline"
                :to="step.cta_route"
              >
                {{ t("talks.blueprint_open") }}
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </SectionPanel>

    <SectionPanel v-if="!state.activeProfileId" variant="compact">
      <p class="app-text app-text-body">{{ t("talk.need_profile") }}</p>
      <RouterLink class="app-link app-text-meta mt-2 inline-block underline underline-offset-4" to="/profiles">
        {{ t("talk.goto_profiles") }}
      </RouterLink>
    </SectionPanel>

    <SectionPanel v-else variant="dense-list">
      <div v-if="isLoading" class="app-muted app-text-meta">
        {{ t("talks.loading") }}
      </div>
      <div v-else-if="error" class="app-danger-text app-text-meta">
        {{ error }}
      </div>
      <div v-else-if="state.projects.length === 0" class="app-muted app-text-body">
        {{ t("talks.empty") }}
      </div>
      <div v-else class="space-y-3">
        <EntityRow
          v-for="project in state.projects"
          :key="project.id"
          interactive
          role="button"
          tabindex="0"
          @click="goToDefine(project.id)"
          @keydown.enter.prevent="goToDefine(project.id)"
          @keydown.space.prevent="goToDefine(project.id)"
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
                {{ talkStageLabel(project.stage) }}
              </UBadge>
              <div class="app-text app-text-body-strong">{{ project.title }}</div>
            </div>
            <div class="app-subtle app-text-meta mt-1">
              {{ t("talks.duration") }}: {{ formatDuration(project.duration_target_sec) }}
              {{ t("talks.minutes") }} -
              {{ t("talks.last_activity") }}: {{ formatLastActivity(project.updated_at) }}
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
              @click.stop="goToDefine(project.id)"
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
              :disabled="isSwitching === project.id"
              color="neutral"
              variant="outline"
              @click.stop="setActive(project.id)"
            >
              {{ t("talks.set_active") }}
            </UButton>
          </template>
        </EntityRow>
      </div>
    </SectionPanel>
  </PageShell>
</template>
