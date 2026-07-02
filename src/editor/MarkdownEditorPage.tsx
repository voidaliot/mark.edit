import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from 'react';
import { useTheme } from '../app/themeContext';
import {
  getInitialMarkdownFilesToOpen,
  listenForMarkdownFilesToOpen,
  openMarkdownFilesFromDevice,
  openMarkdownFromDroppedFiles,
  saveMarkdownToDevice,
  saveMarkdownToNewPath,
} from '../storage/fileSystem';
import {
  createNewDocument,
  documentFromFile,
  updateDocumentContent,
  type MarkittyDocument,
} from '../storage/documentModel';
import {
  loadDraft,
  loadWorkspaceDraft,
  saveWorkspaceDraft,
} from '../storage/draftStorage';
import { getDocumentStats } from '../shared/utils/documentStats';
import { usePlatformCapabilities } from '../shared/hooks/usePlatformCapabilities';
import { useEditorShortcuts } from './editorShortcuts';
import { MarkdownEditor, type MarkdownEditorHandle } from './MarkdownEditor';
import { MarkdownPreview } from './MarkdownPreview';
import { MarkdownToolbar } from './MarkdownToolbar';
import { DocumentTabs } from './DocumentTabs';
import {
  normalizeEditorMode,
  type EditorActionId,
  type EditorMode,
  type SaveStatus,
} from './editorTypes';

type WorkspaceState = {
  documents: MarkittyDocument[];
  activeDocumentId: string;
};

function loadInitialWorkspace(): WorkspaceState {
  const workspaceDraft = loadWorkspaceDraft();
  if (workspaceDraft) {
    return workspaceDraft;
  }

  const document = loadDraft() ?? createNewDocument();
  return {
    documents: [document],
    activeDocumentId: document.id,
  };
}

function useWideLayout() {
  const [isWide, setIsWide] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 900px)').matches,
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const query = window.matchMedia('(min-width: 900px)');
    const update = () => setIsWide(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return isWide;
}

export function MarkdownEditorPage() {
  const editorRef = useRef<MarkdownEditorHandle>(null);
  const initialWorkspaceRef = useRef<WorkspaceState | null>(null);
  if (!initialWorkspaceRef.current) {
    initialWorkspaceRef.current = loadInitialWorkspace();
  }

  const [documents, setDocuments] = useState<MarkittyDocument[]>(
    () => initialWorkspaceRef.current?.documents ?? [createNewDocument()],
  );
  const [activeDocumentId, setActiveDocumentId] = useState(
    () => initialWorkspaceRef.current?.activeDocumentId ?? documents[0].id,
  );
  const [requestedMode, setRequestedMode] = useState<EditorMode>('split');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('Recovered draft');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isWideLayout = useWideLayout();
  const mode = normalizeEditorMode(requestedMode, isWideLayout);
  const capabilities = usePlatformCapabilities(isWideLayout);
  const document = useMemo(
    () =>
      documents.find((currentDocument) => currentDocument.id === activeDocumentId) ??
      documents[0],
    [activeDocumentId, documents],
  );
  const stats = useMemo(() => getDocumentStats(document.content), [document.content]);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    saveWorkspaceDraft({ documents, activeDocumentId: document.id });
  }, [activeDocumentId, document.id, documents]);

  const updateActiveDocument = useCallback(
    (updater: (document: MarkittyDocument) => MarkittyDocument) => {
      setDocuments((currentDocuments) =>
        currentDocuments.map((currentDocument) =>
          currentDocument.id === document.id ? updater(currentDocument) : currentDocument,
        ),
      );
    },
    [document.id],
  );

  const addDocumentTab = useCallback((nextDocument: MarkittyDocument, nextMode: EditorMode = 'edit') => {
    setDocuments((currentDocuments) => [...currentDocuments, nextDocument]);
    setActiveDocumentId(nextDocument.id);
    setRequestedMode(nextMode);
    window.setTimeout(() => editorRef.current?.focus(), 0);
  }, []);

  const addDocumentTabs = useCallback(
    (nextDocuments: MarkittyDocument[], nextMode: EditorMode = 'split') => {
      if (nextDocuments.length === 0) {
        return;
      }

      setDocuments((currentDocuments) => [...currentDocuments, ...nextDocuments]);
      setActiveDocumentId(nextDocuments[nextDocuments.length - 1].id);
      setRequestedMode(nextMode);
      setSaveStatus(`Opened ${nextDocuments[nextDocuments.length - 1].title}`);
      setErrorMessage(null);
      window.setTimeout(() => editorRef.current?.focus(), 0);
    },
    [],
  );

  const runEditorAction = (action: EditorActionId) => {
    setRequestedMode((currentMode) => (currentMode === 'preview' ? 'edit' : currentMode));
    window.setTimeout(() => editorRef.current?.applyAction(action), 0);
  };

  const handleContentChange = (content: string) => {
    setErrorMessage(null);
    setSaveStatus('Draft saved');
    updateActiveDocument((current) => updateDocumentContent(current, content));
  };

  const handleNew = () => {
    addDocumentTab(createNewDocument());
    setSaveStatus('Start scratching some Markdown.');
    setErrorMessage(null);
  };

  const handleOpen = async () => {
    setErrorMessage(null);
    const opened = await openMarkdownFilesFromDevice();
    if (opened.length === 0) {
      return;
    }

    addDocumentTabs(opened.map(documentFromFile), 'split');
  };

  useEffect(() => {
    let isDisposed = false;
    let unlisten: () => void = () => undefined;

    const setupOpenListeners = async () => {
      const initialFiles = await getInitialMarkdownFilesToOpen();
      if (!isDisposed && initialFiles.length > 0) {
        addDocumentTabs(initialFiles.map(documentFromFile), 'split');
      }

      unlisten = await listenForMarkdownFilesToOpen((files) => {
        addDocumentTabs(files.map(documentFromFile), 'split');
      });
    };

    void setupOpenListeners();

    return () => {
      isDisposed = true;
      unlisten();
    };
  }, [addDocumentTabs]);

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    if (event.dataTransfer.types.includes('Files')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = async (event: DragEvent<HTMLElement>) => {
    if (!event.dataTransfer.files.length) {
      return;
    }

    event.preventDefault();
    const openedFiles = await openMarkdownFromDroppedFiles(event.dataTransfer.files);
    addDocumentTabs(openedFiles.map(documentFromFile), 'split');
  };

  const markSaved = (saved: { path?: string; title?: string }) => {
    updateActiveDocument((current) => ({
      ...current,
      path: saved.path ?? current.path,
      title: saved.title ?? current.title,
      isDirty: false,
      updatedAt: new Date().toISOString(),
    }));
    setSaveStatus('Saved. Purrfect.');
  };

  const handleActivateTab = (documentId: string) => {
    setActiveDocumentId(documentId);
    window.setTimeout(() => editorRef.current?.focus(), 0);
  };

  const handleCloseTab = (documentId: string) => {
    if (documents.length === 1) {
      const nextDocument = createNewDocument();
      setDocuments([nextDocument]);
      setActiveDocumentId(nextDocument.id);
      setSaveStatus('Start scratching some Markdown.');
      return;
    }

    const closedIndex = documents.findIndex((currentDocument) => currentDocument.id === documentId);
    const nextDocuments = documents.filter(
      (currentDocument) => currentDocument.id !== documentId,
    );
    setDocuments(nextDocuments);

    if (documentId === activeDocumentId) {
      const nextActiveIndex = Math.max(0, closedIndex - 1);
      setActiveDocumentId(nextDocuments[nextActiveIndex].id);
    }
  };

  const handleSave = async () => {
    setErrorMessage(null);
    try {
      const saved = document.path
        ? await saveMarkdownToDevice(document)
        : await saveMarkdownToNewPath(document);

      if (saved) {
        markSaved(saved);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save this file.');
      setSaveStatus('Save failed');
    }
  };

  const handleSaveAs = async () => {
    setErrorMessage(null);
    try {
      const saved = await saveMarkdownToNewPath(document);
      if (saved) {
        markSaved(saved);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save this file.');
      setSaveStatus('Save failed');
    }
  };

  useEditorShortcuts({
    onAction: runEditorAction,
    onNew: handleNew,
    onOpen: capabilities.canOpenFiles ? handleOpen : undefined,
    onSave: handleSave,
  });

  const showEditor = mode === 'edit' || mode === 'split';
  const showPreview = mode === 'preview' || mode === 'split';

  return (
    <main className="markitty-shell" onDragOver={handleDragOver} onDrop={handleDrop}>
      <header className="command-bar">
        <MarkdownToolbar
          mode={mode}
          requestedMode={requestedMode}
          canUseSplit={capabilities.canUseSplitView}
          canOpenFiles={capabilities.canOpenFiles}
          theme={theme}
          onModeChange={setRequestedMode}
          onAction={runEditorAction}
          onNew={handleNew}
          onOpen={handleOpen}
          onSave={handleSave}
          onSaveAs={handleSaveAs}
          onToggleTheme={toggleTheme}
        />
      </header>

      <DocumentTabs
        documents={documents}
        activeDocumentId={document.id}
        onActivate={handleActivateTab}
        onClose={handleCloseTab}
      />

      <section className="workspace" data-mode={mode}>
        {showEditor ? (
          <MarkdownEditor
            ref={editorRef}
            value={document.content}
            onChange={handleContentChange}
            theme={theme}
          />
        ) : null}
        {showPreview ? <MarkdownPreview content={document.content} /> : null}
      </section>

      <footer className="status-bar">
        <span>{stats.words} words</span>
        <span>{stats.characters} characters</span>
        <span className={document.isDirty ? 'dirty-dot' : 'clean-dot'}>
          {document.isDirty ? 'Unsaved changes' : saveStatus}
        </span>
        {errorMessage ? <span className="status-error">{errorMessage}</span> : null}
      </footer>
    </main>
  );
}
