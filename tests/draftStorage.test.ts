import { beforeEach, describe, expect, it } from 'vitest';
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
});
