import type { OpenedMarkdownFile } from '../platform/tauriCommands';

export interface MarkittyDocument {
  id: string;
  title: string;
  path?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isDirty: boolean;
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function inferTitle(content: string, fallback = 'Untitled.md') {
  const heading = content
    .split('\n')
    .map((line) => line.trim())
    .find((line) => /^#\s+/.test(line));

  if (!heading) {
    return fallback;
  }

  return `${heading.replace(/^#\s+/, '').trim() || 'Untitled'}.md`;
}

export function createNewDocument(content = ''): MarkittyDocument {
  const timestamp = new Date().toISOString();

  return {
    id: createId(),
    title: inferTitle(content),
    content,
    createdAt: timestamp,
    updatedAt: timestamp,
    isDirty: false,
  };
}

export function documentFromFile(file: OpenedMarkdownFile): MarkittyDocument {
  const timestamp = new Date().toISOString();

  return {
    id: createId(),
    title: file.title,
    path: file.path,
    content: file.content,
    createdAt: timestamp,
    updatedAt: timestamp,
    isDirty: false,
  };
}

export function updateDocumentContent(
  document: MarkittyDocument,
  content: string,
): MarkittyDocument {
  return {
    ...document,
    title: document.path ? document.title : inferTitle(content, document.title),
    content,
    updatedAt: new Date().toISOString(),
    isDirty: content !== document.content || document.isDirty,
  };
}

export function serializeDocument(document: MarkittyDocument) {
  return JSON.stringify(document);
}

export function deserializeDocument(value: string): MarkittyDocument | null {
  try {
    const parsed = JSON.parse(value) as Partial<MarkittyDocument>;
    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.title !== 'string' ||
      typeof parsed.content !== 'string' ||
      typeof parsed.createdAt !== 'string' ||
      typeof parsed.updatedAt !== 'string' ||
      typeof parsed.isDirty !== 'boolean'
    ) {
      return null;
    }

    return {
      id: parsed.id,
      title: parsed.title,
      path: typeof parsed.path === 'string' ? parsed.path : undefined,
      content: parsed.content,
      createdAt: parsed.createdAt,
      updatedAt: parsed.updatedAt,
      isDirty: parsed.isDirty,
    };
  } catch {
    return null;
  }
}
