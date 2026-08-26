use std::path::Path;
use tauri::{Emitter, Manager};

#[derive(serde::Serialize)]
struct OpenedMarkdownFile {
  title: String,
  content: String,
  path: String,
}

#[derive(serde::Serialize)]
struct OpenMarkdownPathsResult {
  files: Vec<OpenedMarkdownFile>,
  errors: Vec<String>,
}

#[derive(serde::Serialize)]
struct SavedMarkdownFile {
  title: String,
  path: String,
}

fn is_text_document_path(path: &str) -> bool {
  let lower = path.to_ascii_lowercase();
  lower.ends_with(".md")
    || lower.ends_with(".markdown")
    || lower.ends_with(".txt")
    || lower.ends_with(".text")
}

fn title_from_path(path: &str) -> String {
  std::path::Path::new(path)
    .file_name()
    .and_then(|name| name.to_str())
    .unwrap_or("Untitled.md")
    .to_string()
}

fn allow_asset_directory_for_path(app: &tauri::AppHandle, path: &str) {
  let path = Path::new(path);
  if let Some(directory) = path.parent() {
    let _ = app.asset_protocol_scope().allow_directory(directory, true);
  }
}

fn markdown_paths_from_args<I>(args: I) -> Vec<String>
where
  I: IntoIterator<Item = String>,
{
  args
    .into_iter()
    .filter(|arg| is_text_document_path(arg))
    .collect()
}

#[tauri::command]
fn initial_open_paths() -> Vec<String> {
  markdown_paths_from_args(std::env::args().skip(1))
}

#[tauri::command]
fn open_markdown_paths(app: tauri::AppHandle, paths: Vec<String>) -> OpenMarkdownPathsResult {
  let mut files = Vec::new();
  let mut errors = Vec::new();

  for path in paths.into_iter().filter(|path| is_text_document_path(path)) {
    match std::fs::read_to_string(&path) {
      Ok(content) => {
        allow_asset_directory_for_path(&app, &path);
        files.push(OpenedMarkdownFile {
          title: title_from_path(&path),
          content,
          path,
        });
      }
      Err(error) => errors.push(format!("Unable to open {}: {}", path, error)),
    }
  }

  OpenMarkdownPathsResult { files, errors }
}

#[tauri::command]
fn save_markdown_path(
  app: tauri::AppHandle,
  path: String,
  content: String,
) -> Result<SavedMarkdownFile, String> {
  if !is_text_document_path(&path) {
    return Err("Only Markdown or text files can be saved.".to_string());
  }

  std::fs::write(&path, content)
    .map_err(|error| format!("Unable to save {}: {}", path, error))?;

  allow_asset_directory_for_path(&app, &path);

  Ok(SavedMarkdownFile {
    title: title_from_path(&path),
    path,
  })
}

#[tauri::command]
fn allow_asset_paths(app: tauri::AppHandle, paths: Vec<String>) -> Result<(), String> {
  for path in paths {
    app
      .asset_protocol_scope()
      .allow_file(Path::new(&path))
      .map_err(|error| format!("Unable to authorize {}: {}", path, error))?;
  }

  Ok(())
}

fn emit_open_paths(app: &tauri::AppHandle, paths: Vec<String>) {
  if paths.is_empty() {
    return;
  }

  if let Some(window) = app.get_webview_window("main") {
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
  }

  let _ = app.emit("markitty://open-files", paths);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default();

  #[cfg(not(mobile))]
  let builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
    emit_open_paths(app, markdown_paths_from_args(args.into_iter().skip(1)));
  }));

  let app = builder
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![
      initial_open_paths,
      open_markdown_paths,
      allow_asset_paths,
      save_markdown_path
    ])
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
        .filter(|path| is_text_document_path(path))
        .collect();
      emit_open_paths(app_handle, paths);
    }

    #[cfg(not(any(target_os = "macos", target_os = "ios", target_os = "android")))]
    let _ = (app_handle, event);
  });
}
