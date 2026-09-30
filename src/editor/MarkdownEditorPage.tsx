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
import { WindowTitlebar } from '../platform/WindowTitlebar';
import { CloseDocumentDialog } from './CloseDocumentDialog';
import {
  embeddedFilesFromDroppedFiles,
  getInitialMarkdownFilesToOpen,
  listenForEmbeddedFilesToDrop,
  listenForMarkdownFilesToOpen,
  openMarkdownFilesFromDevice,
  openMarkdownFromDroppedFiles,
  openMarkdownFromPaths,
  pickFilesForEmbedding,
  saveMarkdownToDevice,
  saveMarkdownToNewPath,
} from '../storage/fileSystem';
import {
  createNewDocument,
  documentFromFile,
  markDocumentSaved,
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
import { openWebUrl } from '../platform/webLinks';
import { DocumentTabs } from './DocumentTabs';
import {
  normalizeEditorMode,
  type EditorActionId,
  type EditorMode,
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draftFailed, setDraftFailed] = useState(false);
  const [closingDocumentId, setClosingDocumentId] = useState<string | null>(null);
  const [closingBusy, setClosingBusy] = useState(false);
  const [closingError, setClosingError] = useState<string | null>(null);
  const savingIdsRef = useRef(new Set<string>());
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
  const { theme } = useTheme();
  const documentIds = useMemo(() => documents.map((current) => current.id), [documents]);
  const closingDocument = documents.find((current) => current.id === closingDocumentId);

  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  useEffect(() => {
    setDraftFailed(!saveWorkspaceDraft({ documents, activeDocumentId: document.id }));
  }, [activeDocumentId, document.id, documents]);

  useEffect(() => {
    if (!draftFailed) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (documentsRef.current.some((current) => current.isDirty)) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [draftFailed]);

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
      setErrorMessage(null);
      window.setTimeout(() => editorRef.current?.focus(), 0);
    },
    [],
  );

  const runEditorAction = (action: EditorActionId) => {
    setRequestedMode((currentMode) => (currentMode === 'preview' ? 'edit' : currentMode));
    window.setTimeout(() => editorRef.current?.applyAction(action), 0);
  };

  const handleUndo = () => {
    editorRef.current?.undo();
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
    updateActiveDocument((current) => updateDocumentContent(current, content));
  };

  const handleNew = () => {
    addDocumentTab(createNewDocument());
    setErrorMessage(null);
  };

  const handleOpenError = useCallback((error: Error) => {
    setErrorMessage(error.message);
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

  const handleOpenPreviewDocument = useCallback(
    async (path: string) => {
      setErrorMessage(null);
      try {
        const opened = await openMarkdownFromPaths([path]);
        if (opened.length === 0) {
          return;
        }

        addDocumentTabs(opened.map(documentFromFile), 'split');
      } catch (error) {
        handleOpenError(error instanceof Error ? error : new Error('Unable to open this file.'));
      }
    },
    [addDocumentTabs, handleOpenError],
  );

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

      const cleanup = await listenForMarkdownFilesToOpen(
        (files) => {
          if (!isDisposed) addDocumentTabs(files.map(documentFromFile), 'split');
        },
        (error) => {
          if (!isDisposed) {
            handleOpenError(error);
          }
        },
      );
      if (isDisposed) cleanup();
      else unlisten = cleanup;
    };

    void setupOpenListeners().catch((error) => {
      if (!isDisposed) handleOpenError(error instanceof Error ? error : new Error('Unable to listen for file opens.'));
    });

    return () => {
      isDisposed = true;
      unlisten();
    };
  }, [addDocumentTabs, handleOpenError]);

  useEffect(() => {
    let isDisposed = false;
    let unlisten: () => void = () => undefined;

    const setupDropListener = async () => {
      const cleanup = await listenForEmbeddedFilesToDrop((files) => {
        if (!isDisposed) {
          insertEmbeddedFiles(files, 'auto');
        }
      });
      if (isDisposed) cleanup();
      else unlisten = cleanup;
    };

    void setupDropListener().catch(() => {
      if (!isDisposed) setErrorMessage('Unable to listen for dropped files.');
    });

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
    try {
      const openedFiles = await openMarkdownFromDroppedFiles(event.dataTransfer.files);
      const embeddedFiles = embeddedFilesFromDroppedFiles(event.dataTransfer.files);
      addDocumentTabs(openedFiles.map(documentFromFile), 'split');
      insertEmbeddedFiles(embeddedFiles, 'auto');
    } catch (error) {
      handleOpenError(error instanceof Error ? error : new Error('Unable to open dropped files.'));
    }
  };

  const handleActivateTab = (documentId: string) => {
    setActiveDocumentId(documentId);
  };

  const closeTabNow = (documentId: string) => {
    const currentDocuments = documentsRef.current;
    const closedIndex = currentDocuments.findIndex((current) => current.id === documentId);
    if (closedIndex < 0) return;
    const nextDocuments = currentDocuments.filter((current) => current.id !== documentId);
    if (!nextDocuments.length) {
      nextDocuments.push(createNewDocument());
      setRequestedMode('edit');
    }
    documentsRef.current = nextDocuments;
    setDocuments(nextDocuments);
    if (documentId === activeDocumentId) {
      setActiveDocumentId(nextDocuments[Math.max(0, closedIndex - 1)].id);
    }
    setClosingDocumentId(null);
    setErrorMessage(null);
    requestAnimationFrame(() => window.document.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')?.focus());
  };

  const handleCloseTab = (documentId: string) => {
    const target = documentsRef.current.find((current) => current.id === documentId);
    if (!target) return;
    if (target.isDirty) {
      setClosingError(null);
      setClosingDocumentId(documentId);
    } else closeTabNow(documentId);
  };

  const saveDocument = async (snapshot: MarkittyDocument, saveAs = false) => {
    if (savingIdsRef.current.has(snapshot.id)) return false;
    savingIdsRef.current.add(snapshot.id);
    setErrorMessage(null);
    try {
      const saved = snapshot.path && !saveAs
        ? await saveMarkdownToDevice(snapshot)
        : await saveMarkdownToNewPath(snapshot);
      if (!saved) return false;
      const current = documentsRef.current.find((item) => item.id === snapshot.id);
      if (!current) return false;
      const updated = documentsRef.current.map((item) =>
        item.id === snapshot.id ? markDocumentSaved(item, snapshot, saved) : item,
      );
      documentsRef.current = updated;
      setDocuments(updated);
      return current.content === snapshot.content;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save this file.';
      setErrorMessage(message);
      setClosingError(message);
      return false;
    } finally {
      savingIdsRef.current.delete(snapshot.id);
    }
  };

  const handleSave = () => saveDocument(document);
  const handleSaveAs = () => saveDocument(document, true);

  const handleSaveAndClose = async () => {
    if (!closingDocument || closingBusy) return;
    setClosingBusy(true);
    setClosingError(null);
    try {
      if (await saveDocument(closingDocument)) {
        closeTabNow(closingDocument.id);
      }
    } finally {
      setClosingBusy(false);
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
    enabled: !closingDocument,
    onAction: runEditorAction,
    onNew: handleNew,
    onOpen: capabilities.canOpenFiles ? handleOpen : undefined,
    onSave: handleSave,
    onSaveAs: handleSaveAs,
    onClose: () => handleCloseTab(document.id),
    onNextTab: (direction) => {
      const index = documents.findIndex((current) => current.id === document.id);
      setActiveDocumentId(documents[(index + direction + documents.length) % documents.length].id);
    },
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
      <WindowTitlebar title={`${document.isDirty ? '• ' : ''}${document.title}`} onError={setErrorMessage}>
        <DocumentTabs
          documents={documents}
          activeDocumentId={document.id}
          onActivate={handleActivateTab}
          onClose={handleCloseTab}
          onNew={handleNew}
        />
      </WindowTitlebar>
      <div className="command-bar">
        <MarkdownToolbar
          mode={mode}
          canUseSplit={capabilities.canUseSplitView}
          canOpenFiles={capabilities.canOpenFiles}
          canEmbedFiles={capabilities.canOpenFiles}
          onModeChange={setRequestedMode}
          onAction={runEditorAction}
          onEmbedFile={handleEmbedFile}
          onEmbedImage={handleEmbedImage}
          onOpen={handleOpen}
          onSave={handleSave}
          onSaveAs={handleSaveAs}
          onUndo={handleUndo}
        />
      </div>

      {errorMessage || draftFailed ? (
        <div className="error-banner" role="alert">
          <span>{errorMessage ?? 'Draft recovery is unavailable. Save your work to a file before closing the app.'}</span>
          {errorMessage ? <button type="button" onClick={() => setErrorMessage(null)}>Dismiss</button> : null}
        </div>
      ) : null}

      <section
        className={`workspace ${resizingPointerId === null ? '' : 'is-resizing'}`.trim()}
        data-mode={mode}
        id="document-panel"
        role="tabpanel"
        aria-labelledby={`tab-${document.id}`}
        ref={workspaceRef}
        style={splitWorkspaceStyle}
      >
        <MarkdownEditor
          ref={editorRef}
          documentId={document.id}
          documentIds={documentIds}
          hidden={!showEditor}
          value={document.content}
          onChange={handleContentChange}
          theme={theme}
        />
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
          <MarkdownPreview
            content={document.content}
            documentPath={document.path}
            documentTitle={document.title}
            onOpenDocumentPath={handleOpenPreviewDocument}
            onOpenWebLink={(url) => {
              void openWebUrl(url).catch((error) => setErrorMessage(error instanceof Error ? error.message : 'Unable to open this link.'));
            }}
          />
        ) : null}
      </section>

      <footer className="status-bar">
        <span className="document-location" title={document.path ?? document.title}>{document.path ?? document.title}</span>
        <span>{stats.words} words</span>
        <span>{stats.characters} characters</span>
        <span role="status" className={document.isDirty ? 'dirty-dot' : 'clean-dot'}>
          {document.isDirty ? 'Unsaved changes' : document.path ? 'Saved' : document.content ? 'Draft saved' : 'Ready'}
        </span>
      </footer>
      {closingDocument ? (
        <CloseDocumentDialog
          title={closingDocument.title}
          busy={closingBusy}
          error={closingError}
          onCancel={() => setClosingDocumentId(null)}
          onDiscard={() => closeTabNow(closingDocument.id)}
          onSave={handleSaveAndClose}
        />
      ) : null}
    </main>
  );
}
