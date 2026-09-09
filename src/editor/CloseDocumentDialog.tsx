import { useEffect, useRef } from 'react';
import { FileText } from 'lucide-react';

type CloseDocumentDialogProps = {
  title: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
};

export function CloseDocumentDialog({ title, busy, error, onCancel, onDiscard, onSave }: CloseDocumentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="close-dialog"
      aria-labelledby="close-dialog-title"
      aria-describedby="close-dialog-description"
      onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}
    >
      <FileText className="dialog-icon" size={24} aria-hidden="true" />
      <h2 id="close-dialog-title">Save changes?</h2>
      <p id="close-dialog-description">Save your changes to <strong>{title}</strong> before closing this tab.</p>
      {error ? <p className="dialog-error" role="alert">{error}</p> : null}
      <div className="dialog-actions">
        <button type="button" className="discard-button" disabled={busy} onClick={onDiscard}>Discard</button>
        <button type="button" autoFocus disabled={busy} onClick={onCancel}>Cancel</button>
        <button type="button" className="primary-button" disabled={busy} onClick={onSave}>{busy ? 'Saving…' : 'Save & close'}</button>
      </div>
    </dialog>
  );
}
