import type { EditorActionId, TextSelectionRange } from './editorTypes';

type EditorActionResult = {
  content: string;
  selection: TextSelectionRange;
};

function getSelection(content: string, selection: TextSelectionRange) {
  return content.slice(selection.start, selection.end);
}

function replaceRange(
  content: string,
  selection: TextSelectionRange,
  replacement: string,
  nextSelection: TextSelectionRange,
): EditorActionResult {
  return {
    content: `${content.slice(0, selection.start)}${replacement}${content.slice(selection.end)}`,
    selection: nextSelection,
  };
}

function wrapSelection(
  content: string,
  selection: TextSelectionRange,
  before: string,
  after: string,
  placeholder: string,
): EditorActionResult {
  const selected = getSelection(content, selection);
  const inner = selected || placeholder;
  const replacement = `${before}${inner}${after}`;
  const innerStart = selection.start + before.length;
  const innerEnd = innerStart + inner.length;

  return replaceRange(content, selection, replacement, {
    start: selected ? innerEnd : innerStart,
    end: selected ? innerEnd : innerEnd,
  });
}

function createLink(content: string, selection: TextSelectionRange): EditorActionResult {
  const selected = getSelection(content, selection);
  const text = selected || 'link text';
  const replacement = `[${text}](url)`;
  const textStart = selection.start + 1;
  const urlStart = selection.start + replacement.length - 4;
  const urlEnd = urlStart + 3;

  return replaceRange(content, selection, replacement, {
    start: selected ? urlStart : textStart,
    end: selected ? urlEnd : textStart + text.length,
  });
}

function createCodeBlock(content: string, selection: TextSelectionRange): EditorActionResult {
  const selected = getSelection(content, selection);
  const inner = selected || 'code goes here';
  const replacement = `\`\`\`text\n${inner}\n\`\`\``;
  const innerStart = selection.start + '```text\n'.length;

  return replaceRange(content, selection, replacement, {
    start: innerStart,
    end: innerStart + inner.length,
  });
}

function lineBounds(content: string, selection: TextSelectionRange) {
  const lineStart = content.lastIndexOf('\n', Math.max(0, selection.start - 1)) + 1;
  const endIndex = selection.end > selection.start ? selection.end - 1 : selection.end;
  const nextNewline = content.indexOf('\n', endIndex);
  const lineEnd = nextNewline === -1 ? content.length : nextNewline;
  return { lineStart, lineEnd };
}

function prefixLines(
  content: string,
  selection: TextSelectionRange,
  prefixFactory: (index: number) => string,
  placeholder: string,
): EditorActionResult {
  const { lineStart, lineEnd } = lineBounds(content, selection);
  const selectedBlock = content.slice(lineStart, lineEnd);
  const lines = selectedBlock.length > 0 ? selectedBlock.split('\n') : [placeholder];
  const prefixed = lines
    .map((line, index) => {
      const prefix = prefixFactory(index);
      return line.startsWith(prefix) ? line : `${prefix}${line || placeholder}`;
    })
    .join('\n');

  const nextStart = lineStart + prefixFactory(0).length;
  const nextEnd = lineStart + prefixed.length;

  return {
    content: `${content.slice(0, lineStart)}${prefixed}${content.slice(lineEnd)}`,
    selection: {
      start: selection.start === selection.end ? nextStart : nextEnd,
      end: nextEnd,
    },
  };
}

export function applyEditorAction(
  action: EditorActionId,
  content: string,
  selection: TextSelectionRange,
): EditorActionResult {
  switch (action) {
    case 'heading':
      return prefixLines(content, selection, () => '# ', 'Heading');
    case 'bold':
      return wrapSelection(content, selection, '**', '**', 'bold text');
    case 'italic':
      return wrapSelection(content, selection, '*', '*', 'italic text');
    case 'inlineCode':
      return wrapSelection(content, selection, '`', '`', 'code');
    case 'codeBlock':
      return createCodeBlock(content, selection);
    case 'link':
      return createLink(content, selection);
    case 'unorderedList':
      return prefixLines(content, selection, () => '- ', 'list item');
    case 'orderedList':
      return prefixLines(content, selection, (index) => `${index + 1}. `, 'list item');
    case 'quote':
      return prefixLines(content, selection, () => '> ', 'quote');
  }
}
