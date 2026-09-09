import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNewDocument } from '../src/storage/documentModel';
import {
  clearDraft,
  draftStorageKey,
  loadDraft,
  loadWorkspaceDraft,
  saveDraft,
  saveWorkspaceDraft,
  workspaceDraftStorageKey,
} from '../src/storage/draftStorage';

describe('draft storage', () => {
  afterEach(() => vi.restoreAllMocks());
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves and loads the latest draft', () => {
    const document = createNewDocument('draft text');
    saveDraft(document);

    expect(window.localStorage.getItem(draftStorageKey)).toContain('draft text');
    expect(loadDraft()).toEqual(document);
  });

  it('clears drafts', () => {
    saveDraft(createNewDocument('draft text'));
    clearDraft();

    expect(loadDraft()).toBeNull();
  });

  it('saves and loads tab workspace drafts', () => {
    const firstDocument = createNewDocument('# One');
    const secondDocument = createNewDocument('# Two');
    saveWorkspaceDraft({
      documents: [firstDocument, secondDocument],
      activeDocumentId: secondDocument.id,
    });

    expect(window.localStorage.getItem(workspaceDraftStorageKey)).toContain(secondDocument.id);
    expect(loadWorkspaceDraft()).toEqual({
      documents: [firstDocument, secondDocument],
      activeDocumentId: secondDocument.id,
    });
    expect(loadDraft()).toEqual(secondDocument);
  });

  it('reports a quota failure without overwriting the previous recovery data', () => {
    const original = createNewDocument('Recovered text');
    const workspace = { documents: [original], activeDocumentId: original.id };
    expect(saveWorkspaceDraft(workspace)).toBe(true);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage full', 'QuotaExceededError');
    });
    expect(saveWorkspaceDraft({ ...workspace, documents: [{ ...original, content: 'New text' }] })).toBe(false);
    expect(loadWorkspaceDraft()).toEqual(workspace);
  });

  it('opens safely when storage is denied and rejects duplicate tab identities', () => {
    const original = createNewDocument('Recovered text');
    localStorage.setItem(workspaceDraftStorageKey, JSON.stringify({ documents: [original, original], activeDocumentId: original.id }));
    expect(loadWorkspaceDraft()).toBeNull();
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Storage denied', 'SecurityError');
    });
    expect(loadWorkspaceDraft()).toBeNull();
    expect(loadDraft()).toBeNull();
    expect(saveWorkspaceDraft({ documents: [original], activeDocumentId: original.id })).toBe(false);
  });
});
