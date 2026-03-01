use super::super::types::TalksBlueprintStep;

pub(super) fn build_talks_steps(
    fr: bool,
    project_id: &str,
    define_done: bool,
    structure_done: bool,
    rehearse_done: bool,
    feedback_done: bool,
    ship_done: bool,
) -> Vec<TalksBlueprintStep> {
    let mut steps = Vec::with_capacity(5);
    if fr {
        steps.push(TalksBlueprintStep {
            id: "define".to_string(),
            title: "Definir le talk (titre, audience, objectif, duree)".to_string(),
            done: define_done,
            reward_credits: 20,
            cta_route: Some(format!("/talks/{project_id}/define")),
        });
        steps.push(TalksBlueprintStep {
            id: "structure".to_string(),
            title: "Structurer l'outline avec le cadre recommande".to_string(),
            done: structure_done,
            reward_credits: 30,
            cta_route: Some(format!("/talks/{project_id}/builder")),
        });
        steps.push(TalksBlueprintStep {
            id: "rehearse".to_string(),
            title: "Faire une repetition en audio".to_string(),
            done: rehearse_done,
            reward_credits: 25,
            cta_route: Some(format!("/talks/{project_id}/train")),
        });
        steps.push(TalksBlueprintStep {
            id: "feedback".to_string(),
            title: "Generer au moins un feedback".to_string(),
            done: feedback_done,
            reward_credits: 25,
            cta_route: Some(format!("/talks/{project_id}/train")),
        });
        steps.push(TalksBlueprintStep {
            id: "ship".to_string(),
            title: "Passer le talk au stade export".to_string(),
            done: ship_done,
            reward_credits: 40,
            cta_route: Some(format!("/talks/{project_id}/export")),
        });
    } else {
        steps.push(TalksBlueprintStep {
            id: "define".to_string(),
            title: "Define talk scope (title, audience, goal, duration)".to_string(),
            done: define_done,
            reward_credits: 20,
            cta_route: Some(format!("/talks/{project_id}/define")),
        });
        steps.push(TalksBlueprintStep {
            id: "structure".to_string(),
            title: "Build an outline with the recommended framework".to_string(),
            done: structure_done,
            reward_credits: 30,
            cta_route: Some(format!("/talks/{project_id}/builder")),
        });
        steps.push(TalksBlueprintStep {
            id: "rehearse".to_string(),
            title: "Record at least one rehearsal take".to_string(),
            done: rehearse_done,
            reward_credits: 25,
            cta_route: Some(format!("/talks/{project_id}/train")),
        });
        steps.push(TalksBlueprintStep {
            id: "feedback".to_string(),
            title: "Generate at least one feedback pass".to_string(),
            done: feedback_done,
            reward_credits: 25,
            cta_route: Some(format!("/talks/{project_id}/train")),
        });
        steps.push(TalksBlueprintStep {
            id: "ship".to_string(),
            title: "Move this talk to export stage".to_string(),
            done: ship_done,
            reward_credits: 40,
            cta_route: Some(format!("/talks/{project_id}/export")),
        });
    }
    steps
}
