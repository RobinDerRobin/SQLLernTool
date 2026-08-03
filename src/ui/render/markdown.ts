import { escapeHtml } from '../../domain/text/escapeHtml';

/**
 * Minimal markdown renderer for AI replies, ported from the prototype.
 * Everything is HTML-escaped *first*, so a model reply can never inject
 * markup — the markdown syntax is then applied to the escaped text.
 */
export function renderMarkdown(md: string): string {
  let html = escapeHtml(md);

  html = html.replace(/```([\s\S]*?)```/g, (_m, code: string) => `<pre class="md-code">${code}</pre>`);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/^### (.*)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.*)$/gm, '<h3>$1</h3>');

  html = html.replace(/(^|\n)((?:[-*] .+\n?)+)/g, (_m, pre: string, block: string) => {
    const items = block
      .trim()
      .split('\n')
      .map((line) => `<li>${line.replace(/^[-*]\s+/, '')}</li>`)
      .join('');
    return `${pre}<ul>${items}</ul>`;
  });
  html = html.replace(/(^|\n)((?:\d+\. .+\n?)+)/g, (_m, pre: string, block: string) => {
    const items = block
      .trim()
      .split('\n')
      .map((line) => `<li>${line.replace(/^\d+\.\s+/, '')}</li>`)
      .join('');
    return `${pre}<ol>${items}</ol>`;
  });

  html = html
    .split(/\n{2,}/)
    .map((block) => {
      if (/^<(h3|h4|ul|ol|pre)/.test(block.trim())) return block;
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');

  return `<div class="md">${html}</div>`;
}
