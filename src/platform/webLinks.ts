import { isTauriRuntime } from './platformCapabilities';

export async function openWebUrl(url: string): Promise<void> {
  if (!/^https?:\/\//i.test(url)) throw new Error('Only web links can be opened.');
  if (isTauriRuntime()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
