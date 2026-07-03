import { beforeEach, describe, expect, it } from 'vitest';
import {
  clampSplitEditorPercent,
  defaultSplitEditorPercent,
  loadSplitEditorPercent,
  maxSplitEditorPercent,
  minSplitEditorPercent,
  saveSplitEditorPercent,
  splitEditorPercentStorageKey,
} from '../src/editor/splitView';

describe('split view sizing', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('keeps split percentages within useful editor and preview sizes', () => {
    expect(clampSplitEditorPercent(10)).toBe(minSplitEditorPercent);
    expect(clampSplitEditorPercent(90)).toBe(maxSplitEditorPercent);
    expect(clampSplitEditorPercent(62.54)).toBe(62.5);
  });

  it('falls back to the default size for invalid values', () => {
    expect(clampSplitEditorPercent(Number.NaN)).toBe(defaultSplitEditorPercent);
  });

  it('loads and saves the preferred split size', () => {
    saveSplitEditorPercent(64.44);

    expect(window.localStorage.getItem(splitEditorPercentStorageKey)).toBe('64.4');
    expect(loadSplitEditorPercent()).toBe(64.4);
  });

  it('clamps persisted values when loading', () => {
    window.localStorage.setItem(splitEditorPercentStorageKey, '12');

    expect(loadSplitEditorPercent()).toBe(minSplitEditorPercent);
  });
});
