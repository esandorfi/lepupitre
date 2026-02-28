<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { invoke } from "@tauri-apps/api/core";
import TalkStepPageShell from "../components/TalkStepPageShell.vue";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";
import type { TalksBlueprint } from "../schemas/ipc";

const { t } = useI18n();
const route = useRoute();

const error = ref<string | null>(null);
const isLoading = ref(false);
const isSaving = ref(false);
const saveStatus = ref<"idle" | "saving" | "saved" | "error">("idle");
const outline = ref("");
const exportPath = ref<string | null>(null);
const isExporting = ref(false);
const isRevealing = ref(false);
const blueprint = ref<TalksBlueprint | null>(null);
const isApplyingTemplate = ref(false);

const activeProfileId = computed(() => appStore.state.activeProfileId);
const selectedProjectId = computed(() => {
  const paramId = String(route.params.projectId || "");
  if (paramId) {
    return paramId;
  }
  const queryId = String(route.query.projectId || "");
  if (queryId) {
    return queryId;
  }
  return appStore.state.activeProject?.id ?? "";
});
const selectedProject = computed(() => {
  const projectId = selectedProjectId.value;
  if (!projectId) {
    return null;
  }
  return (
    appStore.state.projects.find((project) => project.id === projectId) ??
    appStore.state.activeProject ??
    null
  );
});
const talkLabel = computed(() => {
  if (!selectedProject.value) {
    return "";
  }
  const number = appStore.getTalkNumber(selectedProject.value.id);
  const prefix = number ? `T${number} · ` : "";
  return `${prefix}${selectedProject.value.title}`;
});

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

async function markBuilderStage() {
  if (!selectedProjectId.value) {
    return;
  }
  try {
    await appStore.ensureProjectStageAtLeast(selectedProjectId.value, "builder");
  } catch {
    // keep save/export non-blocking
  }
}

async function loadOutline() {
  error.value = null;
  exportPath.value = null;
  outline.value = "";
  blueprint.value = null;
  isLoading.value = true;
  try {
    await appStore.bootstrap();
    await appStore.loadProjects();
    const projectId = selectedProjectId.value;
    if (!projectId || !activeProfileId.value) {
      return;
    }
    const doc = await appStore.getOutline(projectId);
    outline.value = doc.markdown;
    blueprint.value = await appStore.getTalksBlueprint(projectId);
    saveStatus.value = "idle";
  } catch (err) {
    error.value = toError(err);
  } finally {
    isLoading.value = false;
  }
}

function frameworkPrompts(frameworkId: string) {
  if (frameworkId === "problem-solution-impact") {
    return [
      t("builder.prompt_problem_solution_impact_1"),
      t("builder.prompt_problem_solution_impact_2"),
      t("builder.prompt_problem_solution_impact_3"),
    ];
  }
  if (frameworkId === "context-change-decision") {
    return [
      t("builder.prompt_context_change_decision_1"),
      t("builder.prompt_context_change_decision_2"),
      t("builder.prompt_context_change_decision_3"),
    ];
  }
  return [
    t("builder.prompt_hook_story_proof_1"),
    t("builder.prompt_hook_story_proof_2"),
    t("builder.prompt_hook_story_proof_3"),
  ];
}

function templateSections(frameworkId: string) {
  if (frameworkId === "problem-solution-impact") {
    return [
      `## ${t("builder.template_problem")}`,
      `## ${t("builder.template_solution")}`,
      `## ${t("builder.template_impact")}`,
      `## ${t("builder.template_decision")}`,
    ];
  }
  if (frameworkId === "context-change-decision") {
    return [
      `## ${t("builder.template_context")}`,
      `## ${t("builder.template_change")}`,
      `## ${t("builder.template_options")}`,
      `## ${t("builder.template_decision")}`,
    ];
  }
  return [
    `## ${t("builder.template_hook")}`,
    `## ${t("builder.template_story")}`,
    `## ${t("builder.template_proof")}`,
    `## ${t("builder.template_close")}`,
  ];
}

const activeFrameworkPrompts = computed(() =>
  frameworkPrompts(blueprint.value?.framework_id ?? "hook-story-proof")
);

async function applyFrameworkTemplate() {
  if (!blueprint.value) {
    return;
  }
  const sections = templateSections(blueprint.value.framework_id);
  const template = sections.map((section) => `${section}\n`).join("\n");

  const hasOutline = outline.value.trim().length > 0;
  if (hasOutline) {
    const confirmed = window.confirm(t("builder.template_confirm_overwrite"));
    if (!confirmed) {
      return;
    }
  }

  isApplyingTemplate.value = true;
  outline.value = template;
  await saveOutline();
  isApplyingTemplate.value = false;
}

async function saveOutline() {
  if (!selectedProjectId.value) {
    error.value = t("builder.no_talk");
    return;
  }
  isSaving.value = true;
  saveStatus.value = "saving";
  error.value = null;
  try {
    await appStore.saveOutline(selectedProjectId.value, outline.value);
    await markBuilderStage();
    saveStatus.value = "saved";
    setTimeout(() => {
      saveStatus.value = "idle";
    }, 1200);
  } catch (err) {
    saveStatus.value = "error";
    error.value = toError(err);
  } finally {
    isSaving.value = false;
  }
}

async function exportOutline() {
  if (!selectedProjectId.value) {
    error.value = t("builder.no_talk");
    return;
  }
  isExporting.value = true;
  error.value = null;
  try {
    await markBuilderStage();
    const result = await appStore.exportOutline(selectedProjectId.value);
    exportPath.value = result.path;
  } catch (err) {
    error.value = toError(err);
  } finally {
    isExporting.value = false;
  }
}

async function revealExport() {
  if (!exportPath.value) {
    return;
  }
  isRevealing.value = true;
  error.value = null;
  try {
    await invoke("audio_reveal_wav", { path: exportPath.value });
  } catch (err) {
    error.value = toError(err);
  } finally {
    isRevealing.value = false;
  }
}

onMounted(loadOutline);
watch(
  () => selectedProjectId.value,
  () => {
    loadOutline();
  }
);
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

    <div v-if="!activeProfileId" class="app-panel app-panel-compact">
      <p class="app-muted app-text-body">{{ t("builder.no_profile") }}</p>
      <RouterLink class="app-link app-text-meta mt-3 inline-block underline" to="/profiles">
        {{ t("builder.setup_profile") }}
      </RouterLink>
    </div>

    <div v-else-if="!selectedProjectId" class="app-panel app-panel-compact">
      <p class="app-muted app-text-body">{{ t("builder.no_talk") }}</p>
      <RouterLink class="app-link app-text-meta mt-3 inline-block underline" to="/project/new">
        {{ t("builder.setup_talk") }}
      </RouterLink>
    </div>

    <div v-else class="space-y-4">
      <div v-if="blueprint" class="app-panel app-panel-compact border border-[var(--color-accent)] bg-[var(--color-surface-selected)]">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="app-text-eyebrow">{{ t("builder.framework_title") }}</div>
            <div class="app-text app-text-section-title mt-1">{{ blueprint.framework_label }}</div>
            <div class="app-muted app-text-body mt-1">{{ blueprint.framework_summary }}</div>
          </div>
          <button
            class="app-button-secondary app-focus-ring app-button-md inline-flex items-center disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="isApplyingTemplate || isSaving"
            @click="applyFrameworkTemplate"
          >
            {{ t("builder.framework_apply_template") }}
          </button>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <span
            v-for="(prompt, index) in activeFrameworkPrompts"
            :key="`framework-prompt-${index}`"
            class="app-badge-neutral app-text-caption inline-flex items-center rounded-full px-2 py-1 font-semibold"
          >
            {{ prompt }}
          </span>
        </div>
      </div>

      <div class="app-panel">
        <div class="app-text-eyebrow">
          {{ t("builder.outline_label") }}
        </div>
        <textarea
          v-model="outline"
          rows="12"
          class="app-input app-focus-ring app-radius-control mt-3 w-full border px-3 py-2 app-text-body"
        ></textarea>
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <button
            class="app-button-primary app-focus-ring app-button-md inline-flex items-center disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="isSaving"
            @click="saveOutline"
          >
            {{ t("builder.save") }}
          </button>
          <button
            class="app-button-secondary app-focus-ring app-button-md inline-flex items-center disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="isExporting"
            @click="exportOutline"
          >
            {{ t("builder.export") }}
          </button>
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
          <button
            class="app-link app-text-meta underline"
            type="button"
            :disabled="isRevealing"
            @click="revealExport"
          >
            {{ t("builder.export_reveal") }}
          </button>
          <span class="app-subtle app-text-meta">{{ t("builder.export_ready") }}</span>
        </div>
        <div v-if="isLoading" class="app-muted app-text-meta mt-3">
          {{ t("builder.loading") }}
        </div>
        <div v-if="error" class="app-danger-text app-text-meta mt-3">
          {{ error }}
        </div>
      </div>
    </div>
  </TalkStepPageShell>
</template>
