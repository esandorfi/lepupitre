use std::time::{SystemTime, UNIX_EPOCH};

fn first_non_empty_env(keys: &[&str]) -> Option<String> {
    for key in keys {
        if let Ok(value) = std::env::var(key) {
            let trimmed = value.trim();
            if !trimmed.is_empty() {
                return Some(trimmed.to_string());
            }
        }
    }
    None
}

fn main() {
    if let Some(commit) = first_non_empty_env(&["LEPUPITRE_ASR_GIT_COMMIT", "GITHUB_SHA"]) {
        println!("cargo:rustc-env=LEPUPITRE_ASR_GIT_COMMIT={commit}");
    }

    let build_unix_epoch = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string());
    println!("cargo:rustc-env=LEPUPITRE_ASR_BUILD_UNIX_EPOCH={build_unix_epoch}");
}
