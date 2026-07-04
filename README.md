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

## Test

```bash
npm test
```

## MVP Features

- Create a new Markdown document.
- Use browser-style tabs for multiple open Markdown documents.
- Edit Markdown with CodeMirror 6.
- Render Markdown preview with sanitized output.
- Toggle edit, preview, and split modes on wide screens.
- Save drafts locally and recover them after restart.
- Open and save `.md` or `.markdown` files where platform support allows it.
- Use formatting toolbar actions for headings, bold, italic, inline code, code blocks, links, lists, and quotes.
- Insert Markdown image embeds and file attachments from local files.
- Use desktop keyboard shortcuts for bold, italic, save, new, and open.
- Switch between light and dark themes.
- See word count, character count, and save status.
- Use the shared Markitty cat icon across the app UI, favicon, and generated Tauri icons.

## Screenshots

Screenshots coming soon.

## Known Limitations

- Browser fallback save downloads a new Markdown file instead of writing back to the original path.
- Browser fallback embeds use filenames because browsers do not expose full local file paths.
- Native mobile file handling is intentionally minimal in the MVP.
- Tauri edit permissions are scoped to Markdown files; preview assets can load from common user directories for local embeds.
- Unsaved tab close confirmation is not implemented yet.
- There is no cloud sync, login, collaboration, AI, plugin system, or workspace management.

## Roadmap

- Improve mobile native file import/export.
- Add find and replace.
- Add print/export options.
- Add optional line/word wrap preferences.

## Screenshot (Windows)

![sample](<sample.png>)

## License

MIT
