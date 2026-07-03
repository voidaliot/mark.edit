const SPLIT_EDITOR_PERCENT_STORAGE_KEY = 'markitty.splitEditorPercent';
const DEFAULT_SPLIT_EDITOR_PERCENT = 50;
const MIN_SPLIT_EDITOR_PERCENT = 25;
const MAX_SPLIT_EDITOR_PERCENT = 75;

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
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
  const storedValue = getStorage()?.getItem(SPLIT_EDITOR_PERCENT_STORAGE_KEY);
  if (!storedValue) {
    return DEFAULT_SPLIT_EDITOR_PERCENT;
  }

  return clampSplitEditorPercent(Number(storedValue));
}

export function saveSplitEditorPercent(percent: number) {
  getStorage()?.setItem(
    SPLIT_EDITOR_PERCENT_STORAGE_KEY,
    String(clampSplitEditorPercent(percent)),
  );
}

export const defaultSplitEditorPercent = DEFAULT_SPLIT_EDITOR_PERCENT;
export const minSplitEditorPercent = MIN_SPLIT_EDITOR_PERCENT;
export const maxSplitEditorPercent = MAX_SPLIT_EDITOR_PERCENT;
export const splitEditorPercentStorageKey = SPLIT_EDITOR_PERCENT_STORAGE_KEY;
