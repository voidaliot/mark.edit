import { Plus, X } from 'lucide-react';
import type { MarkittyDocument } from '../storage/documentModel';
import { IconButton } from '../shared/components/IconButton';

type DocumentTabsProps = {
  documents: MarkittyDocument[];
  activeDocumentId: string;
  onActivate: (documentId: string) => void;
  onClose: (documentId: string) => void;
  onNew: () => void;
};

export function DocumentTabs({
  documents,
  activeDocumentId,
  onActivate,
  onClose,
  onNew,
}: DocumentTabsProps) {
  return (
    <section className="tabs-bar" aria-label="Open documents">
      <div className="tabs-scroll" role="tablist" aria-label="Open Markdown files">
        {documents.map((document) => (
          <div
            key={document.id}
            role="tab"
            aria-selected={document.id === activeDocumentId}
            className="document-tab"
          >
            <button
              type="button"
              className="tab-activate"
              onClick={() => onActivate(document.id)}
            >
              <span className="tab-title">{document.title}</span>
              {document.isDirty ? <span className="tab-dirty" aria-label="Unsaved" /> : null}
            </button>
            <button
              type="button"
              className="tab-close"
              aria-label={`Close ${document.title}`}
              onClick={() => onClose(document.id)}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      <IconButton label="New tab" className="new-tab-button" onClick={onNew}>
        <Plus size={17} aria-hidden="true" />
      </IconButton>
    </section>
  );
}
