use tauri::{
  menu::{Menu, MenuItem},
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
  Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;

fn resolved_remote_url() -> String {
  // 1. Runtime env var (highest priority)
  if let Ok(v) = std::env::var("OPENCAMI_REMOTE_URL") {
    if !v.trim().is_empty() {
      return v;
    }
  }
  // 2. Compile-time env var (set during build)
  let build_url = option_env!("OPENCAMI_REMOTE_URL").unwrap_or("http://localhost:3003");
  build_url.to_string()
}

fn apply_remote_url(window: &tauri::WebviewWindow, remote_url: &str) -> tauri::Result<()> {
  let script = format!("window.location.replace({remote_url:?});");
  window.eval(&script)
}

fn show_and_focus(window: &tauri::WebviewWindow) {
  let _ = window.show();
  let _ = window.unminimize();
  let _ = window.set_focus();
}

fn create_new_window(app: &tauri::AppHandle) -> tauri::Result<()> {
  let label = format!("window-{}", uuid::Uuid::new_v4().simple());
  let remote = resolved_remote_url();
  let window = WebviewWindowBuilder::new(app, label, WebviewUrl::External(remote.parse().unwrap()))
    .title("OpenCami")
    .inner_size(1200.0, 800.0)
    .min_inner_size(800.0, 600.0)
    .resizable(true)
    .center()
    .build()?;

  let remote_url = resolved_remote_url();
  apply_remote_url(&window, &remote_url)?;
  Ok(())
}

#[tauri::command]
fn new_window(app: tauri::AppHandle) -> Result<(), String> {
  create_new_window(&app).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_autostart_enabled(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
  use tauri_plugin_autostart::ManagerExt;

  let autostart = app.autolaunch();
  if enabled {
    autostart.enable().map_err(|e| e.to_string())?;
  } else {
    autostart.disable().map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[tauri::command]
fn is_autostart_enabled(app: tauri::AppHandle) -> Result<bool, String> {
  use tauri_plugin_autostart::ManagerExt;

  app
    .autolaunch()
    .is_enabled()
    .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_clipboard_manager::init())
    .plugin(tauri_plugin_autostart::init(
      MacosLauncher::LaunchAgent,
      Some(vec!["--autostart"]),
    ))
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let remote_url = resolved_remote_url();

      // Create main window pointing directly to remote URL (no index.html needed)
      let _main_window = WebviewWindowBuilder::new(
        app,
        "main",
        WebviewUrl::External(remote_url.parse().map_err(|e| format!("Invalid URL: {e}"))?),
      )
        .title("OpenCami")
        .inner_size(1200.0, 800.0)
        .min_inner_size(800.0, 600.0)
        .resizable(true)
        .center()
        .build()?;

      let show_item = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
      let hide_item = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
      let new_window_item =
        MenuItem::with_id(app, "new_window", "New Window", true, Some("CmdOrCtrl+N"))?;
      let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
      let tray_menu = Menu::with_items(app, &[&show_item, &hide_item, &new_window_item, &quit_item])?;

      let default_icon = app.default_window_icon().cloned();
      let mut tray_builder = TrayIconBuilder::with_id("main-tray").menu(&tray_menu);
      if let Some(icon) = default_icon {
        tray_builder = tray_builder.icon(icon);
      }

      tray_builder
        .show_menu_on_left_click(false)
        .on_menu_event(|app: &tauri::AppHandle, event: tauri::menu::MenuEvent| match event.id().as_ref() {
          "show" => {
            if let Some(window) = app.get_webview_window("main") {
              show_and_focus(&window);
            }
          }
          "hide" => {
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.hide();
            }
          }
          "new_window" => {
            let _ = create_new_window(app);
          }
          "quit" => {
            app.exit(0);
          }
          _ => {}
        })
        .on_tray_icon_event(|tray: &tauri::tray::TrayIcon, event: tauri::tray::TrayIconEvent| {
          if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
          } = event
          {
            if let Some(window) = tray.app_handle().get_webview_window("main") {
              show_and_focus(&window);
            }
          }
        })
        .build(app)?;

      Ok(())
    })
    .on_window_event(|window, event| {
      if window.label() == "main" {
        if let WindowEvent::CloseRequested { api, .. } = event {
          api.prevent_close();
          let _ = window.hide();
        }
      }
    })
    .invoke_handler(tauri::generate_handler![
      new_window,
      set_autostart_enabled,
      is_autostart_enabled
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
