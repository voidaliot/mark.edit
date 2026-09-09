import { useEffect, useRef, type KeyboardEvent } from 'react';
import { FileText, Plus, X } from 'lucide-react';
import type { MarkittyDocument } from '../storage/documentModel';
import { IconButton } from '../shared/components/IconButton';

type DocumentTabsProps = {
  documents: MarkittyDocument[];
  activeDocumentId: string;
  onActivate: (documentId: string) => void;
  onClose: (documentId: string) => void;
  onNew: () => void;
};

export function DocumentTabs({ documents, activeDocumentId, onActivate, onClose, onNew }: DocumentTabsProps) {
  const tablistRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    tablistRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeDocumentId, documents.length]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | undefined;
    if (event.key === 'ArrowRight') next = (index + 1) % documents.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + documents.length) % documents.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = documents.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      onActivate(documents[next].id);
      tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
    } else if (event.key === 'Delete') {
      event.preventDefault();
      onClose(documents[index].id);
    }
  };

  return (
    <>
      <div ref={tablistRef} className="tabs-scroll" role="tablist" aria-label="Open Markdown files">
        {documents.map((document, index) => {
          const active = document.id === activeDocumentId;
          return (
            <div key={document.id} className="document-tab" data-active={active} role="presentation">
              <button
                type="button"
                id={`tab-${document.id}`}
                role="tab"
                aria-selected={active}
                aria-controls={active ? 'document-panel' : undefined}
                aria-label={`${document.title}${document.isDirty ? ' (unsaved)' : ''}`}
                tabIndex={active ? 0 : -1}
                className="tab-activate"
                title={document.path ?? document.title}
                onClick={() => onActivate(document.id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                onMouseDown={(event) => { if (event.button === 1) event.preventDefault(); }}
                onAuxClick={(event) => {
                  if (event.button === 1) { event.preventDefault(); onClose(document.id); }
                }}
              >
                <FileText className="tab-icon" size={14} aria-hidden="true" />
                <span className="tab-title">{document.title}</span>
                {document.isDirty ? <span className="tab-dirty" aria-hidden="true" /> : null}
              </button>
              <button
                type="button"
                className="tab-close"
                tabIndex={active ? 0 : -1}
                aria-label={`Close ${document.title}`}
                title={`Close ${document.title}`}
                onClick={() => onClose(document.id)}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
      <IconButton className="new-tab" label="New tab" title="New tab (Ctrl+T)" onClick={onNew}>
        <Plus size={18} aria-hidden="true" />
      </IconButton>
    </>
  );
}
