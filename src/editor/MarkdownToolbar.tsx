import type { ReactNode } from 'react';
import {
  Bold,
  Code,
  Code2,
  Columns2,
  Eye,
  FilePlus,
  FolderOpen,
  Heading1,
  Italic,
  Link,
  List,
  ListOrdered,
  Moon,
  Pencil,
  Quote,
  Save,
  SavePen,
  Sun,
} from 'lucide-react';
import { IconButton } from '../shared/components/IconButton';
import type { ThemeMode } from '../app/themeContext';
import type { EditorActionId, EditorMode } from './editorTypes';

type MarkdownToolbarProps = {
  mode: EditorMode;
  requestedMode: EditorMode;
  canUseSplit: boolean;
  canOpenFiles: boolean;
  theme: ThemeMode;
  onModeChange: (mode: EditorMode) => void;
  onAction: (action: EditorActionId) => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onToggleTheme: () => void;
};

const formattingActions: Array<{
  id: EditorActionId;
  label: string;
  icon: ReactNode;
}> = [
  { id: 'heading', label: 'Heading', icon: <Heading1 size={17} aria-hidden="true" /> },
  { id: 'bold', label: 'Bold', icon: <Bold size={17} aria-hidden="true" /> },
  { id: 'italic', label: 'Italic', icon: <Italic size={17} aria-hidden="true" /> },
  { id: 'inlineCode', label: 'Inline code', icon: <Code size={17} aria-hidden="true" /> },
  { id: 'codeBlock', label: 'Code block', icon: <Code2 size={17} aria-hidden="true" /> },
  { id: 'link', label: 'Link', icon: <Link size={17} aria-hidden="true" /> },
  { id: 'unorderedList', label: 'Unordered list', icon: <List size={17} aria-hidden="true" /> },
  {
    id: 'orderedList',
    label: 'Ordered list',
    icon: <ListOrdered size={17} aria-hidden="true" />,
  },
  { id: 'quote', label: 'Quote', icon: <Quote size={17} aria-hidden="true" /> },
];

export function MarkdownToolbar({
  mode,
  requestedMode,
  canUseSplit,
  canOpenFiles,
  theme,
  onModeChange,
  onAction,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onToggleTheme,
}: MarkdownToolbarProps) {
  return (
    <nav className="formatting-toolbar" aria-label="Markdown tools">
      <IconButton
        label="Edit mode"
        pressed={mode === 'edit' && requestedMode === 'edit'}
        onClick={() => onModeChange('edit')}
      >
        <Pencil size={17} aria-hidden="true" />
      </IconButton>
      <IconButton
        label="Preview mode"
        pressed={mode === 'preview'}
        onClick={() => onModeChange('preview')}
      >
        <Eye size={17} aria-hidden="true" />
      </IconButton>
      <IconButton
        label="Split mode"
        pressed={requestedMode === 'split' && mode === 'split'}
        disabled={!canUseSplit}
        onClick={() => onModeChange('split')}
      >
        <Columns2 size={17} aria-hidden="true" />
      </IconButton>
      <span className="tool-separator" aria-hidden="true" />
      {formattingActions.map((action) => (
        <IconButton key={action.id} label={action.label} onClick={() => onAction(action.id)}>
          {action.icon}
        </IconButton>
      ))}
      <span className="toolbar-spacer" aria-hidden="true" />
      <span className="tool-separator" aria-hidden="true" />
      <IconButton label="New tab" onClick={onNew}>
        <FilePlus size={18} aria-hidden="true" />
      </IconButton>
      <IconButton label="Open Markdown file" onClick={onOpen} disabled={!canOpenFiles}>
        <FolderOpen size={18} aria-hidden="true" />
      </IconButton>
      <IconButton label="Save document" onClick={onSave}>
        <Save size={18} aria-hidden="true" />
      </IconButton>
      <IconButton label="Save as" onClick={onSaveAs}>
        <SavePen size={18} aria-hidden="true" />
      </IconButton>
      <IconButton
        label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'}
        onClick={onToggleTheme}
      >
        {theme === 'dark' ? (
          <Sun size={18} aria-hidden="true" />
        ) : (
          <Moon size={18} aria-hidden="true" />
        )}
      </IconButton>
    </nav>
  );
}
