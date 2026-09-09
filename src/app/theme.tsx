import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeContext, type ThemePreference } from './themeContext';

const THEME_STORAGE_KEY = 'markitty.theme';

const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)';

function readPreference(): ThemePreference {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // A blocked storage area must not prevent the editor from opening.
  }
  return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(readPreference);
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(SYSTEM_THEME_QUERY).matches,
  );
  const theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    const query = window.matchMedia(SYSTEM_THEME_QUERY);
    const update = () => setSystemDark(query.matches);
    const syncPreference = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) setPreference(readPreference());
    };
    update();
    query.addEventListener('change', update);
    window.addEventListener('storage', syncPreference);
    return () => {
      query.removeEventListener('change', update);
      window.removeEventListener('storage', syncPreference);
    };
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themePreference = preference;
  }, [preference, theme]);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // Theme selection still works for this session without storage.
    }
  }, [preference]);

  const value = useMemo(
    () => ({ theme, preference, setPreference }),
    [theme, preference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
