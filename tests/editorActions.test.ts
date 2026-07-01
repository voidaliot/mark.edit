import { describe, expect, it } from 'vitest';
import { applyEditorAction } from '../src/editor/editorActions';

describe('applyEditorAction', () => {
  it('wraps selected text with bold markdown', () => {
    const result = applyEditorAction('bold', 'hello cat', { start: 6, end: 9 });
    expect(result.content).toBe('hello **cat**');
  });

  it('inserts a useful italic placeholder when there is no selection', () => {
    const result = applyEditorAction('italic', '', { start: 0, end: 0 });
    expect(result.content).toBe('*italic text*');
    expect(result.selection).toEqual({ start: 1, end: 12 });
  });

  it('selects the URL placeholder when linking selected text', () => {
    const result = applyEditorAction('link', 'Markitty', { start: 0, end: 8 });
    expect(result.content).toBe('[Markitty](url)');
    expect(result.selection).toEqual({ start: 11, end: 14 });
  });

  it('prefixes selected lines for ordered lists', () => {
    const result = applyEditorAction('orderedList', 'alpha\nbeta', { start: 0, end: 10 });
    expect(result.content).toBe('1. alpha\n2. beta');
  });

  it('creates fenced code blocks', () => {
    const result = applyEditorAction('codeBlock', 'const a = 1;', { start: 0, end: 12 });
    expect(result.content).toBe('```text\nconst a = 1;\n```');
  });
});
