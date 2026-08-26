import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownToolbar } from '../src/editor/MarkdownToolbar';

function renderToolbar(mode: 'edit' | 'preview' | 'split', onUndo = vi.fn()) {
  render(
    <MarkdownToolbar
      mode={mode}
      requestedMode={mode}
      canUseSplit
      canOpenFiles
      canEmbedFiles
      theme="light"
      onModeChange={vi.fn()}
      onAction={vi.fn()}
      onEmbedFile={vi.fn()}
      onEmbedImage={vi.fn()}
      onNew={vi.fn()}
      onOpen={vi.fn()}
      onSave={vi.fn()}
      onSaveAs={vi.fn()}
      onToggleTheme={vi.fn()}
      onUndo={onUndo}
    />,
  );

  return onUndo;
}

describe('MarkdownToolbar undo button', () => {
  it('runs undo while the editor is visible', () => {
    const onUndo = renderToolbar('edit');

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(onUndo).toHaveBeenCalledOnce();
  });

  it('is disabled in preview-only mode', () => {
    renderToolbar('preview');

    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });
});
