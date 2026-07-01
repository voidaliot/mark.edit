import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import {
  bracketMatching,
  defaultHighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder,
} from '@codemirror/view';
import type { ThemeMode } from '../app/themeContext';
import { applyEditorAction } from './editorActions';
import type { EditorActionId } from './editorTypes';

export type MarkdownEditorHandle = {
  applyAction: (action: EditorActionId) => void;
  focus: () => void;
};

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  theme: ThemeMode;
};

function createEditorTheme(theme: ThemeMode) {
  return EditorView.theme(
    {
      '&': {
        height: '100%',
        color: 'var(--text-primary)',
        backgroundColor: 'var(--editor-bg)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.95rem',
      },
      '.cm-scroller': {
        fontFamily: 'var(--font-mono)',
        lineHeight: '1.65',
      },
      '.cm-content': {
        minHeight: '100%',
        padding: '22px 24px',
        caretColor: 'var(--accent)',
      },
      '.cm-gutters': {
        backgroundColor: 'var(--editor-bg)',
        borderRight: '1px solid var(--border-subtle)',
        color: 'var(--text-soft)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'var(--surface-muted)',
        color: 'var(--text-primary)',
      },
      '.cm-activeLine': {
        backgroundColor: 'var(--editor-active-line)',
      },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
        backgroundColor: 'var(--selection-bg)',
      },
      '&.cm-focused': {
        outline: 'none',
      },
      '.cm-placeholder': {
        color: 'var(--text-soft)',
        fontStyle: 'italic',
      },
    },
    { dark: theme === 'dark' },
  );
}

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditor({ value, onChange, theme }, ref) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const viewRef = useRef<EditorView | null>(null);
    const valueRef = useRef(value);
    const onChangeRef = useRef(onChange);
    valueRef.current = value;
    onChangeRef.current = onChange;

    const extensions = useMemo(
      () => [
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        indentOnInput(),
        bracketMatching(),
        markdown(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        EditorView.lineWrapping,
        placeholder('Start scratching some Markdown.'),
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        highlightActiveLine(),
        createEditorTheme(theme),
      ],
      [theme],
    );

    useEffect(() => {
      if (!hostRef.current) {
        return undefined;
      }

      const view = new EditorView({
        parent: hostRef.current,
        state: EditorState.create({
          doc: valueRef.current,
          extensions,
        }),
      });
      viewRef.current = view;

      return () => {
        view.destroy();
        viewRef.current = null;
      };
    }, [extensions]);

    useEffect(() => {
      const view = viewRef.current;
      if (!view) {
        return;
      }

      const current = view.state.doc.toString();
      if (current === value) {
        return;
      }

      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }, [value]);

    useImperativeHandle(ref, () => ({
      applyAction(action: EditorActionId) {
        const view = viewRef.current;
        if (!view) {
          return;
        }

        const current = view.state.doc.toString();
        const selection = view.state.selection.main;
        const result = applyEditorAction(action, current, {
          start: selection.from,
          end: selection.to,
        });

        view.dispatch({
          changes: { from: 0, to: current.length, insert: result.content },
          selection: {
            anchor: result.selection.start,
            head: result.selection.end,
          },
          scrollIntoView: true,
        });
        view.focus();
      },
      focus() {
        viewRef.current?.focus();
      },
    }));

    return <div className="editor-pane" ref={hostRef} aria-label="Markdown editor" />;
  },
);
