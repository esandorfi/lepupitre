mod mutations;
mod queries;

pub use mutations::{profile_create_row, profile_delete_row, profile_switch_row, rename_profile};
pub use queries::{select_profiles, talk_count};
