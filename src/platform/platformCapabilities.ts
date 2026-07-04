import { isTauri as isTauriEnvironment } from '@tauri-apps/api/core';

export type PlatformCapabilities = {
  isTauri: boolean;
  canOpenFiles: boolean;
  canSaveFiles: boolean;
  canSaveAs: boolean;
  canUseSplitView: boolean;
  isMobileLike: boolean;
};

export function isTauriRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  return isTauriEnvironment();
}

export function getPlatformCapabilities(isWideLayout: boolean): PlatformCapabilities {
  const isTauri = isTauriRuntime();
  const isMobileLike =
    typeof navigator !== 'undefined' &&
    /android|iphone|ipad|ipod/i.test(navigator.userAgent);

  return {
    isTauri,
    canOpenFiles: isTauri || typeof FileReader !== 'undefined',
    canSaveFiles: true,
    canSaveAs: true,
    canUseSplitView: isWideLayout,
    isMobileLike,
  };
}
