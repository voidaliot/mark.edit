import type { ReactNode } from 'react';
import {
  Bold,
  Code,
  Code2,
  Columns2,
  Eye,
  Heading1,
  Italic,
  Link,
  List,
  ListOrdered,
  Pencil,
  Quote,
} from 'lucide-react';
import { IconButton } from '../shared/components/IconButton';
import type { EditorActionId, EditorMode } from './editorTypes';

type MarkdownToolbarProps = {
  mode: EditorMode;
  requestedMode: EditorMode;
  canUseSplit: boolean;
  onModeChange: (mode: EditorMode) => void;
  onAction: (action: EditorActionId) => void;
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
  onModeChange,
  onAction,
}: MarkdownToolbarProps) {
  return (
    <nav className="formatting-toolbar" aria-label="Markdown tools">
      <div className="tool-group" aria-label="View mode">
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
      </div>

      <div className="tool-group" aria-label="Formatting">
        {formattingActions.map((action) => (
          <IconButton key={action.id} label={action.label} onClick={() => onAction(action.id)}>
            {action.icon}
          </IconButton>
        ))}
      </div>
    </nav>
  );
}
