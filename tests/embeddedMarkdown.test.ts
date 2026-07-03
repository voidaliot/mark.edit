import { describe, expect, it } from 'vitest';
import { createEmbeddedMarkdown } from '../src/editor/embeddedMarkdown';

describe('createEmbeddedMarkdown', () => {
  it('creates portable image embeds relative to the current document', () => {
    const markdown = createEmbeddedMarkdown(
      [{ title: 'cat photo.png', path: 'C:\\notes\\images\\cat photo.png' }],
      'image',
      'C:\\notes\\draft.md',
    );

    expect(markdown).toBe('![cat photo](<images/cat photo.png>)');
  });

  it('creates attachment links relative to nested documents', () => {
    const markdown = createEmbeddedMarkdown(
      [{ title: 'report final.pdf', path: 'C:\\notes\\files\\report final.pdf' }],
      'file',
      'C:\\notes\\project\\draft.md',
    );

    expect(markdown).toBe('[report final.pdf](<../files/report final.pdf>)');
  });

  it('escapes Markdown label brackets', () => {
    const markdown = createEmbeddedMarkdown(
      [{ title: 'diagram [v1].png', path: 'diagram [v1].png' }],
      'image',
    );

    expect(markdown).toBe('![diagram \\[v1\\]](<diagram [v1].png>)');
  });
});
