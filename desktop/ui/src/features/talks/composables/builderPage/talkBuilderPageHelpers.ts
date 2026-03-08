export function frameworkPrompts(t: (key: string) => string, frameworkId: string) {
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

export function templateSections(t: (key: string) => string, frameworkId: string) {
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
