import { isTauriRuntime } from './platformCapabilities';

export async function exportDiagramSvg(svg: string, filename: string): Promise<boolean> {
  if (isTauriRuntime()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const path = await save({ defaultPath: filename, filters: [{ name: 'SVG diagram', extensions: ['svg'] }] });
    if (!path) return false;
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    await writeTextFile(path, svg);
  } else {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }
  return true;
}
