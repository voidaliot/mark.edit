import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { allowAssetPaths } from '../platform/tauriCommands';
import { DiagramPreview } from '../markdown/diagrams/DiagramPreview';
import { collectMarkdownResourcePaths, renderMarkdownPreview, type MarkdownPreviewDocument } from './markdownRenderer';

type MarkdownPreviewProps = {
  content: string;
  documentPath?: string;
  documentTitle?: string;
  onOpenDocumentPath?: (path: string) => void;
};

export function MarkdownPreview({
  content,
  documentPath,
  documentTitle = 'diagram',
  onOpenDocumentPath,
}: MarkdownPreviewProps) {
  const resourcePaths = useMemo(
    () => collectMarkdownResourcePaths(content, { documentPath }),
    [content, documentPath],
  );
  const resourcePathKey = resourcePaths.join('\0');
  const [authorizedResourcePathKey, setAuthorizedResourcePathKey] = useState('');
  const preview = useMemo(
    () => renderMarkdownPreview(content, { documentPath }),
    [content, documentPath],
  );

  useEffect(() => {
    let isDisposed = false;

    allowAssetPaths(resourcePaths)
      .catch((error) => {
        console.warn('Unable to authorize local preview resources.', error);
      })
      .finally(() => {
        if (!isDisposed) {
          setAuthorizedResourcePathKey(resourcePathKey);
        }
      });

    return () => {
      isDisposed = true;
    };
  }, [resourcePathKey, resourcePaths]);

  const handlePreviewClick = (event: MouseEvent<HTMLElement>) => {
    if (!onOpenDocumentPath) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const link = target.closest<HTMLAnchorElement>('a[data-markitty-open-path]');
    const path = link?.dataset.markittyOpenPath;
    if (!path) {
      return;
    }

    event.preventDefault();
    onOpenDocumentPath(path);
  };

  if (!content.trim()) {
    return (
      <article className="preview-pane preview-empty">
        <p>No document open. The cat is waiting.</p>
        <p>Start scratching some Markdown.</p>
      </article>
    );
  }

  return (
    <article
      key={authorizedResourcePathKey}
      className="preview-pane markdown-preview"
      aria-label="Rendered Markdown preview"
      onClick={handlePreviewClick}
    >
      <MarkdownContent key={preview.html} preview={preview} title={documentTitle} />
    </article>
  );
}

function MarkdownContent({ preview, title }: { preview: MarkdownPreviewDocument; title: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [slots, setSlots] = useState<HTMLElement[]>([]);
  // Keep this host subtree stable when portals mount. Reassigning innerHTML
  // would detach the slots that React is about to populate.
  const markup = useMemo(() => (
    <div className="markdown-content" ref={rootRef} dangerouslySetInnerHTML={{ __html: preview.html }} />
  ), [preview.html]);
  useLayoutEffect(() => {
    setSlots(Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-markitty-diagram]') ?? []));
  }, [preview]);
  return (
    <>
      {markup}
      {slots.map((slot) => {
        const index = preview.diagrams.findIndex((diagram) => diagram.id === slot.dataset.markittyDiagram);
        const diagram = preview.diagrams[index];
        return diagram ? createPortal(<DiagramPreview diagram={diagram} index={index} title={title} />, slot, diagram.id) : null;
      })}
    </>
  );
}
