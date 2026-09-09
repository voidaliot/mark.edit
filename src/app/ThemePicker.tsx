import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemePreference } from './themeContext';

export function ThemePicker() {
  const { preference, setPreference } = useTheme();
  const Icon = preference === 'system' ? Monitor : preference === 'dark' ? Moon : Sun;
  return (
    <label className="theme-picker" title="Color theme">
      <Icon size={15} aria-hidden="true" />
      <select
        aria-label="Color theme"
        value={preference}
        onChange={(event) => setPreference(event.target.value as ThemePreference)}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
