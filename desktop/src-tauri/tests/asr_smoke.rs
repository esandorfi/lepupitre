use lepupitre_lib::core::asr_sidecar;
use std::path::PathBuf;

fn env_enabled() -> bool {
    matches!(std::env::var("LEPUPITRE_ASR_SMOKE").ok().as_deref(), Some("1"))
}

fn env_path(key: &str) -> Option<PathBuf> {
    std::env::var(key).ok().map(PathBuf::from)
}

#[test]
fn asr_sidecar_smoke_decode() {
    if !env_enabled() {
        eprintln!("ASR smoke test skipped (LEPUPITRE_ASR_SMOKE!=1)");
        return;
    }

    let sidecar = match env_path("LEPUPITRE_ASR_SIDECAR") {
        Some(path) if path.exists() => path,
        _ => {
            eprintln!("ASR smoke test skipped (missing LEPUPITRE_ASR_SIDECAR)");
            return;
        }
    };

    let model = match env_path("LEPUPITRE_ASR_MODEL_PATH") {
        Some(path) if path.exists() => path,
        _ => {
            eprintln!("ASR smoke test skipped (missing LEPUPITRE_ASR_MODEL_PATH)");
            return;
        }
    };

    let mut decoder = asr_sidecar::SidecarDecoder::spawn(&sidecar, &model, "auto")
        .expect("sidecar spawn failed");

    let samples = vec![0.0f32; 16_000];
    let segments = decoder
        .decode_window(&samples, 0, 1000, asr_sidecar::DecodeMode::Live)
        .expect("sidecar decode failed");

    let _ = segments;
}
