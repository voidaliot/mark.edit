export type PlatformCapabilities = {
  isTauri: boolean;
  canOpenFiles: boolean;
  canSaveFiles: boolean;
  canSaveAs: boolean;
  canUseSplitView: boolean;
  isMobileLike: boolean;
};

type WindowWithTauri = Window & {
  __TAURI_INTERNALS__?: unknown;
};

export function isTauriRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  return Boolean((window as WindowWithTauri).__TAURI_INTERNALS__);
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
