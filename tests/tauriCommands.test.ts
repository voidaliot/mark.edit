import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks';
import {
  allowAssetPaths,
  openMarkdownFilesAtPaths,
  saveMarkdownFile,
} from '../src/platform/tauriCommands';

describe('saveMarkdownFile', () => {
  afterEach(() => {
    clearMocks();
    vi.unstubAllGlobals();
  });

  it('uses the native save command for existing Tauri paths', async () => {
    vi.stubGlobal('isTauri', true);
    const calls: Array<{ command: string; payload: unknown }> = [];

    mockIPC((command, payload) => {
      calls.push({ command, payload });
      return {
        path: (payload as { path: string }).path,
        title: 'note.md',
      };
    });

    await expect(
      saveMarkdownFile('E:\\GitHub\\note.md', 'hello', 'note.md'),
    ).resolves.toEqual({
      path: 'E:\\GitHub\\note.md',
      title: 'note.md',
    });
    expect(calls).toEqual([
      {
        command: 'save_markdown_path',
        payload: {
          path: 'E:\\GitHub\\note.md',
          content: 'hello',
        },
      },
    ]);
  });

  it('adds a Markdown extension before invoking the native save command', async () => {
    vi.stubGlobal('isTauri', true);
    const calls: Array<{ command: string; payload: unknown }> = [];

    mockIPC((command, payload) => {
      calls.push({ command, payload });
      return {
        path: (payload as { path: string }).path,
        title: 'note.md',
      };
    });

    await expect(saveMarkdownFile('E:\\GitHub\\note', 'hello', 'note')).resolves.toEqual({
      path: 'E:\\GitHub\\note.md',
      title: 'note.md',
    });
    expect(calls).toEqual([
      {
        command: 'save_markdown_path',
        payload: {
          path: 'E:\\GitHub\\note.md',
          content: 'hello',
        },
      },
    ]);
  });

  it('preserves existing text file paths when saving', async () => {
    vi.stubGlobal('isTauri', true);
    const calls: Array<{ command: string; payload: unknown }> = [];

    mockIPC((command, payload) => {
      calls.push({ command, payload });
      return {
        path: (payload as { path: string }).path,
        title: 'notes.txt',
      };
    });

    await expect(saveMarkdownFile('E:\\GitHub\\notes.txt', 'hello', 'notes.txt')).resolves.toEqual({
      path: 'E:\\GitHub\\notes.txt',
      title: 'notes.txt',
    });
    expect(calls).toEqual([
      {
        command: 'save_markdown_path',
        payload: {
          path: 'E:\\GitHub\\notes.txt',
          content: 'hello',
        },
      },
    ]);
  });

  it('opens Markdown and text paths through the native open command', async () => {
    vi.stubGlobal('isTauri', true);
    const calls: Array<{ command: string; payload: unknown }> = [];

    mockIPC((command, payload) => {
      calls.push({ command, payload });
      return {
        files: [
          { title: 'index.md', content: '# Index', path: 'E:\\docs\\index.md' },
          { title: 'syntax.txt', content: 'syntax', path: 'E:\\docs\\syntax.txt' },
        ],
        errors: [],
      };
    });

    await expect(
      openMarkdownFilesAtPaths([
        'E:\\docs\\index.md',
        'E:\\docs\\syntax.txt',
        'E:\\docs\\diagram.png',
      ]),
    ).resolves.toEqual([
      { title: 'index.md', content: '# Index', path: 'E:\\docs\\index.md' },
      { title: 'syntax.txt', content: 'syntax', path: 'E:\\docs\\syntax.txt' },
    ]);
    expect(calls).toEqual([
      {
        command: 'open_markdown_paths',
        payload: {
          paths: ['E:\\docs\\index.md', 'E:\\docs\\syntax.txt'],
        },
      },
    ]);
  });

  it('authorizes local asset paths through the native asset command', async () => {
    vi.stubGlobal('isTauri', true);
    const calls: Array<{ command: string; payload: unknown }> = [];

    mockIPC((command, payload) => {
      calls.push({ command, payload });
      return null;
    });

    await allowAssetPaths(['E:/GitHub/sysml-v2-vscext/docs/pictures/diagram.png']);

    expect(calls).toEqual([
      {
        command: 'allow_asset_paths',
        payload: {
          paths: ['E:/GitHub/sysml-v2-vscext/docs/pictures/diagram.png'],
        },
      },
    ]);
  });
});
