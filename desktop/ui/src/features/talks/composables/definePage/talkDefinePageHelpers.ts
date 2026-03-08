import { appState } from "@/stores/app";
import {
  talkBuilderRoute,
  talkExportRoute,
  talkTrainRoute,
} from "@/features/talks/composables/shared/talkRoutes";

type TranslateFn = (key: string) => string;

export type TalkProject = (typeof appState.projects)[number];
export type DefineStage = "draft" | "builder" | "train" | "export";

export type DefineFormState = {
  title: string;
  audience: string;
  goal: string;
  durationMinutes: string;
};

export type DefinePayload = {
  title: string;
  audience: string | null;
  goal: string | null;
  duration_target_sec: number | null;
  stage: string;
};

export type DefineNextAction = {
  nextStage: DefineStage;
  route: string;
  label: string;
};

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function normalizeStage(stage: string | null | undefined): DefineStage {
  if (stage === "builder" || stage === "train" || stage === "export") {
    return stage;
  }
  return "draft";
}

export function checklistRowClass(done: boolean) {
  return done
    ? "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_12%,var(--color-surface))]"
    : "border-[var(--app-border)] bg-[var(--color-surface-elevated)]";
}

export function minutesLabel(t: TranslateFn, seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) {
    return t("talk_define.duration_missing");
  }
  return `${Math.round(seconds / 60)} ${t("talks.minutes")}`;
}

export function syncFormFromProject(form: DefineFormState, project: TalkProject | null) {
  if (!project) {
    form.title = "";
    form.audience = "";
    form.goal = "";
    form.durationMinutes = "";
    return;
  }
  form.title = project.title ?? "";
  form.audience = project.audience ?? "";
  form.goal = project.goal ?? "";
  form.durationMinutes = project.duration_target_sec
    ? String(Math.round(project.duration_target_sec / 60))
    : "";
}

export function buildPayload(
  t: TranslateFn,
  project: TalkProject | null,
  form: DefineFormState,
  stageOverride?: string
): DefinePayload {
  if (!project) {
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
    stage: stageOverride ?? project.stage ?? "draft",
  };
}

export function payloadMatchesProject(project: TalkProject | null, payload: DefinePayload) {
  if (!project) {
    return true;
  }
  return (
    payload.title === project.title &&
    (payload.audience ?? null) === (project.audience ?? null) &&
    (payload.goal ?? null) === (project.goal ?? null) &&
    (payload.duration_target_sec ?? null) === (project.duration_target_sec ?? null) &&
    payload.stage === project.stage
  );
}

export function createNextAction(
  t: TranslateFn,
  projectId: string | undefined,
  projectStage: DefineStage
): DefineNextAction | null {
  if (!projectId) {
    return null;
  }
  if (projectStage === "draft") {
    return {
      nextStage: "builder",
      route: talkBuilderRoute(projectId),
      label: t("talk_define.continue_builder"),
    };
  }
  if (projectStage === "builder") {
    return {
      nextStage: "train",
      route: talkTrainRoute(projectId),
      label: t("talk_define.continue_train"),
    };
  }
  if (projectStage === "train") {
    return {
      nextStage: "export",
      route: talkExportRoute(projectId),
      label: t("talk_define.continue_export"),
    };
  }
  return {
    nextStage: "export",
    route: talkExportRoute(projectId),
    label: t("talk_define.open_export"),
  };
}
