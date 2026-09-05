import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MarkdownPreview } from '../src/editor/MarkdownPreview';
import { renderDiagram } from '../src/markdown/diagrams/diagramRenderer';

vi.mock('../src/markdown/diagrams/diagramRenderer', () => ({ renderDiagram: vi.fn() }));
vi.mock('../src/platform/tauriCommands', () => ({ allowAssetPaths: vi.fn().mockResolvedValue(undefined) }));

const result = { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100"/></svg>', width: 100, height: 100 };
const createObjectURL = vi.fn(() => 'blob:diagram');
const revokeObjectURL = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(renderDiagram).mockResolvedValue(result);
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = createObjectURL;
    static revokeObjectURL = revokeObjectURL;
  });
  vi.stubGlobal('IntersectionObserver', class {
    callback: (entries: { isIntersecting: boolean }[]) => void;
    constructor(callback: (entries: { isIntersecting: boolean }[]) => void) { this.callback = callback; }
    observe() { this.callback([{ isIntersecting: true }]); }
    disconnect() {}
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('keeps portal slots attached while mounting diagram images and cleaning up URLs', async () => {
  const view = render(<MarkdownPreview content={'# Heading\n\n```mermaid\ngraph TD\nA-->B\n```'} />);
  await waitFor(() => expect(view.getByRole('img')).toHaveAttribute('src', 'blob:diagram'));
  expect(view.getByRole('heading', { name: 'Heading' })).toBeInTheDocument();
  expect(renderDiagram).toHaveBeenCalledTimes(1);
  const signal = vi.mocked(renderDiagram).mock.calls[0][2];
  view.unmount();
  expect(signal.aborted).toBe(true);
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:diagram');
});

it('discards a late diagram result after content changes', async () => {
  let finish!: (value: typeof result) => void;
  vi.mocked(renderDiagram).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
  const view = render(<MarkdownPreview content={'```plantuml\nAlice -> Bob\n```'} />);
  await waitFor(() => expect(renderDiagram).toHaveBeenCalledTimes(1));
  const signal = vi.mocked(renderDiagram).mock.calls[0][2];
  view.rerender(<MarkdownPreview content="# New document" />);
  expect(signal.aborted).toBe(true);
  await act(async () => { finish(result); });
  expect(view.queryByRole('img')).toBeNull();
  expect(view.getByRole('heading', { name: 'New document' })).toBeInTheDocument();
  expect(createObjectURL).not.toHaveBeenCalled();
});
