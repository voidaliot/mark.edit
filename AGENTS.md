# Markitty Agent Notes

Markitty is a React + TypeScript + Tauri 2 app. It is a lightweight, local-first Markdown editor, not a notes platform.

CodeMirror 6 is used for Markdown source editing. The editor supports lightweight browser-style document tabs; keep tab/document behavior in `src/editor`, Markdown rendering separate from editing, storage in `src/storage`, and Tauri/platform code in `src/platform`.

The desktop titlebar is custom chrome in `src/platform/WindowTitlebar.tsx`; its window permissions are desktop-only in `src-tauri/capabilities/desktop-window.json`. Keep native controls off mobile and browser builds. Theme preference is System/Light/Dark; pass the resolved light/dark theme to renderers. Keep CodeMirror mounted when previewing and reconfigure its theme with a compartment so each tab's undo history and selection survive view and theme changes.

Local Mermaid and PlantUML rendering lives in `src/markdown/diagrams`, adapted from the neighboring `simple.pdf` project. Keep PlantUML's compiled engine as a verbatim URL asset and retain the `plantuml.html` build entry and built-in icon packs in `vite.config.ts`. Run `npm run build:web` then `npm run test:browser` in Microsoft Edge to verify the actual engines under the desktop content policy.

The app icon source is `app-icon.svg`; regenerate Tauri icons with `npx tauri icon app-icon.svg` after changing the shared Markitty cat mark.

Avoid heavy dependencies and large state-management libraries. Do not add sync, login, AI, cloud, collaboration, plugins, or account features unless explicitly requested.

When asked to build all app versions, build release outputs only: the Windows desktop release executable plus one Android arm64/aarch64 release APK for current devices. Do not build Windows installer bundles (MSI/NSIS), debug artifacts, all Android ABIs, or AABs unless explicitly requested.

The local Android release signing key is `.release-signing/markitty.jks` (alias `markitty`), with its password in `.release-signing/password.txt`. Both are ignored by Git. Reuse this key when signing release APKs so installed apps can be updated; never upload the key or password as release assets.

Verify changes with focused tests. Update this file only for durable project knowledge that future coding agents should know.
