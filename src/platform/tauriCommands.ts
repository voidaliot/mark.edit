import { isTauriRuntime } from './platformCapabilities';

export type OpenedMarkdownFile = {
  title: string;
  content: string;
  path?: string;
};

export type SavedMarkdownFile = {
  path?: string;
  title?: string;
};

function titleFromPath(path: string) {
  return path.split(/[\\/]/).pop() || 'Untitled.md';
}

function ensureMarkdownExtension(title: string) {
  return /\.(md|markdown)$/i.test(title) ? title : `${title}.md`;
}

function downloadMarkdown(content: string, title: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = ensureMarkdownExtension(title);
  anchor.click();
  URL.revokeObjectURL(url);
}

function openWithBrowserPicker(): Promise<OpenedMarkdownFile | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,text/markdown,text/plain';

    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      try {
        resolve({
          title: file.name,
          content: await file.text(),
        });
      } catch (error) {
        reject(error);
      }
    });

    input.click();
  });
}

export async function openMarkdownFile(): Promise<OpenedMarkdownFile | null> {
  if (!isTauriRuntime()) {
    return openWithBrowserPicker();
  }

  const [{ open }, { readTextFile }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ]);
  const selected = await open({
    multiple: false,
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
  });

  if (!selected || Array.isArray(selected)) {
    return null;
  }

  return {
    path: selected,
    title: titleFromPath(selected),
    content: await readTextFile(selected),
  };
}

export async function saveMarkdownFile(
  path: string | undefined,
  content: string,
  title: string,
): Promise<SavedMarkdownFile | null> {
  if (!isTauriRuntime()) {
    downloadMarkdown(content, title);
    return { title: ensureMarkdownExtension(title) };
  }

  if (!path) {
    return saveMarkdownFileAs(content, title);
  }

  const { writeTextFile } = await import('@tauri-apps/plugin-fs');
  await writeTextFile(path, content);
  return { path, title: titleFromPath(path) };
}

export async function saveMarkdownFileAs(
  content: string,
  title: string,
): Promise<SavedMarkdownFile | null> {
  if (!isTauriRuntime()) {
    downloadMarkdown(content, title);
    return { title: ensureMarkdownExtension(title) };
  }

  const [{ save }, { writeTextFile }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ]);
  const path = await save({
    defaultPath: ensureMarkdownExtension(title),
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
  });

  if (!path) {
    return null;
  }

  await writeTextFile(path, content);
  return { path, title: titleFromPath(path) };
}
