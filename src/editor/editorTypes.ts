export type EditorMode = 'edit' | 'preview' | 'split';

export type EditorActionId =
  | 'heading'
  | 'bold'
  | 'italic'
  | 'inlineCode'
  | 'codeBlock'
  | 'link'
  | 'unorderedList'
  | 'orderedList'
  | 'quote';

export type SaveStatus =
  | 'Recovered draft'
  | 'Draft saved'
  | 'Start scratching some Markdown.'
  | 'Saved. Purrfect.'
  | 'Save failed'
  | 'Open failed'
  | `Opened ${string}`;

export type TextSelectionRange = {
  start: number;
  end: number;
};

export function normalizeEditorMode(requestedMode: EditorMode, canUseSplit: boolean): EditorMode {
  if (requestedMode === 'split' && !canUseSplit) {
    return 'edit';
  }

  return requestedMode;
}
