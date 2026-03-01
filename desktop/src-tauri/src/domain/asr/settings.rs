use serde::Deserialize;

const DEFAULT_MODEL_ID: &str = "tiny";

#[derive(Debug, Deserialize, Clone)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionAsrSettingsPayload {
    pub model: Option<String>,
    pub language: Option<String>,
    pub spoken_punctuation: Option<bool>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "camelCase")]
pub struct RecordingAsrSettingsPayload {
    pub model: Option<String>,
    pub mode: Option<String>,
    pub language: Option<String>,
}

#[derive(Debug, Clone)]
pub struct AsrRuntimeSettings {
    pub model_id: String,
    pub language: String,
    pub spoken_punctuation: bool,
}

#[derive(Debug, Clone)]
pub struct RecordingAsrRuntimeSettings {
    pub model_id: String,
    pub language: String,
    pub live_enabled: bool,
    pub auto_benchmark: bool,
}

pub fn normalize_transcription_settings(
    payload: Option<TranscriptionAsrSettingsPayload>,
) -> AsrRuntimeSettings {
    let mut model_id = DEFAULT_MODEL_ID.to_string();
    let mut language = "auto".to_string();
    let mut spoken_punctuation = false;

    if let Some(payload) = payload {
        if let Some(model) = payload.model.as_deref() {
            if model == "tiny" || model == "base" {
                model_id = model.to_string();
            }
        }
        if let Some(language_value) = payload.language.as_deref() {
            if language_value == "auto" || language_value == "en" || language_value == "fr" {
                language = language_value.to_string();
            }
        }
        if let Some(value) = payload.spoken_punctuation {
            spoken_punctuation = value;
        }
    }

    AsrRuntimeSettings {
        model_id,
        language,
        spoken_punctuation,
    }
}

pub fn normalize_recording_settings(
    payload: Option<RecordingAsrSettingsPayload>,
) -> RecordingAsrRuntimeSettings {
    let mut model_id = DEFAULT_MODEL_ID.to_string();
    let mut language = "auto".to_string();
    let mut live_enabled = true;
    let mut auto_benchmark = false;

    if let Some(payload) = payload {
        if let Some(model) = payload.model.as_deref() {
            if model == "tiny" || model == "base" {
                model_id = model.to_string();
            }
        }
        if let Some(language_value) = payload.language.as_deref() {
            if language_value == "auto" || language_value == "en" || language_value == "fr" {
                language = language_value.to_string();
            }
        }
        if let Some(mode) = payload.mode.as_deref() {
            if mode == "final-only" {
                live_enabled = false;
            } else if mode == "auto" && model_id == "tiny" {
                auto_benchmark = true;
            }
        }
    }

    RecordingAsrRuntimeSettings {
        model_id,
        language,
        live_enabled,
        auto_benchmark,
    }
}
