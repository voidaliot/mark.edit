import { describe, expect, it } from 'vitest';
import {
  createNewDocument,
  deserializeDocument,
  documentFromFile,
  serializeDocument,
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
});
