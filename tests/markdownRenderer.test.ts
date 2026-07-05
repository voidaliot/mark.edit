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

  it('normalizes parent segments in relative image paths before using the Tauri asset protocol', () => {
    vi.stubGlobal('isTauri', true);
    mockConvertFileSrc('windows');

    const html = renderMarkdown('![cat](<../images/./cat.png>)', {
      documentPath: 'C:/docs/project/note.md',
    });

    expect(html).toContain('src="http://asset.localhost/C%3A%2Fdocs%2Fimages%2Fcat.png"');
  });

  it('resolves relative HTML image paths through the Tauri asset protocol', () => {
    vi.stubGlobal('isTauri', true);
    mockConvertFileSrc('windows');

    const html = renderMarkdown('<p align="center"><img src="images/cat pic.png" alt="cat"></p>', {
      documentPath: 'C:/docs/note.md',
    });

    expect(html).toContain('src="http://asset.localhost/C%3A%2Fdocs%2Fimages%2Fcat%20pic.png"');
    expect(html).toContain('alt="cat"');
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

  it('resolves relative HTML attachment links through the Tauri asset protocol', () => {
    vi.stubGlobal('isTauri', true);
    mockConvertFileSrc('windows');

    const html = renderMarkdown('<a href="files/report final.pdf">report</a>', {
      documentPath: 'C:/docs/note.md',
    });

    expect(html).toContain('href="http://asset.localhost/C%3A%2Fdocs%2Ffiles%2Freport%20final.pdf"');
    expect(html).toContain('class="attachment-link"');
  });

  it('renders sanitized HTML blocks embedded in Markdown', () => {
    const html = renderMarkdown(`<h1 align="center">SysML v2 for Visual Studio Code</h1>

<p align="center">
  <strong>A complete modeling environment for SysML v2 and KerML</strong>
</p>

---

<h3 align="center">Under Development</h3>`);

    expect(html).toContain('<h1 align="center">SysML v2 for Visual Studio Code</h1>');
    expect(html).toContain('<p align="center">');
    expect(html).toContain('<strong>A complete modeling environment for SysML v2 and KerML</strong>');
    expect(html).toContain('<hr>');
    expect(html).toContain('<h3 align="center">Under Development</h3>');
  });

  it('removes unsafe content from embedded HTML', () => {
    const html = renderMarkdown(`<script>alert("nope")</script>
<img src="cat.png" onerror="alert('nope')" loading="eager">
<a href="javascript:alert('nope')" onclick="alert('nope')">bad link</a>`);

    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('<img src="cat.png" loading="eager">');
    expect(html).toContain('<a>bad link</a>');
  });
});
