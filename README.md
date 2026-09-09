# Markitty

Markdown editor with claws.

Markitty is a lightweight, local-first Markdown editor for Windows, macOS, Android, and iOS. It is meant to feel small, fast, friendly, and Typora-inspired without becoming a full notes platform.

## Tech Stack

- React
- TypeScript
- Vite
- Tauri 2
- CodeMirror 6
- markdown-it
- DOMPurify
- Vitest

## Setup

```bash
npm install
```

## Development

Run the web app:

```bash
npm run dev
```

Run the Tauri desktop shell:

```bash
npm run tauri dev
```

## Build

Build the frontend:

```bash
npm run build
```

Build the Tauri desktop app executable without installer bundles:

```bash
npm run build:desktop
```

Build the Android release APK for current arm64 devices:

```bash
npm run build:android
```

Build the standard release outputs:

```bash
npm run build:all
```

## Releases

Run the **Release** workflow in GitHub Actions (or `gh workflow run release.yml --ref main`).
It checks the app, builds the Windows x64 release executable, then creates a
`vMAJOR.MINOR.PATCH` tag at the selected commit and publishes a GitHub release
with the executable and `SHA256SUMS.txt`. The same files are saved as a workflow
artifact. The executable requires Microsoft Edge WebView2 Runtime.

Before the next release, update the matching versions in `package.json`,
`package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, and
`src-tauri/tauri.conf.json`, then commit and push. Existing tags are never replaced.
Only Windows x64 is built; release binaries are currently unsigned.

## Test

```bash
npm test
```

## MVP Features

- Create a new Markdown document.
- Use top document tabs in a compact desktop titlebar, with keyboard navigation and middle-click to close.
- Edit Markdown with CodeMirror 6.
- Render Markdown preview with sanitized output.
- Render Mermaid and PlantUML fenced diagrams locally, with zoom, source view, and SVG export.
- Toggle edit, preview, and split modes on wide screens.
- Save drafts locally and recover them after restart.
- Keep separate undo histories and cursor positions for each tab, including across theme and preview changes.
- Save, discard, or cancel before closing a tab with unsaved changes.
- Open and save `.md` or `.markdown` files where platform support allows it.
- Use formatting toolbar actions for headings, bold, italic, inline code, code blocks, links, lists, and quotes.
- Insert Markdown image embeds and file attachments from local files.
- Use desktop keyboard shortcuts for bold, italic, save, save as, new, open, and tab navigation.
- Follow the system theme automatically, or choose Light or Dark from the titlebar.
- See word count, character count, and save status.
- Use the shared Markitty cat icon across the app UI, favicon, and generated Tauri icons.

## Keyboard shortcuts

Use Ctrl on Windows/Linux or Command on macOS for document actions.

| Action | Shortcut |
| --- | --- |
| New tab | Ctrl+T or Ctrl+N |
| Open files | Ctrl+O |
| Save / Save as | Ctrl+S / Ctrl+Shift+S |
| Close tab | Ctrl+W |
| Next / previous tab | Ctrl+Tab / Ctrl+Shift+Tab |
| Bold / italic | Ctrl+B / Ctrl+I |

When a tab has focus, Left/Right, Home/End, and Delete navigate or close tabs.

## Diagrams

Use a `mermaid` or `plantuml` fenced code block in a Markdown document:

````markdown
```mermaid
flowchart LR
  Write --> Preview --> Save
```

```plantuml
@startuml
Alice -> Bob: Hello
Bob --> Alice: Hi!
@enduml
```
````

Aliases `mmd`, `puml`, `pu`, and `uml` also work, including nested and tilde
fences. A PlantUML fence can contain several `@start…` / `@end…` blocks;
simple snippets without markers are wrapped automatically.

Preview and split modes render diagrams on this device. The engines and
built-in PlantUML icons ship with the app; Java, a server, and an internet
connection are not required. Each diagram offers zoom, fit, source, copy,
and SVG export controls. Invalid diagrams show an explanation and their
source while the rest of the document remains readable.

The bundled PlantUML JavaScript engine does not support Ditaa, Salt wireframes,
nwdiag, or library listings. External includes, imported libraries, and external
data are unavailable; inline those definitions instead. Each diagram is limited
to 50,000 characters and previews render up to 100 diagrams per document.

Run the rendering checks in Microsoft Edge against the production build and
desktop content policy:

```bash
npm run build:web
npm run test:browser
```

## Screenshots

### Windows

![sample](<sample.png>)

## Roadmap

- Improve mobile native file import/export.
- Add find and replace.
- Add print/export options.
- Add optional line/word wrap preferences.

## License

MIT
