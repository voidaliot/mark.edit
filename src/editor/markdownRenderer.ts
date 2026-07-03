import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';
import { convertFileSrc } from '@tauri-apps/api/core';
import { isTauriRuntime } from '../platform/platformCapabilities';

const markdownRenderer = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

type RenderMarkdownOptions = {
  documentPath?: string;
};

type MarkdownRenderEnv = {
  documentPath?: string;
};

function normalizePathSeparators(path: string) {
  return path.replace(/\\/g, '/');
}

function getDirectoryName(path: string) {
  const normalized = normalizePathSeparators(path);
  const separatorIndex = normalized.lastIndexOf('/');
  return separatorIndex === -1 ? '' : normalized.slice(0, separatorIndex);
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
    return decodedPath;
  }

  if (!documentPath) {
    return null;
  }

  const documentDirectory = getDirectoryName(documentPath);
  if (!documentDirectory) {
    return null;
  }

  return `${normalizePathSeparators(documentDirectory)}/${decodedPath}`;
}

function resolveTauriAssetUrl(url: string, documentPath?: string) {
  if (!isTauriRuntime() || !isResolvableMarkdownPath(url)) {
    return null;
  }

  const { path, suffix } = splitUrlSuffix(url);
  const resolvedPath = resolveLocalPath(path, documentPath);
  return resolvedPath ? `${convertFileSrc(resolvedPath)}${suffix}` : null;
}

function isLikelyAttachmentLink(url: string) {
  if (!isResolvableMarkdownPath(url)) {
    return false;
  }

  const { path } = splitUrlSuffix(url);
  return /\/?[^/]+\.[a-z0-9]{1,12}$/i.test(normalizePathSeparators(path));
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

  if (isLikelyAttachmentLink(href)) {
    token.attrJoin('class', 'attachment-link');
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
  const assetUrl = resolveTauriAssetUrl(src, renderEnv.documentPath);
  if (assetUrl) {
    token.attrSet('src', assetUrl);
  }
  token.attrSet('loading', 'lazy');

  return defaultImage(tokens, index, options, env, self);
};

export function renderMarkdown(content: string, options: RenderMarkdownOptions = {}) {
  const rendered = markdownRenderer.render(content, options);
  return DOMPurify.sanitize(rendered, {
    ADD_ATTR: ['download', 'loading'],
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto|tel|data|blob|asset):|[a-z]:[\\/]|[/.#?]|[^a-z]|[a-z0-9._~%+-]+(?:[/?#]|$))/i,
    USE_PROFILES: { html: true },
  });
}
