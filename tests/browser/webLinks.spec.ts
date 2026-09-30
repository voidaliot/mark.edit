import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('web links use the browser and leave the editor controls and edits intact', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('markitty.lastDraft', JSON.stringify({
      id: 'links', title: 'Links.md', content: '[Website](https://example.com/)\n\n<a href="https://example.com/raw">Raw link</a>',
      createdAt: '2026-09-05T12:00:00Z', updatedAt: '2026-09-05T12:00:00Z', isDirty: false,
    }));
  });
  await page.goto('/');
  await page.evaluate(() => {
    window.open = (url) => { document.body.dataset.openedUrl = String(url); return null; };
  });
  const editor = page.getByRole('textbox', { name: 'Markdown source' });
  await editor.press('Control+End');
  await editor.pressSequentially(' edited');
  await page.getByRole('link', { name: 'Website', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-opened-url', 'https://example.com/');
  await expect(page).toHaveURL('http://127.0.0.1:4175/');
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeVisible();
  await expect(editor).toContainText('edited');
  await page.getByRole('link', { name: 'Raw link', exact: true }).click({ button: 'middle' });
  await expect(page.locator('body')).toHaveAttribute('data-opened-url', 'https://example.com/raw');
  await expect(page.getByRole('tab')).toHaveCount(1);
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('remote pictures and video players load under the desktop content policy', async ({ page }) => {
  const config = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8'));
  await page.route('http://127.0.0.1:4175/', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': config.app.security.csp } });
  });
  await page.route('https://media.example.test/picture.svg', (route) => route.fulfill({
    contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="red"/></svg>',
  }));
  await page.route('https://www.youtube-nocookie.com/embed/test', (route) => route.fulfill({
    contentType: 'text/html', body: '<h1>Video player</h1>',
  }));
  const mediaRequests: string[] = [];
  await page.route('https://media.example.test/movie.mp4', (route) => {
    mediaRequests.push(route.request().url());
    return route.fulfill({ contentType: 'video/mp4', body: '' });
  });
  await page.addInitScript(() => {
    localStorage.setItem('markitty.lastDraft', JSON.stringify({
      id: 'media', title: 'Media.md',
      content: '![Web picture](https://media.example.test/picture.svg)\n\n<video controls preload="auto" src="https://media.example.test/movie.mp4"></video>\n\n<iframe src="https://www.youtube-nocookie.com/embed/test"></iframe>',
      createdAt: '2026-09-05T12:00:00Z', updatedAt: '2026-09-05T12:00:00Z', isDirty: false,
    }));
  });
  await page.goto('/');
  await expect.poll(() => page.getByRole('img', { name: 'Web picture' }).evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(20);
  await expect.poll(() => mediaRequests.length).toBeGreaterThan(0);
  await page.locator('iframe').scrollIntoViewIfNeeded();
  await expect(page.frameLocator('iframe').getByRole('heading', { name: 'Video player' })).toBeVisible();
  await expect(page.locator('iframe')).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeVisible();
});
