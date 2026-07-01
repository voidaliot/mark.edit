import { useEffect } from 'react';
import type { EditorActionId } from './editorTypes';

type ShortcutHandlers = {
  onAction: (action: EditorActionId) => void;
  onSave: () => void;
  onNew: () => void;
  onOpen?: () => void;
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

export function useEditorShortcuts({ onAction, onSave, onNew, onOpen }: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const usesModifier = event.metaKey || event.ctrlKey;
      if (!usesModifier || event.altKey) {
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
          onSave();
          break;
        case 'n':
          event.preventDefault();
          onNew();
          break;
        case 'o':
          if (onOpen) {
            event.preventDefault();
            onOpen();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onAction, onNew, onOpen, onSave]);
}
