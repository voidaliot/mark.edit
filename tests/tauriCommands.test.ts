import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks';
import { saveMarkdownFile } from '../src/platform/tauriCommands';

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
});
