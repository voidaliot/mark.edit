import { useEffect } from 'react';
import type { EditorActionId } from './editorTypes';

type ShortcutHandlers = {
  enabled?: boolean;
  onAction: (action: EditorActionId) => void;
  onSave: () => void;
  onNew: () => void;
  onOpen?: () => void;
  onSaveAs?: () => void;
  onClose?: () => void;
  onNextTab?: (direction: number) => void;
};

export function getShortcutAction(event: KeyboardEvent): EditorActionId | null {
  const usesModifier = event.metaKey || event.ctrlKey;
  if (!usesModifier || event.altKey || event.shiftKey) {
    return null;
  }

  switch (event.key.toLowerCase()) {
    case 'b':
      return 'bold';
    case 'i':
      return 'italic';
    default:
      return null;
  }
}

export function useEditorShortcuts({ enabled = true, onAction, onSave, onNew, onOpen, onSaveAs, onClose, onNextTab }: ShortcutHandlers) {
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const usesModifier = event.metaKey || event.ctrlKey;
      if (!usesModifier || event.altKey || event.isComposing) {
        return;
      }

      const action = getShortcutAction(event);
      if (action) {
        event.preventDefault();
        onAction(action);
        return;
      }

      switch (event.key.toLowerCase()) {
        case 's':
          event.preventDefault();
          if (event.shiftKey && onSaveAs) onSaveAs();
          else onSave();
          break;
        case 'n':
        case 't':
          if (event.shiftKey) break;
          event.preventDefault();
          onNew();
          break;
        case 'o':
          if (onOpen && !event.shiftKey) {
            event.preventDefault();
            onOpen();
          }
          break;
        case 'w':
          if (onClose && !event.shiftKey) { event.preventDefault(); onClose(); }
          break;
        case 'tab':
          if (onNextTab) { event.preventDefault(); onNextTab(event.shiftKey ? -1 : 1); }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onAction, onNew, onOpen, onSave, onSaveAs, onClose, onNextTab]);
}
