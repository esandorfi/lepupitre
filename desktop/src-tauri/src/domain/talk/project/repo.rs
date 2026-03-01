mod queries;
mod writes;

pub use queries::{
    fetch_latest_project, fetch_project_by_id, find_training_project_id, get_active_project_id,
    is_training_project, next_talk_number, select_project_list, select_project_training_state,
};
pub use writes::{
    insert_project, insert_training_project, set_active_project_id, update_project,
    InsertProjectParams, UpdateProjectParams,
};
