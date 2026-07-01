import {
  deserializeDocument,
  serializeDocument,
  type MarkittyDocument,
} from './documentModel';

const DRAFT_STORAGE_KEY = 'markitty.lastDraft';
const WORKSPACE_DRAFT_STORAGE_KEY = 'markitty.workspaceDraft';

export type WorkspaceDraft = {
  documents: MarkittyDocument[];
  activeDocumentId: string;
};

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

export function saveDraft(document: MarkittyDocument) {
  getStorage()?.setItem(DRAFT_STORAGE_KEY, serializeDocument(document));
}

export function loadDraft(): MarkittyDocument | null {
  const value = getStorage()?.getItem(DRAFT_STORAGE_KEY);
  return value ? deserializeDocument(value) : null;
}

export function clearDraft() {
  getStorage()?.removeItem(DRAFT_STORAGE_KEY);
  getStorage()?.removeItem(WORKSPACE_DRAFT_STORAGE_KEY);
}

export const draftStorageKey = DRAFT_STORAGE_KEY;

function isWorkspaceDraft(value: unknown): value is WorkspaceDraft {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const draft = value as Partial<WorkspaceDraft>;
  return (
    Array.isArray(draft.documents) &&
    draft.documents.length > 0 &&
    draft.documents.every((document) => deserializeDocument(JSON.stringify(document))) &&
    typeof draft.activeDocumentId === 'string'
  );
}

export function saveWorkspaceDraft(draft: WorkspaceDraft) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(WORKSPACE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  const activeDocument =
    draft.documents.find((document) => document.id === draft.activeDocumentId) ??
    draft.documents[0];
  saveDraft(activeDocument);
}

export function loadWorkspaceDraft(): WorkspaceDraft | null {
  const value = getStorage()?.getItem(WORKSPACE_DRAFT_STORAGE_KEY);
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isWorkspaceDraft(parsed)) {
      return null;
    }

    const documents = parsed.documents
      .map((document) => deserializeDocument(JSON.stringify(document)))
      .filter((document): document is MarkittyDocument => Boolean(document));
    const activeDocumentId = documents.some(
      (document) => document.id === parsed.activeDocumentId,
    )
      ? parsed.activeDocumentId
      : documents[0].id;

    return { documents, activeDocumentId };
  } catch {
    return null;
  }
}

export const workspaceDraftStorageKey = WORKSPACE_DRAFT_STORAGE_KEY;
