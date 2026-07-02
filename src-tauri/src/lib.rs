use tauri::Emitter;

fn is_markdown_path(path: &str) -> bool {
  let lower = path.to_ascii_lowercase();
  lower.ends_with(".md") || lower.ends_with(".markdown")
}

fn markdown_paths_from_args<I>(args: I) -> Vec<String>
where
  I: IntoIterator<Item = String>,
{
  args
    .into_iter()
    .filter(|arg| is_markdown_path(arg))
    .collect()
}

#[tauri::command]
fn initial_open_paths() -> Vec<String> {
  markdown_paths_from_args(std::env::args().skip(1))
}

fn emit_open_paths(app: &tauri::AppHandle, paths: Vec<String>) {
  if paths.is_empty() {
    return;
  }

  let _ = app.emit("markitty://open-files", paths);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let app = tauri::Builder::default()
    .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
      emit_open_paths(app, markdown_paths_from_args(args.into_iter().skip(1)));
    }))
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![initial_open_paths])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application");

  app.run(|app_handle, event| {
    #[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
    if let tauri::RunEvent::Opened { urls } = event {
      let paths = urls
        .into_iter()
        .filter_map(|url| url.to_file_path().ok())
        .filter_map(|path| path.into_os_string().into_string().ok())
        .filter(|path| is_markdown_path(path))
        .collect();
      emit_open_paths(app_handle, paths);
    }

    #[cfg(not(any(target_os = "macos", target_os = "ios", target_os = "android")))]
    let _ = (app_handle, event);
  });
}
