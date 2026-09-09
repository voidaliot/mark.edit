import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WindowTitlebar } from '../src/platform/WindowTitlebar';
import { ThemeContext } from '../src/app/themeContext';

const native = vi.hoisted(() => ({
  minimize: vi.fn(), toggleMaximize: vi.fn(), close: vi.fn(), isMaximized: vi.fn(),
  onResized: vi.fn(), setTitle: vi.fn(), setTheme: vi.fn(),
}));
const platform = vi.hoisted(() => ({ isTauri: true, isMobileLike: false }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => native }));
vi.mock('../src/platform/platformCapabilities', () => ({ getPlatformCapabilities: () => platform }));

describe('desktop titlebar', () => {
  beforeEach(() => {
    platform.isTauri = true;
    platform.isMobileLike = false;
    native.minimize.mockResolvedValue(undefined);
    native.toggleMaximize.mockResolvedValue(undefined);
    native.close.mockResolvedValue(undefined);
    native.setTitle.mockResolvedValue(undefined);
    native.setTheme.mockResolvedValue(undefined);
    native.isMaximized.mockResolvedValue(false);
    native.onResized.mockResolvedValue(vi.fn());
  });
  afterEach(() => vi.resetAllMocks());

  const titlebar = (preference: 'system' | 'dark' = 'system', onError = vi.fn()) => (
    <ThemeContext.Provider value={{ theme: 'dark', preference, setPreference: vi.fn() }}>
      <WindowTitlebar title="notes.md" onError={onError}><span>Tabs</span></WindowTitlebar>
    </ThemeContext.Provider>
  );

  it('uses native window actions, follows the theme choice and updates maximize state', async () => {
    const { rerender } = render(titlebar());
    await waitFor(() => expect(native.setTitle).toHaveBeenCalledWith('notes.md — Markitty'));
    expect(native.setTheme).toHaveBeenCalledWith(null);
    fireEvent.click(screen.getByRole('button', { name: 'Minimize' }));
    fireEvent.click(screen.getByRole('button', { name: 'Maximize' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close window' }));
    expect(native.minimize).toHaveBeenCalledOnce();
    expect(native.toggleMaximize).toHaveBeenCalledOnce();
    expect(native.close).toHaveBeenCalledOnce();
    native.isMaximized.mockResolvedValue(true);
    await act(async () => native.onResized.mock.calls[0][0]());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Restore' })).toBeVisible());
    rerender(titlebar('dark'));
    expect(native.setTheme).toHaveBeenLastCalledWith('dark');
  });

  it('cleans up listeners that finish registering after unmount', async () => {
    let resolve!: (cleanup: () => void) => void;
    native.onResized.mockReturnValue(new Promise((done) => { resolve = done; }));
    const cleanup = vi.fn();
    const { unmount } = render(titlebar());
    unmount();
    await act(async () => resolve(cleanup));
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it.each(['browser', 'mobile'])('omits native controls in the %s', async (runtime) => {
    platform.isTauri = runtime !== 'browser';
    platform.isMobileLike = runtime === 'mobile';
    render(titlebar());
    expect(screen.queryByRole('group', { name: 'Window controls' })).toBeNull();
    expect(native.setTheme).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox', { name: 'Color theme' })).toBeVisible();
  });
});
