import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { useTheme } from '../app/themeContext';
import {
  embeddedFilesFromDroppedFiles,
  getInitialMarkdownFilesToOpen,
  listenForEmbeddedFilesToDrop,
  listenForMarkdownFilesToOpen,
  openMarkdownFilesFromDevice,
  openMarkdownFromDroppedFiles,
  pickFilesForEmbedding,
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
import { createEmbeddedMarkdown, isImagePath } from './embeddedMarkdown';
import {
  clampSplitEditorPercent,
  defaultSplitEditorPercent,
  loadSplitEditorPercent,
  maxSplitEditorPercent,
  minSplitEditorPercent,
  saveSplitEditorPercent,
} from './splitView';

type WorkspaceState = {
  documents: MarkittyDocument[];
  activeDocumentId: string;
};

function documentPathKey(path?: string) {
  return path ? path.replace(/\\/g, '/').toLowerCase() : undefined;
}

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
  const workspaceRef = useRef<HTMLElement>(null);
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
  const documentsRef = useRef(documents);
  const [requestedMode, setRequestedMode] = useState<EditorMode>('split');
  const [splitEditorPercent, setSplitEditorPercent] = useState(loadSplitEditorPercent);
  const [resizingPointerId, setResizingPointerId] = useState<number | null>(null);
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
    documentsRef.current = documents;
  }, [documents]);

  useEffect(() => {
    saveWorkspaceDraft({ documents, activeDocumentId: document.id });
  }, [activeDocumentId, document.id, documents]);

  useEffect(() => {
    saveSplitEditorPercent(splitEditorPercent);
  }, [splitEditorPercent]);

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
    setDocuments((currentDocuments) => {
      const updatedDocuments = [...currentDocuments, nextDocument];
      documentsRef.current = updatedDocuments;
      return updatedDocuments;
    });
    setActiveDocumentId(nextDocument.id);
    setRequestedMode(nextMode);
    window.setTimeout(() => editorRef.current?.focus(), 0);
  }, []);

  const addDocumentTabs = useCallback(
    (nextDocuments: MarkittyDocument[], nextMode: EditorMode = 'split') => {
      if (nextDocuments.length === 0) {
        return;
      }

      const currentDocuments = documentsRef.current;
      const existingByPath = new Map<string, MarkittyDocument>();
      currentDocuments.forEach((currentDocument) => {
        const key = documentPathKey(currentDocument.path);
        if (key) {
          existingByPath.set(key, currentDocument);
        }
      });

      const documentsToAdd = nextDocuments.filter((nextDocument) => {
        const key = documentPathKey(nextDocument.path);
        if (!key) {
          return true;
        }

        if (existingByPath.has(key)) {
          return false;
        }

        existingByPath.set(key, nextDocument);
        return true;
      });
      const nextActiveDocument = [...nextDocuments]
        .reverse()
        .map((nextDocument) => {
          const key = documentPathKey(nextDocument.path);
          return key ? existingByPath.get(key) : nextDocument;
        })
        .find((nextDocument): nextDocument is MarkittyDocument => Boolean(nextDocument));

      if (!nextActiveDocument) {
        return;
      }

      if (documentsToAdd.length > 0) {
        const updatedDocuments = [...currentDocuments, ...documentsToAdd];
        documentsRef.current = updatedDocuments;
        setDocuments(updatedDocuments);
      }

      setActiveDocumentId(nextActiveDocument.id);
      setRequestedMode(nextMode);
      setSaveStatus(`Opened ${nextActiveDocument.title}`);
      setErrorMessage(null);
      window.setTimeout(() => editorRef.current?.focus(), 0);
    },
    [],
  );

  const runEditorAction = (action: EditorActionId) => {
    setRequestedMode((currentMode) => (currentMode === 'preview' ? 'edit' : currentMode));
    window.setTimeout(() => editorRef.current?.applyAction(action), 0);
  };

  const insertEmbeddedFiles = useCallback(
    (
      files: Array<{ title: string; path: string }>,
      preferredKind: 'auto' | 'file' | 'image' = 'auto',
    ) => {
      if (files.length === 0) {
        return;
      }

      const kind =
        preferredKind === 'auto'
          ? files.every((file) => isImagePath(file.path))
            ? 'image'
            : 'file'
          : preferredKind;
      const markdown = createEmbeddedMarkdown(files, kind, document.path);
      setRequestedMode((currentMode) => (currentMode === 'preview' ? 'edit' : currentMode));
      window.setTimeout(() => editorRef.current?.insertMarkdown(markdown), 0);
    },
    [document.path],
  );

  const handleEmbedImage = async () => {
    setErrorMessage(null);
    try {
      insertEmbeddedFiles(await pickFilesForEmbedding('image'), 'image');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to insert this picture.');
    }
  };

  const handleEmbedFile = async () => {
    setErrorMessage(null);
    try {
      insertEmbeddedFiles(await pickFilesForEmbedding('file'), 'file');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to attach this file.');
    }
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

  const handleOpenError = useCallback((error: Error) => {
    setErrorMessage(error.message);
    setSaveStatus('Open failed');
  }, []);

  const handleOpen = async () => {
    setErrorMessage(null);
    try {
      const opened = await openMarkdownFilesFromDevice();
      if (opened.length === 0) {
        return;
      }

      addDocumentTabs(opened.map(documentFromFile), 'split');
    } catch (error) {
      handleOpenError(error instanceof Error ? error : new Error('Unable to open this file.'));
    }
  };

  useEffect(() => {
    let isDisposed = false;
    let unlisten: () => void = () => undefined;

    const setupOpenListeners = async () => {
      try {
        const initialFiles = await getInitialMarkdownFilesToOpen();
        if (!isDisposed && initialFiles.length > 0) {
          addDocumentTabs(initialFiles.map(documentFromFile), 'split');
        }
      } catch (error) {
        if (!isDisposed) {
          handleOpenError(error instanceof Error ? error : new Error('Unable to open this file.'));
        }
      }

      if (isDisposed) {
        return;
      }

      unlisten = await listenForMarkdownFilesToOpen(
        (files) => {
          addDocumentTabs(files.map(documentFromFile), 'split');
        },
        (error) => {
          if (!isDisposed) {
            handleOpenError(error);
          }
        },
      );
    };

    void setupOpenListeners();

    return () => {
      isDisposed = true;
      unlisten();
    };
  }, [addDocumentTabs, handleOpenError]);

  useEffect(() => {
    let isDisposed = false;
    let unlisten: () => void = () => undefined;

    const setupDropListener = async () => {
      unlisten = await listenForEmbeddedFilesToDrop((files) => {
        if (!isDisposed) {
          insertEmbeddedFiles(files, 'auto');
        }
      });
    };

    void setupDropListener();

    return () => {
      isDisposed = true;
      unlisten();
    };
  }, [insertEmbeddedFiles]);

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
    const embeddedFiles = embeddedFilesFromDroppedFiles(event.dataTransfer.files);
    addDocumentTabs(openedFiles.map(documentFromFile), 'split');
    insertEmbeddedFiles(embeddedFiles, 'auto');
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

  const resizeSplitAtClientX = useCallback((clientX: number) => {
    const workspace = workspaceRef.current;
    if (!workspace) {
      return;
    }

    const { left, width } = workspace.getBoundingClientRect();
    if (width <= 0) {
      return;
    }

    setSplitEditorPercent(clampSplitEditorPercent(((clientX - left) / width) * 100));
  }, []);

  const adjustSplitBy = useCallback((delta: number) => {
    setSplitEditorPercent((currentPercent) => clampSplitEditorPercent(currentPercent + delta));
  }, []);

  const handleSplitPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizingPointerId(event.pointerId);
    resizeSplitAtClientX(event.clientX);
  };

  const handleSplitPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== resizingPointerId) {
      return;
    }

    resizeSplitAtClientX(event.clientX);
  };

  const finishSplitPointerResize = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== resizingPointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setResizingPointerId(null);
  };

  const handleSplitKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 5;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      adjustSplitBy(-step);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      adjustSplitBy(step);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setSplitEditorPercent(minSplitEditorPercent);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setSplitEditorPercent(maxSplitEditorPercent);
    }
  };

  const resetSplitSize = () => {
    setSplitEditorPercent(defaultSplitEditorPercent);
  };

  useEditorShortcuts({
    onAction: runEditorAction,
    onNew: handleNew,
    onOpen: capabilities.canOpenFiles ? handleOpen : undefined,
    onSave: handleSave,
  });

  const showEditor = mode === 'edit' || mode === 'split';
  const showPreview = mode === 'preview' || mode === 'split';
  const splitWorkspaceStyle =
    mode === 'split'
      ? ({ '--split-editor-percent': `${splitEditorPercent}%` } as CSSProperties)
      : undefined;
  const roundedSplitEditorPercent = Math.round(splitEditorPercent);

  return (
    <main className="markitty-shell" onDragOver={handleDragOver} onDrop={handleDrop}>
      <header className="command-bar">
        <MarkdownToolbar
          mode={mode}
          requestedMode={requestedMode}
          canUseSplit={capabilities.canUseSplitView}
          canOpenFiles={capabilities.canOpenFiles}
          canEmbedFiles={capabilities.canOpenFiles}
          theme={theme}
          onModeChange={setRequestedMode}
          onAction={runEditorAction}
          onEmbedFile={handleEmbedFile}
          onEmbedImage={handleEmbedImage}
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

      <section
        className={`workspace ${resizingPointerId === null ? '' : 'is-resizing'}`.trim()}
        data-mode={mode}
        ref={workspaceRef}
        style={splitWorkspaceStyle}
      >
        {showEditor ? (
          <MarkdownEditor
            ref={editorRef}
            value={document.content}
            onChange={handleContentChange}
            theme={theme}
          />
        ) : null}
        {mode === 'split' ? (
          <div
            className="split-resize-handle"
            role="separator"
            aria-label="Resize editor and preview"
            aria-orientation="vertical"
            aria-valuemin={minSplitEditorPercent}
            aria-valuemax={maxSplitEditorPercent}
            aria-valuenow={roundedSplitEditorPercent}
            aria-valuetext={`${roundedSplitEditorPercent}% editor, ${
              100 - roundedSplitEditorPercent
            }% preview`}
            tabIndex={0}
            title="Resize editor and preview"
            onDoubleClick={resetSplitSize}
            onKeyDown={handleSplitKeyDown}
            onPointerCancel={finishSplitPointerResize}
            onPointerDown={handleSplitPointerDown}
            onPointerMove={handleSplitPointerMove}
            onPointerUp={finishSplitPointerResize}
          />
        ) : null}
        {showPreview ? (
          <MarkdownPreview content={document.content} documentPath={document.path} />
        ) : null}
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
