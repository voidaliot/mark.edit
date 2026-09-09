import { useEffect, useState, type ReactNode } from 'react';
import { Copy, Minus, Square, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTheme } from '../app/themeContext';
import { ThemePicker } from '../app/ThemePicker';
import { MarkittyIcon } from '../shared/components/MarkittyIcon';
import { getPlatformCapabilities } from './platformCapabilities';

type WindowTitlebarProps = {
  children: ReactNode;
  title: string;
  onError: (message: string) => void;
};

export function WindowTitlebar({ children, title, onError }: WindowTitlebarProps) {
  const { preference } = useTheme();
  const [appWindow] = useState(() => {
    const { isTauri, isMobileLike } = getPlatformCapabilities(false);
    return isTauri && !isMobileLike ? getCurrentWindow() : null;
  });
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    document.title = `${title} — Markitty`;
    void appWindow?.setTitle(document.title).catch(() => onError('Unable to update the window title.'));
  }, [appWindow, onError, title]);

  useEffect(() => {
    void appWindow?.setTheme(preference === 'system' ? null : preference)
      .catch(() => onError('Unable to update the native window theme.'));
  }, [appWindow, onError, preference]);

  useEffect(() => {
    if (!appWindow) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    const update = async () => {
      try {
        const next = await appWindow.isMaximized();
        if (!disposed) setMaximized(next);
      } catch {
        if (!disposed) onError('Unable to read the window size.');
      }
    };
    void update();
    void appWindow.onResized(() => void update()).then((cleanup) => {
      if (disposed) cleanup();
      else unlisten = cleanup;
    }).catch(() => { if (!disposed) onError('Unable to watch the window size.'); });
    return () => { disposed = true; unlisten?.(); };
  }, [appWindow, onError]);

  const runWindowAction = async (action: 'minimize' | 'toggleMaximize' | 'close') => {
    try {
      await appWindow?.[action]();
    } catch {
      onError('Unable to change the window. Please try again.');
    }
  };

  return (
    <header className="titlebar" aria-label="Application title bar" data-desktop={Boolean(appWindow)}>
      <span className="titlebar-brand" title="Markitty"><MarkittyIcon size={30} /></span>
      {children}
      <div className="window-drag" data-tauri-drag-region>
        <span aria-hidden="true">Markitty</span>
      </div>
      <ThemePicker />
      {appWindow ? (
        <div className="window-controls" role="group" aria-label="Window controls">
          <button className="caption-button" aria-label="Minimize" title="Minimize" onClick={() => void runWindowAction('minimize')}>
            <Minus size={15} aria-hidden="true" />
          </button>
          <button className="caption-button" aria-label={maximized ? 'Restore' : 'Maximize'} title={maximized ? 'Restore' : 'Maximize'} onClick={() => void runWindowAction('toggleMaximize')}>
            {maximized ? <Copy size={13} aria-hidden="true" /> : <Square size={13} aria-hidden="true" />}
          </button>
          <button className="caption-button close-window" aria-label="Close window" title="Close window" onClick={() => void runWindowAction('close')}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </header>
  );
}
