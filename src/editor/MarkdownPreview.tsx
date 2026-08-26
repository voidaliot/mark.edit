import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { allowAssetPaths } from '../platform/tauriCommands';
import { collectMarkdownResourcePaths, renderMarkdown } from './markdownRenderer';

type MarkdownPreviewProps = {
  content: string;
  documentPath?: string;
  onOpenDocumentPath?: (path: string) => void;
};

export function MarkdownPreview({
  content,
  documentPath,
  onOpenDocumentPath,
}: MarkdownPreviewProps) {
  const resourcePaths = useMemo(
    () => collectMarkdownResourcePaths(content, { documentPath }),
    [content, documentPath],
  );
  const resourcePathKey = resourcePaths.join('\0');
  const [authorizedResourcePathKey, setAuthorizedResourcePathKey] = useState('');
  const html = useMemo(
    () => renderMarkdown(content, { documentPath }),
    [authorizedResourcePathKey, content, documentPath],
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
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
