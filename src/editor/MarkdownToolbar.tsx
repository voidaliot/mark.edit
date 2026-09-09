import type { ReactNode } from 'react';
import {
  Bold,
  Code,
  Code2,
  Columns2,
  Eye,
  FileImage,
  FolderOpen,
  Heading1,
  Italic,
  Link,
  List,
  ListOrdered,
  Paperclip,
  Pencil,
  Quote,
  Save,
  SavePen,
  Undo2,
} from 'lucide-react';
import { IconButton } from '../shared/components/IconButton';
import type { EditorActionId, EditorMode } from './editorTypes';

type MarkdownToolbarProps = {
  mode: EditorMode;
  canUseSplit: boolean;
  canOpenFiles: boolean;
  canEmbedFiles: boolean;
  onModeChange: (mode: EditorMode) => void;
  onAction: (action: EditorActionId) => void;
  onEmbedFile: () => void;
  onEmbedImage: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onUndo: () => void;
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
  canUseSplit,
  canOpenFiles,
  canEmbedFiles,
  onModeChange,
  onAction,
  onEmbedFile,
  onEmbedImage,
  onOpen,
  onSave,
  onSaveAs,
  onUndo,
}: MarkdownToolbarProps) {
  return (
    <nav className="formatting-toolbar" aria-label="Markdown tools">
      <div className="file-actions" role="group" aria-label="File actions">
        <IconButton label="Open Markdown file" title="Open Markdown file (Ctrl+O)" onClick={onOpen} disabled={!canOpenFiles}>
          <FolderOpen size={17} aria-hidden="true" />
        </IconButton>
        <IconButton label="Save document" title="Save document (Ctrl+S)" onClick={onSave}>
          <Save size={17} aria-hidden="true" />
        </IconButton>
        <IconButton label="Save as" title="Save as (Ctrl+Shift+S)" onClick={onSaveAs}>
          <SavePen size={17} aria-hidden="true" />
        </IconButton>
      </div>
      <span className="tool-separator file-separator" aria-hidden="true" />
      <div className="format-actions" role="group" aria-label="Formatting">
        <IconButton label="Undo" onClick={onUndo} disabled={mode === 'preview'}>
          <Undo2 size={17} aria-hidden="true" />
        </IconButton>
        <span className="tool-separator" aria-hidden="true" />
        {formattingActions.map((action) => (
          <IconButton key={action.id} label={action.label} onClick={() => onAction(action.id)}>
            {action.icon}
          </IconButton>
        ))}
        <span className="tool-separator" aria-hidden="true" />
        <IconButton label="Insert picture" onClick={onEmbedImage} disabled={!canEmbedFiles}>
          <FileImage size={17} aria-hidden="true" />
        </IconButton>
        <IconButton label="Attach file" onClick={onEmbedFile} disabled={!canEmbedFiles}>
          <Paperclip size={17} aria-hidden="true" />
        </IconButton>
      </div>
      <div className="view-modes" role="group" aria-label="Editor view">
        <IconButton
          label="Edit mode"
          pressed={mode === 'edit'}
          onClick={() => onModeChange('edit')}
        >
          <Pencil size={17} aria-hidden="true" />
          <span>Edit</span>
        </IconButton>
        <IconButton
          label="Preview mode"
          pressed={mode === 'preview'}
          onClick={() => onModeChange('preview')}
        >
          <Eye size={17} aria-hidden="true" />
          <span>Preview</span>
        </IconButton>
        <IconButton
          label="Split mode"
          pressed={mode === 'split'}
          disabled={!canUseSplit}
          onClick={() => onModeChange('split')}
        >
          <Columns2 size={17} aria-hidden="true" />
          <span>Split</span>
        </IconButton>
      </div>
    </nav>
  );
}
