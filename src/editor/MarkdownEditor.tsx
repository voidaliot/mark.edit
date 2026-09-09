import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  undo,
} from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import {
  bracketMatching,
  HighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { Compartment, EditorState } from '@codemirror/state';
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder,
} from '@codemirror/view';
import { tags } from '@lezer/highlight';
import type { ThemeMode } from '../app/themeContext';
import { applyEditorAction } from './editorActions';
import type { EditorActionId } from './editorTypes';

export type MarkdownEditorHandle = {
  applyAction: (action: EditorActionId) => void;
  focus: () => void;
  insertMarkdown: (markdown: string) => void;
  undo: () => void;
};

type MarkdownEditorProps = {
  documentId: string;
  documentIds: string[];
  hidden?: boolean;
  value: string;
  onChange: (value: string) => void;
  theme: ThemeMode;
};

const markdownHighlightStyle = HighlightStyle.define([
  {
    tag: tags.heading,
    color: 'var(--syntax-heading)',
    fontWeight: '700',
  },
  {
    tag: tags.strong,
    color: 'var(--syntax-strong)',
    fontWeight: '700',
  },
  {
    tag: tags.emphasis,
    color: 'var(--syntax-emphasis)',
    fontStyle: 'italic',
  },
  { tag: tags.link, color: 'var(--syntax-link)' },
  { tag: tags.url, color: 'var(--syntax-url)', textDecoration: 'underline' },
  { tag: tags.monospace, color: 'var(--syntax-code)' },
  { tag: tags.quote, color: 'var(--syntax-quote)' },
  {
    tag: [tags.meta, tags.processingInstruction],
    color: 'var(--syntax-meta)',
  },
  {
    tag: [tags.punctuation, tags.bracket, tags.contentSeparator],
    color: 'var(--syntax-punctuation)',
  },
]);

function createEditorTheme(theme: ThemeMode) {
  return EditorView.theme(
    {
      '&': {
        height: '100%',
        color: 'var(--text-primary)',
        backgroundColor: 'var(--editor-bg)',
        fontFamily: 'var(--font-mono)',
        fontSize: '14px',
      },
      '.cm-scroller': {
        fontFamily: 'var(--font-mono)',
        lineHeight: '1.65',
      },
      '.cm-content': {
        minHeight: '100%',
        padding: '24px 20px',
        caretColor: 'var(--accent)',
      },
      '.cm-gutters': {
        backgroundColor: 'var(--editor-bg)',
        borderRight: 'none',
        color: 'var(--text-soft)',
      },
      '.cm-lineNumbers .cm-gutterElement': {
        minWidth: '40px',
        padding: '0 10px 0 14px',
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
      },
    },
    { dark: theme === 'dark' },
  );
}

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditor({ documentId, documentIds, hidden = false, value, onChange, theme }, ref) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const viewRef = useRef<EditorView | null>(null);
    const valueRef = useRef(value);
    const onChangeRef = useRef(onChange);
    const themeRef = useRef(theme);
    const themeCompartment = useMemo(() => new Compartment(), []);
    const activeIdRef = useRef<string | null>(null);
    const sessionsRef = useRef(new Map<string, { state: EditorState; top: number; left: number }>());
    valueRef.current = value;
    onChangeRef.current = onChange;
    themeRef.current = theme;

    const extensions = useMemo(
      () => [
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        indentOnInput(),
        bracketMatching(),
        markdown(),
        syntaxHighlighting(markdownHighlightStyle),
        EditorView.lineWrapping,
        placeholder('Start writing in Markdown…'),
        EditorView.contentAttributes.of({ 'aria-label': 'Markdown source', spellcheck: 'false' }),
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        highlightActiveLine(),
        themeCompartment.of(createEditorTheme(themeRef.current)),
      ],
      [themeCompartment],
    );

    useLayoutEffect(() => {
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

    useLayoutEffect(() => {
      const view = viewRef.current;
      if (!view) {
        return;
      }

      if (activeIdRef.current !== documentId) {
        if (activeIdRef.current) {
          sessionsRef.current.set(activeIdRef.current, {
            state: view.state, top: view.scrollDOM.scrollTop, left: view.scrollDOM.scrollLeft,
          });
        }
        const session = sessionsRef.current.get(documentId);
        view.setState(session?.state.doc.toString() === value
          ? session.state
          : EditorState.create({ doc: value, extensions }));
        activeIdRef.current = documentId;
        view.dispatch({ effects: themeCompartment.reconfigure(createEditorTheme(themeRef.current)) });
        view.scrollDOM.scrollTop = session?.top ?? 0;
        view.scrollDOM.scrollLeft = session?.left ?? 0;
      }

      const current = view.state.doc.toString();
      if (current === value) {
        return;
      }

      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }, [documentId, extensions, themeCompartment, value]);

    useLayoutEffect(() => {
      viewRef.current?.dispatch({ effects: themeCompartment.reconfigure(createEditorTheme(theme)) });
    }, [theme, themeCompartment]);

    useEffect(() => {
      for (const id of sessionsRef.current.keys()) {
        if (!documentIds.includes(id)) sessionsRef.current.delete(id);
      }
    }, [documentIds]);

    useLayoutEffect(() => {
      if (!hidden) viewRef.current?.requestMeasure();
    }, [hidden]);

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
      insertMarkdown(markdown: string) {
        const view = viewRef.current;
        if (!view) {
          return;
        }

        const selection = view.state.selection.main;
        view.dispatch({
          changes: { from: selection.from, to: selection.to, insert: markdown },
          selection: {
            anchor: selection.from + markdown.length,
            head: selection.from + markdown.length,
          },
          scrollIntoView: true,
        });
        view.focus();
      },
      focus() {
        viewRef.current?.focus();
      },
      undo() {
        const view = viewRef.current;
        if (!view) {
          return;
        }

        undo(view);
        view.focus();
      },
    }));

    return <div className="editor-pane" hidden={hidden} ref={hostRef} aria-label="Markdown editor" />;
  },
);
