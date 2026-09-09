import { expect, test, type Page } from '@playwright/test';

const notes = '# Project notes\n\nA simple space to think, write, and keep moving.\n\n## This week\n\n- [x] Sketch the first idea\n- [x] Keep the useful details\n- [ ] Share a finished draft\n\n> Make room for the words that matter.\n\n## A small example\n\n```typescript\nconst greeting = "Hello, Markdown.";\nconsole.log(greeting);\n```\n\n| Document | Status |\n| --- | --- |\n| Getting started | Ready |\n| Project notes | In progress |\n\nEverything stays in your own files.';

async function openWorkspace(page: Page, contents = [notes, '# Getting started\n\nWrite something worth keeping.']) {
  await page.addInitScript((contents) => {
    if (localStorage.getItem('markitty.workspaceDraft')) return;
    const documents = contents.map((content, index) => ({
      id: `doc-${index}`, title: index === 0 ? 'Project notes.md' : `Document ${index + 1}.md`, content,
      createdAt: '2026-09-05T12:00:00.000Z', updatedAt: '2026-09-05T12:00:00.000Z', isDirty: false,
    }));
    localStorage.setItem('markitty.workspaceDraft', JSON.stringify({ documents, activeDocumentId: 'doc-0' }));
  }, contents);
  await page.goto('/');
  await expect(page.getByRole('tab').first()).toHaveAttribute('aria-selected', 'true');
}

test('system theme follows live OS changes and preserves an explicit preference', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await openWorkspace(page);
  const theme = page.getByRole('combobox', { name: 'Color theme' });
  await expect(theme).toHaveValue('system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.screenshot({ path: testInfo.outputPath('workspace-light.png'), animations: 'disabled' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: testInfo.outputPath('workspace-dark.png'), animations: 'disabled' });
  await theme.selectOption('light');
  await page.reload();
  await expect(theme).toHaveValue('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await theme.selectOption('system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('tabs retain separate undo history through theme and view changes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openWorkspace(page, ['First document', 'Second document']);
  const editor = page.getByRole('textbox', { name: 'Markdown source' });
  await editor.press('Control+End');
  await editor.pressSequentially(' edited first');
  await page.getByRole('tab').nth(1).click();
  await expect(editor).toHaveText('Second document');
  await editor.press('Control+End');
  await editor.pressSequentially(' edited second');
  await page.getByRole('tab').first().click();
  await expect(editor).toHaveText('First document edited first');
  await page.getByRole('combobox', { name: 'Color theme' }).selectOption('dark');
  await page.getByRole('button', { name: 'Preview mode', exact: true }).click();
  await expect(editor).toBeHidden();
  await page.getByRole('button', { name: 'Edit mode', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor).toHaveText('First document');
  await page.getByRole('tab').nth(1).click();
  await expect(editor).toHaveText('Second document edited second');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor).toHaveText('Second document');
  expect(errors).toEqual([]);
});

test('unsaved tabs require a choice and save-and-close downloads the right document', async ({ page }) => {
  await openWorkspace(page, ['First document', 'Second document']);
  const editor = page.getByRole('textbox', { name: 'Markdown source' });
  await editor.fill('Keep this draft');
  await page.getByRole('tab').nth(1).click();
  await page.getByRole('button', { name: 'Close Project notes.md', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Save changes?' });
  await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('tab')).toHaveCount(2);
  await page.getByRole('button', { name: 'Close Project notes.md', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save & close', exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('Project notes.md');
  const stream = await download.createReadStream();
  let saved = '';
  for await (const chunk of stream!) saved += chunk.toString();
  expect(saved).toBe('Keep this draft');
  await expect(page.getByRole('tab')).toHaveCount(1);
  await expect(editor).toHaveText('Second document');
  await editor.fill('Discard this edit');
  await page.getByRole('button', { name: 'Close Document 2.md', exact: true }).click();
  await page.getByRole('button', { name: 'Discard', exact: true }).click();
  await expect(editor.locator('.cm-placeholder')).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('markitty.workspaceDraft')!).documents[0].content)).toBe('');
  await expect(page.getByRole('tab')).toHaveCount(1);
  await expect(page.getByRole('tab')).toContainText('Untitled.md');
});

test('tab keyboard navigation keeps focus and reveals overflowed tabs', async ({ page }) => {
  await openWorkspace(page, Array.from({ length: 14 }, (_, i) => `Document ${i + 1}`));
  const tabs = page.getByRole('tab');
  await tabs.first().focus();
  await tabs.first().press('End');
  await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.last()).toBeFocused();
  await expect(tabs.last()).toBeInViewport();
  await tabs.last().press('ArrowRight');
  await expect(tabs.first()).toBeFocused();
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await tabs.first().press('Delete');
  await expect(tabs).toHaveCount(13);
  await expect(tabs.first()).toBeFocused();
});

test('phone layout keeps file and view controls visible and recovers edits', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWorkspace(page);
  await expect(page.getByRole('button', { name: 'Edit mode', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Split mode', exact: true })).toBeDisabled();
  for (const name of ['Open Markdown file', 'Save document', 'Save as', 'Preview mode', 'New tab']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeInViewport();
  }
  await expect(page.getByRole('combobox', { name: 'Color theme' })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('workspace-phone.png') });
  await page.getByRole('button', { name: 'Preview mode', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Project notes', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit mode', exact: true }).click();
  await page.getByRole('textbox', { name: 'Markdown source' }).fill('A recovered mobile draft');
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Markdown source' })).toHaveText('A recovered mobile draft');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('failed draft storage leaves editing and file saving available', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Storage full', 'QuotaExceededError'); };
  });
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: 'Markdown source' });
  await editor.fill('Still able to write');
  await expect(page.getByRole('alert')).toContainText('Draft recovery is unavailable');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save document', exact: true }).click();
  await download;
  await expect(editor).toHaveText('Still able to write');
  expect(errors).toEqual([]);
});
