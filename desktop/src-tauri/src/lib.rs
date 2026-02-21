mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(debug_assertions)]
    {
        tauri::Builder::default()
            .invoke_handler(tauri::generate_handler![
                commands::audio::audio_reveal_wav,
                commands::audio::audio_save_wav,
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
                commands::audio::audio_save_wav
            ])
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    }
}
