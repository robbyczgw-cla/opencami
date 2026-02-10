use tauri::Manager;

const DEFAULT_REMOTE_URL: &str = "https://openclaw-server.tail8a9ea9.ts.net:3001";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let remote_url = std::env::var("OPENCAMI_REMOTE_URL")
        .ok()
        .filter(|v| !v.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_REMOTE_URL.to_string());

      if let Some(window) = app.get_webview_window("main") {
        let script = format!("window.location.replace({remote_url:?});");
        window.eval(&script)?;
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
