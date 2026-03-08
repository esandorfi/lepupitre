<script setup lang="ts">
import { useI18n } from "@/lib/i18n";
import type { DefineFormState, DefineNextAction } from "@/features/talks/composables/definePage/talkDefinePageHelpers";
import { checklistRowClass, minutesLabel } from "@/features/talks/composables/definePage/talkDefinePageHelpers";
import { talkBuilderRoute, talkExportRoute, talkTrainRoute } from "@/features/talks/composables/shared/talkRoutes";

const { t } = useI18n();

type StageOption = { value: string; label: string };
type ChecklistItem = { id: string; label: string; done: boolean };

defineProps<{
  form: DefineFormState;
  saveError: string | null;
  saveState: "idle" | "saving" | "saved" | "error";
  stageOptions: StageOption[];
  projectStage: string;
  defineChecklist: ChecklistItem[];
  defineCompletedCount: number;
  defineCompletionPercent: number;
  defineReady: boolean;
  nextMissingDefineItem: string | null;
  nextAction: DefineNextAction | null;
  project: { id: string; duration_target_sec?: number | null } | null;
  onSaveDefine: () => void;
  onSetStage: (stage: string) => void;
  onRunNextAction: () => void;
}>();
</script>

<template>
  <div class="space-y-4">
    <UCard
      class="app-panel app-panel-compact border border-[var(--color-accent)] bg-[var(--color-surface-selected)]"
      variant="outline"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div class="app-text-eyebrow">{{ t("talk_define.readiness_title") }}</div>
          <div class="app-muted app-text-meta mt-1">{{ t("talk_define.readiness_subtitle") }}</div>
        </div>
        <UBadge color="neutral" variant="solid">
          {{ defineCompletedCount }} / {{ defineChecklist.length }}
        </UBadge>
      </div>
      <div class="mt-3 h-2 overflow-hidden rounded-full app-meter-bg">
        <div
          class="h-full rounded-full bg-[var(--color-accent)] transition-all"
          :style="{ width: `${defineCompletionPercent}%` }"
        ></div>
      </div>
      <div class="mt-3 grid gap-2 md:grid-cols-2">
        <div
          v-for="item in defineChecklist"
          :key="item.id"
          class="rounded-lg border px-3 py-2"
          :class="checklistRowClass(item.done)"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="app-text app-text-body-strong text-sm">{{ item.label }}</span>
            <UBadge :color="item.done ? 'success' : 'neutral'" variant="solid">
              {{ item.done ? t("talk_define.check_done") : t("talk_define.check_missing") }}
            </UBadge>
          </div>
        </div>
      </div>
      <div class="app-muted app-text-meta mt-2">
        {{
          defineReady
            ? t("talk_define.readiness_ready")
            : `${t("talk_define.readiness_missing")} ${nextMissingDefineItem ?? t("talk_define.empty_value")}`
        }}
      </div>
    </UCard>

    <UCard class="app-panel" variant="outline">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p class="app-muted app-text-meta">{{ t("talk_define.autosave_hint") }}</p>
        <p
          class="app-text-meta"
          :class="{
            'app-muted': saveState === 'idle' || saveState === 'saved',
            'app-subtle': saveState === 'saving',
            'app-danger-text': saveState === 'error',
          }"
        >
          {{
            saveState === "saving"
              ? t("talk_define.saving")
              : saveState === "error"
                ? (saveError || t("talk_define.save_error"))
                : t("talk_define.saved")
          }}
        </p>
      </div>
      <div class="grid gap-3 md:grid-cols-2">
        <UCard as="div" class="app-panel app-panel-compact app-radius-card md:col-span-2" variant="outline">
          <div class="app-text-eyebrow">{{ t("talk_define.field_title") }}</div>
          <UInput
            v-model="form.title"
            class="mt-2 w-full app-text-subheadline font-semibold"
            size="lg"
            type="text"
            :placeholder="t('talk.title_placeholder')"
            @blur="onSaveDefine"
            @keydown.enter.prevent="onSaveDefine"
          />
        </UCard>
        <UCard as="div" class="app-panel app-panel-compact app-radius-card" variant="outline">
          <div class="app-text-eyebrow">{{ t("talk_define.field_audience") }}</div>
          <UInput
            v-model="form.audience"
            class="mt-2 w-full app-text-body"
            size="md"
            type="text"
            :placeholder="t('talk.audience_placeholder')"
            @blur="onSaveDefine"
            @keydown.enter.prevent="onSaveDefine"
          />
        </UCard>
        <UCard as="div" class="app-panel app-panel-compact app-radius-card" variant="outline">
          <div class="app-text-eyebrow">{{ t("talk_define.field_duration") }}</div>
          <UInput
            v-model="form.durationMinutes"
            class="mt-2 w-full app-text-body"
            size="md"
            type="number"
            min="1"
            step="1"
            :placeholder="t('talk.duration_placeholder')"
            @blur="onSaveDefine"
            @keydown.enter.prevent="onSaveDefine"
          />
          <p class="app-muted app-text-meta mt-2">
            {{ minutesLabel(t, project?.duration_target_sec) }}
          </p>
        </UCard>
        <UCard as="div" class="app-panel app-panel-compact app-radius-card md:col-span-2" variant="outline">
          <div class="app-text-eyebrow">{{ t("talk_define.field_goal") }}</div>
          <UTextarea
            v-model="form.goal"
            class="mt-2 min-h-28 w-full app-text-body"
            :rows="5"
            :placeholder="t('talk.goal_placeholder')"
            @blur="onSaveDefine"
          />
        </UCard>
        <UCard as="div" class="app-panel app-panel-compact app-radius-card md:col-span-2" variant="outline">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div class="app-text-eyebrow">{{ t("talk_define.stage_title") }}</div>
              <p class="app-muted app-text-meta mt-1">{{ t("talk_define.stage_hint") }}</p>
            </div>
            <UBadge color="neutral" variant="solid">
              {{ stageOptions.find((option) => option.value === projectStage)?.label }}
            </UBadge>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <UButton
              v-for="option in stageOptions"
              :key="option.value"
              size="sm"
              color="neutral"
              :variant="projectStage === option.value ? 'outline' : 'ghost'"
              @click="onSetStage(option.value)"
            >
              {{ option.label }}
            </UButton>
          </div>
        </UCard>
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-2">
        <UButton
          v-if="nextAction"
          size="lg"
          color="primary"
          @click="onRunNextAction"
        >
          {{ nextAction.label }}
        </UButton>
        <UButton size="lg" :to="talkBuilderRoute(project?.id ?? '')" color="neutral" variant="outline">
          {{ t("talk_steps.builder") }}
        </UButton>
        <UButton size="lg" :to="talkTrainRoute(project?.id ?? '')" color="neutral" variant="outline">
          {{ t("talk_steps.train") }}
        </UButton>
        <UButton size="lg" :to="talkExportRoute(project?.id ?? '')" color="neutral" variant="outline">
          {{ t("talk_steps.export") }}
        </UButton>
      </div>
    </UCard>
  </div>
</template>
