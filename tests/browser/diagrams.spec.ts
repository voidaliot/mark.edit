import { expect, test, type Page } from '@playwright/test';
import { Buffer } from 'node:buffer';

async function openDocument(page: Page, content: string) {
  await page.addInitScript((content) => {
    localStorage.clear();
    localStorage.setItem('markitty.lastDraft', JSON.stringify({
      id: 'diagrams', title: 'diagrams.md', content,
      createdAt: '2026-09-05T12:00:00.000Z', updatedAt: '2026-09-05T12:00:00.000Z', isDirty: false,
    }));
  }, content);
  await page.goto('/');
  await page.getByRole('button', { name: 'Preview mode', exact: true }).click();
}

async function expectDiagrams(page: Page, count: number) {
  await expect(page.locator('.diagram')).toHaveCount(count);
  for (const diagram of await page.locator('.diagram').all()) {
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram.locator('img')).toBeVisible();
    await expect.poll(() => diagram.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    await expect(diagram.getByRole('alert')).toHaveCount(0);
  }
}

test('both local engines render production assets, labels and icons without network access', async ({ page }, testInfo) => {
  const external: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:4175/')) external.push(request.url());
  });
  await openDocument(page, '# Diagrams\n\nRendered entirely on this device.\n\n```mermaid\nflowchart LR\nA["Line one<br>Line two #dagger; #nbsp;"] --> B["<b>Done</b>"]\n```\n\n> ~~~puml\n> Alice -> Bob: Hello\n> Bob --> Alice: Hi!\n> ~~~\n\n```plantuml\n@startuml\nclass Editor\nclass Preview\nEditor --> Preview\n@enduml\n@startuml\nrectangle "<&heart> Local icons"\n@enduml\n```\n\nText after.');
  await expectDiagrams(page, 4);
  await expect(page.getByRole('heading', { name: 'Diagrams', exact: true })).toBeVisible();
  await expect(page.getByText('Text after.', { exact: true })).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);

  const first = page.locator('.diagram').first();
  await first.scrollIntoViewIfNeeded();
  await first.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(first.locator('.diagram-zoom')).not.toHaveText('Fit');
  await first.getByRole('button', { name: 'Fit', exact: true }).click();
  await expect(first.locator('.diagram-zoom')).toHaveText('Fit');
  await first.getByText('Source', { exact: true }).click();
  await expect(first.locator('.diagram-source')).toContainText('Line one');
  const pending = page.waitForEvent('download');
  await first.getByRole('button', { name: 'Export SVG', exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('diagrams-1.svg');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const svg = Buffer.concat(chunks).toString('utf8');
  const exported = await page.evaluate((svg) => {
    const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
    return { error: !!parsed.querySelector('parsererror'), text: parsed.documentElement.textContent, breaks: parsed.querySelectorAll('br').length };
  }, svg);
  expect(exported.error).toBe(false);
  expect(exported.text).toContain('Line oneLine two †');
  expect(exported.breaks).toBeGreaterThan(0);
  await first.getByText('Source', { exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('diagrams-light.png') });
  await page.getByRole('button', { name: /dark theme/i }).click();
  await page.screenshot({ path: testInfo.outputPath('diagrams-dark.png') });
});

test('syntax errors and offline limitations stay inline while later diagrams render', async ({ page }) => {
  await openDocument(page, '# Errors\n\n```mermaid\nthis is not mermaid\n```\n\n```plantuml\n@startuml\nAlice -??? Bob\n@enduml\n```\n\n```plantuml\n!include https://example.com/tracker\n```\n\n```plantuml\n@startsalt\n{ [Button] }\n@endsalt\n```\n\n```mermaid\nflowchart LR\nA-->B\n```\n\nStill readable.');
  for (let index = 0; index < 4; index++) {
    const diagram = page.locator('.diagram').nth(index);
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram.getByRole('alert')).toBeVisible();
    await expect(diagram.locator('img')).toHaveCount(0);
    await expect(diagram.locator('details')).toHaveAttribute('open', '');
  }
  await expect(page.locator('.diagram').nth(2)).toContainText('unavailable offline');
  await expect(page.locator('.diagram').nth(3)).toContainText('not supported');
  await page.locator('.diagram').last().scrollIntoViewIfNeeded();
  await expect(page.locator('.diagram').last().locator('img')).toBeVisible();
  await expect(page.getByText('Still readable.', { exact: true })).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('editing, tab changes and preview toggles discard old renderer results', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openDocument(page, '```plantuml\nAlice -> Bob: Original\n```');
  await page.getByRole('button', { name: 'Edit mode', exact: true }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
  const editor = page.locator('.cm-content');
  await editor.fill('```mermaid\nflowchart LR\nNew-->Preview\n```');
  await page.getByRole('button', { name: 'Preview mode', exact: true }).click();
  await expectDiagrams(page, 1);
  await expect(page.locator('.diagram-toolbar')).toContainText('Mermaid');
  await page.getByRole('button', { name: 'New tab', exact: true }).click();
  await expect(page.locator('.diagram')).toHaveCount(0);
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.locator('.tab-activate').filter({ hasText: 'diagrams.md' }).click();
  await page.getByRole('button', { name: 'Preview mode', exact: true }).click();
  await expectDiagrams(page, 1);
  expect(errors).toEqual([]);
});

test('untrusted diagram labels and raw HTML cannot run scripts or forge controls', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => { if (request.url().includes('example.com')) external.push(request.url()); });
  await openDocument(page, '<div data-markitty-diagram="0"><script>window.pwned = true</script></div>\n\n```mermaid\nflowchart LR\nA["<img src=https://example.com/tracker onerror=window.pwned=true>"] --> B[Safe]\nclick B "javascript:window.pwned=true"\n```\n\n```plantuml\n!include https://example.com/tracker\n```');
  await expect(page.locator('.diagram')).toHaveCount(2);
  await page.locator('.diagram').last().scrollIntoViewIfNeeded();
  await expect(page.locator('.diagram').last().getByRole('alert')).toContainText('unavailable offline');
  expect(await page.evaluate(() => 'pwned' in window)).toBe(false);
  expect(external).toEqual([]);
  await expect(page.locator('.markdown-content script')).toHaveCount(0);
});
