import {
  createNewDocument,
  documentFromFile,
  updateDocumentContent,
  type MarkittyDocument,
} from './documentModel';

export type DocumentState = {
  document: MarkittyDocument;
};

export function createDocumentState(document = createNewDocument()): DocumentState {
  return { document };
}

export function replaceDocumentWithFile(
  state: DocumentState,
  file: Parameters<typeof documentFromFile>[0],
): DocumentState {
  return {
    ...state,
    document: documentFromFile(file),
  };
}

export function editDocumentContent(state: DocumentState, content: string): DocumentState {
  return {
    ...state,
    document: updateDocumentContent(state.document, content),
  };
}
