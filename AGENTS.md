# Markitty Agent Notes

Markitty is a React + TypeScript + Tauri 2 app. It is a lightweight, local-first Markdown editor, not a notes platform.

CodeMirror 6 is used for Markdown source editing. The editor supports lightweight browser-style document tabs; keep tab/document behavior in `src/editor`, Markdown rendering separate from editing, storage in `src/storage`, and Tauri/platform code in `src/platform`.

The app icon source is `app-icon.svg`; regenerate Tauri icons with `npx tauri icon app-icon.svg` after changing the shared Markitty cat mark.

Avoid heavy dependencies and large state-management libraries. Do not add sync, login, AI, cloud, collaboration, plugins, or account features unless explicitly requested.

Verify changes with focused tests. Update this file only for durable project knowledge that future coding agents should know.
