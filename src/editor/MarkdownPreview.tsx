import { useMemo } from 'react';
import { renderMarkdown } from './markdownRenderer';

type MarkdownPreviewProps = {
  content: string;
  documentPath?: string;
};

export function MarkdownPreview({ content, documentPath }: MarkdownPreviewProps) {
  const html = useMemo(() => renderMarkdown(content, { documentPath }), [content, documentPath]);

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
      className="preview-pane markdown-preview"
      aria-label="Rendered Markdown preview"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
