mod commands;
mod core;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(debug_assertions)]
    {
        tauri::Builder::default()
            .invoke_handler(tauri::generate_handler![
                commands::audio::audio_reveal_wav,
                commands::audio::audio_save_wav,
                commands::profile::profile_create,
                commands::profile::profile_delete,
                commands::profile::profile_list,
                commands::profile::profile_rename,
                commands::profile::profile_switch,
                commands::project::project_create,
                commands::project::project_get_active,
                commands::quest::quest_get_daily,
                commands::quest::quest_submit_text,
                commands::transcription::transcribe_audio,
                commands::transcription::transcript_get,
                commands::security::security_prepare_appdata_file,
                commands::security::security_probe_fs
            ])
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    }

    #[cfg(not(debug_assertions))]
    {
        tauri::Builder::default()
            .invoke_handler(tauri::generate_handler![
                commands::audio::audio_reveal_wav,
                commands::audio::audio_save_wav,
                commands::profile::profile_create,
                commands::profile::profile_delete,
                commands::profile::profile_list,
                commands::profile::profile_rename,
                commands::profile::profile_switch,
                commands::project::project_create,
                commands::project::project_get_active,
                commands::quest::quest_get_daily,
                commands::quest::quest_submit_text,
                commands::transcription::transcribe_audio,
                commands::transcription::transcript_get
            ])
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    }
}
