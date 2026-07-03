export type EmbeddedMarkdownKind = 'file' | 'image';

export type EmbeddedMarkdownFile = {
  title: string;
  path: string;
};

const imageExtensionPattern = /\.(avif|bmp|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i;

function normalizePathSeparators(path: string) {
  return path.replace(/\\/g, '/');
}

function stripUrlSuffix(path: string) {
  const suffixIndex = path.search(/[?#]/);
  return suffixIndex === -1 ? path : path.slice(0, suffixIndex);
}

export function getFileNameFromPath(path: string) {
  const normalized = normalizePathSeparators(stripUrlSuffix(path));
  return normalized.split('/').filter(Boolean).pop() ?? path;
}

export function isImagePath(path: string) {
  return imageExtensionPattern.test(path);
}

function labelFromImageTitle(title: string) {
  const name = getFileNameFromPath(title);
  const extensionIndex = name.lastIndexOf('.');
  return extensionIndex > 0 ? name.slice(0, extensionIndex) : name;
}

function escapeMarkdownLabel(label: string) {
  return label.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

function escapeMarkdownDestination(destination: string) {
  return `<${normalizePathSeparators(destination)
    .replace(/[\r\n]/g, ' ')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')}>`;
}

function splitPathRoot(path: string) {
  const normalized = normalizePathSeparators(path);
  const windowsRoot = normalized.match(/^[A-Za-z]:\//);
  if (windowsRoot) {
    return {
      root: windowsRoot[0].toUpperCase(),
      rest: normalized.slice(windowsRoot[0].length),
    };
  }

  const uncRoot = normalized.match(/^\/\/[^/]+\/[^/]+\//);
  if (uncRoot) {
    return {
      root: uncRoot[0].toLowerCase(),
      rest: normalized.slice(uncRoot[0].length),
    };
  }

  if (normalized.startsWith('/')) {
    return { root: '/', rest: normalized.slice(1) };
  }

  return { root: '', rest: normalized };
}

function getDirectoryName(path: string) {
  const normalized = normalizePathSeparators(path);
  const separatorIndex = normalized.lastIndexOf('/');
  return separatorIndex === -1 ? '' : normalized.slice(0, separatorIndex);
}

function relativePath(fromDirectory: string, toPath: string) {
  const from = splitPathRoot(fromDirectory);
  const to = splitPathRoot(toPath);
  if (from.root !== to.root) {
    return normalizePathSeparators(toPath);
  }

  const fromSegments = from.rest.split('/').filter(Boolean);
  const toSegments = to.rest.split('/').filter(Boolean);
  let commonSegments = 0;

  while (
    commonSegments < fromSegments.length &&
    commonSegments < toSegments.length &&
    fromSegments[commonSegments].toLowerCase() === toSegments[commonSegments].toLowerCase()
  ) {
    commonSegments += 1;
  }

  const parentSegments = fromSegments.slice(commonSegments).map(() => '..');
  const childSegments = toSegments.slice(commonSegments);
  return [...parentSegments, ...childSegments].join('/') || getFileNameFromPath(toPath);
}

function destinationForDocument(filePath: string, documentPath?: string) {
  const normalizedFilePath = normalizePathSeparators(filePath);
  if (!documentPath) {
    return normalizedFilePath;
  }

  const documentDirectory = getDirectoryName(documentPath);
  if (!documentDirectory) {
    return normalizedFilePath;
  }

  return relativePath(documentDirectory, normalizedFilePath);
}

function createEmbeddedLine(
  file: EmbeddedMarkdownFile,
  kind: EmbeddedMarkdownKind,
  documentPath?: string,
) {
  const destination = escapeMarkdownDestination(destinationForDocument(file.path, documentPath));
  if (kind === 'image') {
    return `![${escapeMarkdownLabel(labelFromImageTitle(file.title))}](${destination})`;
  }

  return `[${escapeMarkdownLabel(getFileNameFromPath(file.title))}](${destination})`;
}

export function createEmbeddedMarkdown(
  files: EmbeddedMarkdownFile[],
  kind: EmbeddedMarkdownKind,
  documentPath?: string,
) {
  return files.map((file) => createEmbeddedLine(file, kind, documentPath)).join('\n');
}
