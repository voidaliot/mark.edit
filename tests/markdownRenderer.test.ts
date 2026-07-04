import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearMocks, mockConvertFileSrc } from '@tauri-apps/api/mocks';
import { renderMarkdown } from '../src/editor/markdownRenderer';

describe('renderMarkdown', () => {
  afterEach(() => {
    clearMocks();
    vi.unstubAllGlobals();
  });

  it('marks local file links as attachments', () => {
    const html = renderMarkdown('[report](<files/report.pdf>)');

    expect(html).toContain('href="files/report.pdf"');
    expect(html).toContain('class="attachment-link"');
  });

  it('resolves relative image paths through the Tauri asset protocol', () => {
    vi.stubGlobal('isTauri', true);
    mockConvertFileSrc('windows');

    const html = renderMarkdown('![cat](<images/cat pic.png>)', {
      documentPath: 'C:/docs/note.md',
    });

    expect(html).toContain('src="http://asset.localhost/C%3A%2Fdocs%2Fimages%2Fcat%20pic.png"');
    expect(html).toContain('loading="lazy"');
  });

  it('resolves relative attachment links through the Tauri asset protocol', () => {
    vi.stubGlobal('isTauri', true);
    mockConvertFileSrc('windows');

    const html = renderMarkdown('[report](<files/report final.pdf>)', {
      documentPath: 'C:/docs/note.md',
    });

    expect(html).toContain('href="http://asset.localhost/C%3A%2Fdocs%2Ffiles%2Freport%20final.pdf"');
    expect(html).toContain('class="attachment-link"');
  });
});
