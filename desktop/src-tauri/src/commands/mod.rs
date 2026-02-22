pub mod audio;
pub mod feedback;
pub mod outline;
pub mod pack;
pub mod peer_review;
pub mod profile;
pub mod project;
pub mod quest;
pub mod run;
#[cfg(debug_assertions)]
pub mod security;
pub mod transcription;

fn is_valid_event_name(name: &str) -> bool {
    name.chars()
        .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '/' | ':' | '_'))
}

pub fn assert_valid_event_name(name: &str) {
    assert!(is_valid_event_name(name), "invalid_event_name: {name}");
}
