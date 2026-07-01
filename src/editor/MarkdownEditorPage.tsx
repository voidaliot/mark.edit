import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FilePlus2,
  FolderOpen,
  Moon,
  Save,
  Sun,
} from 'lucide-react';
import { useTheme } from '../app/themeContext';
import {
  openMarkdownFromDevice,
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
import { IconButton } from '../shared/components/IconButton';
import { MarkittyIcon } from '../shared/components/MarkittyIcon';
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

  const updateActiveDocument = (updater: (document: MarkittyDocument) => MarkittyDocument) => {
    setDocuments((currentDocuments) =>
      currentDocuments.map((currentDocument) =>
        currentDocument.id === document.id ? updater(currentDocument) : currentDocument,
      ),
    );
  };

  const addDocumentTab = (nextDocument: MarkittyDocument, nextMode: EditorMode = 'edit') => {
    setDocuments((currentDocuments) => [...currentDocuments, nextDocument]);
    setActiveDocumentId(nextDocument.id);
    setRequestedMode(nextMode);
    window.setTimeout(() => editorRef.current?.focus(), 0);
  };

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
    const opened = await openMarkdownFromDevice();
    if (!opened) {
      return;
    }

    addDocumentTab(documentFromFile(opened), 'split');
    setSaveStatus(`Opened ${opened.title}`);
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
    <main className="markitty-shell">
      <DocumentTabs
        documents={documents}
        activeDocumentId={document.id}
        onActivate={handleActivateTab}
        onClose={handleCloseTab}
        onNew={handleNew}
      />

      <header className="command-bar">
        <div className="brand-lockup" aria-label="Markitty">
          <span className="brand-mark">
            <MarkittyIcon size={22} />
          </span>
          <div>
            <h1>Markitty</h1>
            <p>Markdown editor with claws.</p>
          </div>
        </div>

        <MarkdownToolbar
          mode={mode}
          requestedMode={requestedMode}
          canUseSplit={capabilities.canUseSplitView}
          onModeChange={setRequestedMode}
          onAction={runEditorAction}
        />

        <div className="app-actions" aria-label="Document actions">
          <IconButton label="New document" onClick={handleNew}>
            <FilePlus2 size={18} aria-hidden="true" />
          </IconButton>
          <IconButton
            label="Open Markdown file"
            onClick={handleOpen}
            disabled={!capabilities.canOpenFiles}
          >
            <FolderOpen size={18} aria-hidden="true" />
          </IconButton>
          <IconButton label="Save document" onClick={handleSave}>
            <Save size={18} aria-hidden="true" />
          </IconButton>
          <button type="button" className="save-as-button" onClick={handleSaveAs}>
            Save as
          </button>
          <IconButton
            label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? (
              <Sun size={18} aria-hidden="true" />
            ) : (
              <Moon size={18} aria-hidden="true" />
            )}
          </IconButton>
        </div>
      </header>

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
