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

export type EmbeddedFileKind = 'file' | 'image';

export type PickedEmbeddedFile = {
  title: string;
  path: string;
  type?: string;
};

const imageExtensions = ['avif', 'bmp', 'gif', 'jpg', 'jpeg', 'png', 'svg', 'webp'];

function titleFromPath(path: string) {
  return path.split(/[\\/]/).pop() || 'Untitled.md';
}

function isMarkdownTitle(title: string) {
  return /\.(md|markdown)$/i.test(title);
}

function isImageTitle(title: string) {
  return new RegExp(`\\.(${imageExtensions.join('|')})$`, 'i').test(title);
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

function fileToOpenedMarkdown(file: File): Promise<OpenedMarkdownFile | null> {
  if (!isMarkdownTitle(file.name)) {
    return Promise.resolve(null);
  }

  return file.text().then((content) => ({
    title: file.name,
    content,
  }));
}

function openWithBrowserPicker(): Promise<OpenedMarkdownFile[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.md,.markdown,text/markdown,text/plain';

    input.addEventListener('change', async () => {
      const files = input.files;
      if (!files?.length) {
        resolve([]);
        return;
      }

      try {
        resolve(await openMarkdownFilesFromBrowserFiles(files));
      } catch (error) {
        reject(error);
      }
    });

    input.click();
  });
}

function pickBrowserFilesForEmbedding(kind: EmbeddedFileKind): Promise<PickedEmbeddedFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    if (kind === 'image') {
      input.accept = imageExtensions.map((extension) => `.${extension}`).join(',');
    }

    input.addEventListener('change', () => {
      const files = input.files;
      resolve(files ? embeddedFilesFromBrowserFiles(files, kind) : []);
    });

    input.click();
  });
}

function embeddedFilesFromPaths(
  paths: string[],
  kind: EmbeddedFileKind,
  skipMarkdown: boolean,
): PickedEmbeddedFile[] {
  return paths
    .filter((path) => !skipMarkdown || !isMarkdownTitle(path))
    .filter((path) => kind === 'file' || isImageTitle(path))
    .map((path) => ({
      title: titleFromPath(path),
      path,
    }));
}

export async function openMarkdownFile(): Promise<OpenedMarkdownFile | null> {
  const files = await openMarkdownFiles();
  return files[0] ?? null;
}

export async function openMarkdownFiles(): Promise<OpenedMarkdownFile[]> {
  if (!isTauriRuntime()) {
    return openWithBrowserPicker();
  }

  const [{ open }, { readTextFile }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ]);
  const selected = await open({
    multiple: true,
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
  });

  if (!selected) {
    return [];
  }

  const paths = Array.isArray(selected) ? selected : [selected];
  return Promise.all(
    paths.filter(isMarkdownTitle).map(async (path) => ({
      path,
      title: titleFromPath(path),
      content: await readTextFile(path),
    })),
  );
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

export async function openMarkdownFilesFromBrowserFiles(
  files: FileList | File[],
): Promise<OpenedMarkdownFile[]> {
  const openedFiles = await Promise.all(Array.from(files).map(fileToOpenedMarkdown));
  return openedFiles.filter((file): file is OpenedMarkdownFile => Boolean(file));
}

export function embeddedFilesFromBrowserFiles(
  files: FileList | File[],
  kind: EmbeddedFileKind = 'file',
  skipMarkdown = false,
): PickedEmbeddedFile[] {
  return Array.from(files)
    .filter((file) => !skipMarkdown || !isMarkdownTitle(file.name))
    .filter((file) => kind === 'file' || file.type.startsWith('image/') || isImageTitle(file.name))
    .map((file) => ({
      title: file.name,
      path: file.name,
      type: file.type || undefined,
    }));
}

export async function pickEmbeddedFiles(kind: EmbeddedFileKind): Promise<PickedEmbeddedFile[]> {
  if (!isTauriRuntime()) {
    return pickBrowserFilesForEmbedding(kind);
  }

  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    multiple: true,
    ...(kind === 'image'
      ? { filters: [{ name: 'Images', extensions: imageExtensions }] }
      : {}),
  });

  if (!selected) {
    return [];
  }

  const paths = Array.isArray(selected) ? selected : [selected];
  return embeddedFilesFromPaths(paths, kind, false);
}

export async function openMarkdownFilesAtPaths(paths: string[]): Promise<OpenedMarkdownFile[]> {
  if (!isTauriRuntime()) {
    return [];
  }

  const { readTextFile } = await import('@tauri-apps/plugin-fs');
  return Promise.all(
    paths.filter(isMarkdownTitle).map(async (path) => ({
      path,
      title: titleFromPath(path),
      content: await readTextFile(path),
    })),
  );
}

export async function getInitialMarkdownOpenFiles(): Promise<OpenedMarkdownFile[]> {
  if (!isTauriRuntime()) {
    return [];
  }

  const { invoke } = await import('@tauri-apps/api/core');
  const paths = await invoke<string[]>('initial_open_paths');
  return openMarkdownFilesAtPaths(paths);
}

export async function listenForMarkdownOpenRequests(
  onOpen: (files: OpenedMarkdownFile[]) => void,
): Promise<() => void> {
  if (!isTauriRuntime()) {
    return () => undefined;
  }

  const [{ listen }, { getCurrentWindow }] = await Promise.all([
    import('@tauri-apps/api/event'),
    import('@tauri-apps/api/window'),
  ]);
  const unlistenOpen = await listen<string[]>('markitty://open-files', async (event) => {
    const files = await openMarkdownFilesAtPaths(event.payload);
    if (files.length > 0) {
      onOpen(files);
    }
  });
  const unlistenDrop = await getCurrentWindow().onDragDropEvent(async (event) => {
    if (event.payload.type !== 'drop') {
      return;
    }

    const files = await openMarkdownFilesAtPaths(event.payload.paths);
    if (files.length > 0) {
      onOpen(files);
    }
  });

  return () => {
    unlistenOpen();
    unlistenDrop();
  };
}

export async function listenForEmbeddedFileDropRequests(
  onDrop: (files: PickedEmbeddedFile[]) => void,
): Promise<() => void> {
  if (!isTauriRuntime()) {
    return () => undefined;
  }

  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const unlistenDrop = await getCurrentWindow().onDragDropEvent((event) => {
    if (event.payload.type !== 'drop') {
      return;
    }

    const files = embeddedFilesFromPaths(event.payload.paths, 'file', true);
    if (files.length > 0) {
      onDrop(files);
    }
  });

  return unlistenDrop;
}
