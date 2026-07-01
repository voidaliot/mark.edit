import { useEffect } from 'react';
import type { MarkittyDocument } from '../../storage/documentModel';
import { saveDraft } from '../../storage/draftStorage';

export function useDraftPersistence(document: MarkittyDocument) {
  useEffect(() => {
    saveDraft(document);
  }, [document]);
}
