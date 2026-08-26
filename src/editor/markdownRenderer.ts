import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';
import { convertFileSrc } from '@tauri-apps/api/core';
import { isTauriRuntime } from '../platform/platformCapabilities';

const markdownRenderer = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

type RenderMarkdownOptions = {
  documentPath?: string;
};

type MarkdownRenderEnv = {
  documentPath?: string;
  localPathCollector?: (path: string) => void;
};

function normalizePathSeparators(path: string) {
  return path.replace(/\\/g, '/');
}

function getDirectoryName(path: string) {
  const normalized = normalizePathSeparators(path);
  const separatorIndex = normalized.lastIndexOf('/');
  return separatorIndex === -1 ? '' : normalized.slice(0, separatorIndex);
}

function splitPathRoot(path: string) {
  const normalized = normalizePathSeparators(path);
  const windowsRoot = normalized.match(/^[A-Za-z]:\//);
  if (windowsRoot) {
    return {
      root: windowsRoot[0],
      rest: normalized.slice(windowsRoot[0].length),
    };
  }

  const uncRoot = normalized.match(/^\/\/[^/]+\/[^/]+\/?/);
  if (uncRoot) {
    return {
      root: uncRoot[0].endsWith('/') ? uncRoot[0] : `${uncRoot[0]}/`,
      rest: normalized.slice(uncRoot[0].length),
    };
  }

  if (normalized.startsWith('/')) {
    return { root: '/', rest: normalized.slice(1) };
  }

  return { root: '', rest: normalized };
}

function normalizeLocalPath(path: string) {
  const { root, rest } = splitPathRoot(path);
  const segments: string[] = [];

  for (const segment of rest.split('/')) {
    if (!segment || segment === '.') {
      continue;
    }

    if (segment === '..') {
      const lastSegment = segments.at(-1);
      if (lastSegment && lastSegment !== '..') {
        segments.pop();
      } else if (!root) {
        segments.push(segment);
      }
      continue;
    }

    segments.push(segment);
  }

  return root ? `${root}${segments.join('/')}` : segments.join('/');
}

function hasUrlProtocol(url: string) {
  return /^[a-z][a-z\d+.-]*:/i.test(url);
}

function isWindowsAbsolutePath(path: string) {
  return /^[a-z]:[\\/]/i.test(path);
}

function isLocalAbsolutePath(path: string) {
  return isWindowsAbsolutePath(path) || path.startsWith('/') || path.startsWith('\\\\');
}

function isResolvableMarkdownPath(path: string) {
  return (
    Boolean(path) &&
    !path.startsWith('#') &&
    !path.startsWith('//') &&
    (!hasUrlProtocol(path) || isWindowsAbsolutePath(path))
  );
}

function decodeMarkdownUrl(url: string) {
  try {
    return decodeURI(url);
  } catch {
    return url;
  }
}

function splitUrlSuffix(url: string) {
  const suffixIndex = url.search(/[?#]/);
  if (suffixIndex === -1) {
    return { path: url, suffix: '' };
  }

  return {
    path: url.slice(0, suffixIndex),
    suffix: url.slice(suffixIndex),
  };
}

function resolveLocalPath(path: string, documentPath?: string) {
  const decodedPath = normalizePathSeparators(decodeMarkdownUrl(path));
  if (isLocalAbsolutePath(decodedPath)) {
    return normalizeLocalPath(decodedPath);
  }

  if (!documentPath) {
    return null;
  }

  const documentDirectory = getDirectoryName(documentPath);
  if (!documentDirectory) {
    return null;
  }

  return normalizeLocalPath(`${normalizePathSeparators(documentDirectory)}/${decodedPath}`);
}

function resolveLocalResourcePath(url: string, documentPath?: string) {
  if (!isResolvableMarkdownPath(url)) {
    return null;
  }

  const { path } = splitUrlSuffix(url);
  return resolveLocalPath(path, documentPath);
}

function resolveTauriAssetUrl(url: string, documentPath?: string) {
  if (!isTauriRuntime()) {
    return null;
  }

  const { suffix } = splitUrlSuffix(url);
  const resolvedPath = resolveLocalResourcePath(url, documentPath);
  return resolvedPath ? `${convertFileSrc(resolvedPath)}${suffix}` : null;
}

function collectLocalResourcePath(
  url: string,
  documentPath: string | undefined,
  collector: ((path: string) => void) | undefined,
) {
  if (!collector) {
    return;
  }

  const resolvedPath = resolveLocalResourcePath(url, documentPath);
  if (resolvedPath) {
    collector(resolvedPath);
  }
}

function isOpenableTextDocumentLink(url: string) {
  if (!isResolvableMarkdownPath(url)) {
    return false;
  }

  const { path } = splitUrlSuffix(url);
  return /\.(md|markdown|txt|text)$/i.test(normalizePathSeparators(path));
}

export function resolveMarkdownResourcePath(url: string, documentPath?: string) {
  return resolveLocalResourcePath(url, documentPath);
}

export function collectMarkdownResourcePaths(
  content: string,
  options: RenderMarkdownOptions = {},
) {
  const paths = new Set<string>();
  const collector = (path: string) => paths.add(path);
  const rendered = markdownRenderer.render(content, {
    ...options,
    localPathCollector: collector,
  } satisfies MarkdownRenderEnv);
  prepareRenderedHtml(rendered, options.documentPath, collector);
  return [...paths];
}

function isLikelyAttachmentLink(url: string) {
  if (!isResolvableMarkdownPath(url)) {
    return false;
  }

  const { path } = splitUrlSuffix(url);
  return /\/?[^/]+\.[a-z0-9]{1,12}$/i.test(normalizePathSeparators(path));
}

function prepareRenderedHtml(
  rendered: string,
  documentPath?: string,
  localPathCollector?: (path: string) => void,
) {
  if (typeof document === 'undefined') {
    return rendered;
  }

  const template = document.createElement('template');
  template.innerHTML = rendered;

  for (const image of template.content.querySelectorAll<HTMLImageElement>('img[src]')) {
    const src = image.getAttribute('src') ?? '';
    collectLocalResourcePath(src, documentPath, localPathCollector);
    const assetUrl = resolveTauriAssetUrl(src, documentPath);
    if (assetUrl) {
      image.setAttribute('src', assetUrl);
    }

    if (!image.hasAttribute('loading')) {
      image.setAttribute('loading', 'lazy');
    }
  }

  for (const link of template.content.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const href = link.getAttribute('href') ?? '';
    if (/^https?:\/\//i.test(href)) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }

    if (isOpenableTextDocumentLink(href)) {
      const resolvedPath = resolveLocalResourcePath(href, documentPath);
      if (resolvedPath) {
        link.classList.add('document-link');
        link.setAttribute('data-markitty-open-path', resolvedPath);
      }
      continue;
    }

    if (isLikelyAttachmentLink(href)) {
      link.classList.add('attachment-link');
      collectLocalResourcePath(href, documentPath, localPathCollector);
      const assetUrl = resolveTauriAssetUrl(href, documentPath);
      if (assetUrl) {
        link.setAttribute('href', assetUrl);
      }
    }
  }

  return template.innerHTML;
}

const defaultLinkOpen =
  markdownRenderer.renderer.rules.link_open ??
  ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));

markdownRenderer.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const token = tokens[index];
  const renderEnv = env as MarkdownRenderEnv;
  const href = token.attrGet('href') ?? '';
  if (/^https?:\/\//i.test(href)) {
    token.attrSet('target', '_blank');
    token.attrSet('rel', 'noopener noreferrer');
  }

  if (isOpenableTextDocumentLink(href)) {
    const resolvedPath = resolveLocalResourcePath(href, renderEnv.documentPath);
    if (resolvedPath) {
      token.attrJoin('class', 'document-link');
      token.attrSet('data-markitty-open-path', resolvedPath);
    }
    return defaultLinkOpen(tokens, index, options, env, self);
  }

  if (isLikelyAttachmentLink(href)) {
    token.attrJoin('class', 'attachment-link');
    collectLocalResourcePath(href, renderEnv.documentPath, renderEnv.localPathCollector);
    const assetUrl = resolveTauriAssetUrl(href, renderEnv.documentPath);
    if (assetUrl) {
      token.attrSet('href', assetUrl);
    }
  }

  return defaultLinkOpen(tokens, index, options, env, self);
};

const defaultImage =
  markdownRenderer.renderer.rules.image ??
  ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));

markdownRenderer.renderer.rules.image = (tokens, index, options, env, self) => {
  const token = tokens[index];
  const renderEnv = env as MarkdownRenderEnv;
  const src = token.attrGet('src') ?? '';
  collectLocalResourcePath(src, renderEnv.documentPath, renderEnv.localPathCollector);
  const assetUrl = resolveTauriAssetUrl(src, renderEnv.documentPath);
  if (assetUrl) {
    token.attrSet('src', assetUrl);
  }
  token.attrSet('loading', 'lazy');

  return defaultImage(tokens, index, options, env, self);
};

export function renderMarkdown(content: string, options: RenderMarkdownOptions = {}) {
  const rendered = markdownRenderer.render(content, options);
  const prepared = prepareRenderedHtml(rendered, options.documentPath);
  return DOMPurify.sanitize(prepared, {
    ADD_ATTR: ['data-markitty-open-path', 'download', 'loading'],
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto|tel|data|blob|asset):|[a-z]:[\\/]|[/.#?]|[^a-z]|[a-z0-9._~%+-]+(?:[/?#]|$))/i,
    USE_PROFILES: { html: true },
  });
}
