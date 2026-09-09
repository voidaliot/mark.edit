import { describe, expect, it } from 'vitest';
import {
  createNewDocument,
  deserializeDocument,
  documentFromFile,
  markDocumentSaved,
  serializeDocument,
  updateDocumentContent,
} from '../src/storage/documentModel';

describe('document model', () => {
  it('creates a markdown document with ISO dates', () => {
    const document = createNewDocument('# Notes');
    expect(document.title).toBe('Notes.md');
    expect(document.content).toBe('# Notes');
    expect(new Date(document.createdAt).toISOString()).toBe(document.createdAt);
    expect(document.isDirty).toBe(false);
  });

  it('creates a document from an opened file', () => {
    const document = documentFromFile({
      title: 'scratch.md',
      path: 'C:/notes/scratch.md',
      content: 'hello',
    });

    expect(document.title).toBe('scratch.md');
    expect(document.path).toBe('C:/notes/scratch.md');
    expect(document.isDirty).toBe(false);
  });

  it('serializes and deserializes documents', () => {
    const document = createNewDocument('hello');
    expect(deserializeDocument(serializeDocument(document))).toEqual(document);
    expect(deserializeDocument('not-json')).toBeNull();
  });

  it('keeps edits made during an asynchronous save marked as unsaved', () => {
    const snapshot = createNewDocument('Saved text');
    const current = updateDocumentContent(snapshot, 'Saved text with a newer edit');
    const result = markDocumentSaved(current, snapshot, { path: 'C:/notes/saved.md', title: 'saved.md' });
    expect(result.content).toBe('Saved text with a newer edit');
    expect(result.path).toBe('C:/notes/saved.md');
    expect(result.isDirty).toBe(true);
    expect(markDocumentSaved(current, current, {}).isDirty).toBe(false);
  });
});
