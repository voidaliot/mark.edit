const SPLIT_EDITOR_PERCENT_STORAGE_KEY = 'markitty.splitEditorPercent';
const DEFAULT_SPLIT_EDITOR_PERCENT = 50;
const MIN_SPLIT_EDITOR_PERCENT = 25;
const MAX_SPLIT_EDITOR_PERCENT = 75;

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try { return window.localStorage; } catch { return null; }
}

export function clampSplitEditorPercent(percent: number) {
  if (!Number.isFinite(percent)) {
    return DEFAULT_SPLIT_EDITOR_PERCENT;
  }

  const clamped = Math.min(
    MAX_SPLIT_EDITOR_PERCENT,
    Math.max(MIN_SPLIT_EDITOR_PERCENT, percent),
  );
  return Math.round(clamped * 10) / 10;
}

export function loadSplitEditorPercent() {
  try {
    const storedValue = getStorage()?.getItem(SPLIT_EDITOR_PERCENT_STORAGE_KEY);
    return storedValue ? clampSplitEditorPercent(Number(storedValue)) : DEFAULT_SPLIT_EDITOR_PERCENT;
  } catch {
    return DEFAULT_SPLIT_EDITOR_PERCENT;
  }
}

export function saveSplitEditorPercent(percent: number) {
  try {
    getStorage()?.setItem(SPLIT_EDITOR_PERCENT_STORAGE_KEY, String(clampSplitEditorPercent(percent)));
  } catch {
    // Resizing remains available when preferences cannot be persisted.
  }
}

export const defaultSplitEditorPercent = DEFAULT_SPLIT_EDITOR_PERCENT;
export const minSplitEditorPercent = MIN_SPLIT_EDITOR_PERCENT;
export const maxSplitEditorPercent = MAX_SPLIT_EDITOR_PERCENT;
export const splitEditorPercentStorageKey = SPLIT_EDITOR_PERCENT_STORAGE_KEY;
