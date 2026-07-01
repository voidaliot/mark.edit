import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';

const markdownRenderer = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

const defaultLinkOpen =
  markdownRenderer.renderer.rules.link_open ??
  ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));

markdownRenderer.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const token = tokens[index];
  const href = token.attrGet('href') ?? '';
  if (/^https?:\/\//i.test(href)) {
    token.attrSet('target', '_blank');
    token.attrSet('rel', 'noopener noreferrer');
  }
  return defaultLinkOpen(tokens, index, options, env, self);
};

export function renderMarkdown(content: string) {
  const rendered = markdownRenderer.render(content);
  return DOMPurify.sanitize(rendered, {
    USE_PROFILES: { html: true },
  });
}
