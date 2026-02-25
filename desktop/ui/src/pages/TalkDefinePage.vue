<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import TalkStepPageShell from "../components/TalkStepPageShell.vue";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const error = ref<string | null>(null);
const isLoading = ref(false);
const saveError = ref<string | null>(null);
const saveState = ref<"idle" | "saving" | "saved" | "error">("idle");

const form = reactive({
  title: "",
  audience: "",
  goal: "",
  durationMinutes: "",
});

const projectId = computed(() => String(route.params.projectId || ""));
const activeProfileId = computed(() => appStore.state.activeProfileId);
const project = computed(() =>
  appStore.state.projects.find((item) => item.id === projectId.value) ?? null
);
const stageOptions = computed(() => [
  { value: "draft", label: t("talk_steps.define") },
  { value: "builder", label: t("talk_steps.builder") },
  { value: "train", label: t("talk_steps.train") },
  { value: "export", label: t("talk_steps.export") },
]);
const projectStage = computed(() => {
  const stage = project.value?.stage || "draft";
  return ["draft", "builder", "train", "export"].includes(stage) ? stage : "draft";
});
const nextAction = computed(() => {
  const id = project.value?.id;
  if (!id) {
    return null;
  }
  if (projectStage.value === "draft") {
    return {
      nextStage: "builder",
      route: `/talks/${id}/builder`,
      label: t("talk_define.continue_builder"),
    };
  }
  if (projectStage.value === "builder") {
    return {
      nextStage: "train",
      route: `/talks/${id}/train`,
      label: t("talk_define.continue_train"),
    };
  }
  if (projectStage.value === "train") {
    return {
      nextStage: "export",
      route: `/talks/${id}/export`,
      label: t("talk_define.continue_export"),
    };
  }
  return {
    nextStage: "export",
    route: `/talks/${id}/export`,
    label: t("talk_define.open_export"),
  };
});

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function minutesLabel(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) {
    return t("talk_define.duration_missing");
  }
  return `${Math.round(seconds / 60)} ${t("talks.minutes")}`;
}

function syncForm() {
  if (!project.value) {
    form.title = "";
    form.audience = "";
    form.goal = "";
    form.durationMinutes = "";
    return;
  }
  form.title = project.value.title ?? "";
  form.audience = project.value.audience ?? "";
  form.goal = project.value.goal ?? "";
  form.durationMinutes = project.value.duration_target_sec
    ? String(Math.round(project.value.duration_target_sec / 60))
    : "";
}

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function buildPayload(stageOverride?: string) {
  if (!project.value) {
    throw new Error("project_not_found");
  }
  const title = form.title.trim();
  if (!title) {
    throw new Error(t("talk.title_required"));
  }
  let duration_target_sec: number | null = null;
  const durationRaw = form.durationMinutes.trim();
  if (durationRaw) {
    const minutes = Number(durationRaw);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      throw new Error(t("talk_define.duration_invalid"));
    }
    duration_target_sec = Math.round(minutes * 60);
  }
  return {
    title,
    audience: normalizeOptional(form.audience),
    goal: normalizeOptional(form.goal),
    duration_target_sec,
    stage: stageOverride ?? project.value.stage,
  };
}

function payloadMatchesProject(payload: ReturnType<typeof buildPayload>) {
  if (!project.value) {
    return true;
  }
  return (
    payload.title === project.value.title &&
    (payload.audience ?? null) === (project.value.audience ?? null) &&
    (payload.goal ?? null) === (project.value.goal ?? null) &&
    (payload.duration_target_sec ?? null) === (project.value.duration_target_sec ?? null) &&
    payload.stage === project.value.stage
  );
}

async function persistDefine(stageOverride?: string) {
  if (!project.value || !activeProfileId.value) {
    return false;
  }
  saveError.value = null;
  let payload: ReturnType<typeof buildPayload>;
  try {
    payload = buildPayload(stageOverride);
  } catch (err) {
    saveState.value = "error";
    saveError.value = toError(err);
    return false;
  }
  if (payloadMatchesProject(payload)) {
    saveState.value = "saved";
    return true;
  }
  saveState.value = "saving";
  try {
    await appStore.updateProject(project.value.id, payload);
    saveState.value = "saved";
    return true;
  } catch (err) {
    saveState.value = "error";
    saveError.value = toError(err);
    return false;
  }
}

async function saveDefine() {
  await persistDefine();
}

async function setStage(stage: string) {
  if (!project.value || stage === project.value.stage) {
    return;
  }
  await persistDefine(stage);
}

async function runNextAction() {
  if (!nextAction.value) {
    return;
  }
  const didSave = await persistDefine(nextAction.value.nextStage);
  if (!didSave) {
    return;
  }
  await router.push(nextAction.value.route);
}

async function bootstrap() {
  isLoading.value = true;
  error.value = null;
  try {
    await appStore.bootstrap();
    await appStore.loadProjects();
  } catch (err) {
    error.value = toError(err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(bootstrap);
watch(project, () => {
  syncForm();
}, { immediate: true });
</script>

<template>
  <TalkStepPageShell
    :project-id="projectId"
    active="define"
    :eyebrow="t('talk_define.title')"
    :title="t('talk_define.title')"
    :subtitle="t('talk_define.subtitle')"
  >

    <div v-if="!activeProfileId" class="app-panel app-panel-compact">
      <p class="app-muted app-text-body">{{ t("talk.need_profile") }}</p>
      <RouterLink class="app-link app-text-meta mt-3 inline-block underline" to="/profiles">
        {{ t("talk.goto_profiles") }}
      </RouterLink>
    </div>

    <div v-else-if="isLoading" class="app-panel app-panel-compact">
      <p class="app-muted app-text-body">{{ t("talks.loading") }}</p>
    </div>

    <div v-else-if="error" class="app-panel app-panel-compact">
      <p class="app-danger-text app-text-body">{{ error }}</p>
    </div>

    <div v-else-if="!project" class="app-panel app-panel-compact">
      <p class="app-muted app-text-body">{{ t("talk_define.missing") }}</p>
      <RouterLink class="app-link app-text-meta mt-3 inline-block underline" to="/talks">
        {{ t("talk_report.back") }}
      </RouterLink>
    </div>

    <div v-else class="space-y-4">
      <div class="app-panel">
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
          <div class="app-card app-radius-card border p-3 md:col-span-2">
            <div class="app-text-eyebrow">{{ t("talk_define.field_title") }}</div>
            <input
              v-model="form.title"
              class="app-input app-focus-ring app-radius-control app-control-lg mt-2 w-full border px-4 app-text-subheadline font-semibold"
              type="text"
              :placeholder="t('talk.title_placeholder')"
              @blur="saveDefine"
              @keydown.enter.prevent="saveDefine"
            />
          </div>
          <div class="app-card app-radius-card border p-3">
            <div class="app-text-eyebrow">{{ t("talk_define.field_audience") }}</div>
            <input
              v-model="form.audience"
              class="app-input app-focus-ring app-radius-control app-control-md mt-2 w-full border px-3 app-text-body"
              type="text"
              :placeholder="t('talk.audience_placeholder')"
              @blur="saveDefine"
              @keydown.enter.prevent="saveDefine"
            />
          </div>
          <div class="app-card app-radius-card border p-3">
            <div class="app-text-eyebrow">{{ t("talk_define.field_duration") }}</div>
            <input
              v-model="form.durationMinutes"
              class="app-input app-focus-ring app-radius-control app-control-md mt-2 w-full border px-3 app-text-body"
              type="number"
              min="1"
              step="1"
              :placeholder="t('talk.duration_placeholder')"
              @blur="saveDefine"
              @keydown.enter.prevent="saveDefine"
            />
            <p class="app-muted app-text-meta mt-2">
              {{ minutesLabel(project.duration_target_sec) }}
            </p>
          </div>
          <div class="app-card app-radius-card border p-3 md:col-span-2">
            <div class="app-text-eyebrow">{{ t("talk_define.field_goal") }}</div>
            <textarea
              v-model="form.goal"
              class="app-input app-focus-ring app-radius-control mt-2 min-h-28 w-full border px-3 py-2 app-text-body"
              :placeholder="t('talk.goal_placeholder')"
              @blur="saveDefine"
            />
          </div>
          <div class="app-card app-radius-card border p-3 md:col-span-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div class="app-text-eyebrow">
                  {{ t("talk_define.stage_title") }}
                </div>
                <p class="app-muted app-text-meta mt-1">{{ t("talk_define.stage_hint") }}</p>
              </div>
              <span class="app-badge-neutral app-text-caption rounded-full px-2 py-1 font-semibold">
                {{ stageOptions.find((option) => option.value === projectStage)?.label }}
              </span>
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                v-for="option in stageOptions"
                :key="option.value"
                class="app-focus-ring app-button-sm inline-flex items-center transition"
                :class="projectStage === option.value ? 'app-button-secondary' : 'app-button-ghost'"
                type="button"
                @click="setStage(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <button
            v-if="nextAction"
            class="app-button-primary app-focus-ring app-button-lg inline-flex items-center"
            type="button"
            @click="runNextAction"
          >
            {{ nextAction.label }}
          </button>
          <RouterLink
            class="app-button-secondary app-focus-ring app-button-lg inline-flex items-center"
            :to="`/talks/${project.id}/builder`"
          >
            {{ t("talk_steps.builder") }}
          </RouterLink>
          <RouterLink
            class="app-button-secondary app-focus-ring app-button-lg inline-flex items-center"
            :to="`/talks/${project.id}/train`"
          >
            {{ t("talk_steps.train") }}
          </RouterLink>
          <RouterLink
            class="app-button-secondary app-focus-ring app-button-lg inline-flex items-center"
            :to="`/talks/${project.id}/export`"
          >
            {{ t("talk_steps.export") }}
          </RouterLink>
        </div>
      </div>
    </div>
  </TalkStepPageShell>
</template>
