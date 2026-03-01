pub(super) const LIST_PEER_REVIEWS_BY_PROJECT: &str =
    "SELECT pr.id, pr.run_id, r.project_id, pr.created_at, pr.reviewer_tag
     FROM peer_reviews pr
     JOIN runs r ON r.id = pr.run_id
     WHERE r.project_id = ?1
     ORDER BY pr.created_at DESC
     LIMIT ?2";

pub(super) const SELECT_PEER_REVIEW_DETAIL_ROW: &str =
    "SELECT pr.run_id, r.project_id, pr.created_at, pr.reviewer_tag, pr.review_json_artifact_id
     FROM peer_reviews pr
     JOIN runs r ON r.id = pr.run_id
     WHERE pr.id = ?1";
