import { describe, expect, it } from 'vitest';
import { normalizeEditorMode } from '../src/editor/editorTypes';

describe('editor mode transitions', () => {
  it('keeps split mode on wide layouts', () => {
    expect(normalizeEditorMode('split', true)).toBe('split');
  });

  it('falls back to edit mode when split is unavailable', () => {
    expect(normalizeEditorMode('split', false)).toBe('edit');
  });

  it('keeps explicit edit and preview modes on narrow layouts', () => {
    expect(normalizeEditorMode('edit', false)).toBe('edit');
    expect(normalizeEditorMode('preview', false)).toBe('preview');
  });
});
