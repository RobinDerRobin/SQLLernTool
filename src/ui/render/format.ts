import { escapeHtml } from '../../domain/text/escapeHtml';
import type { SqlResultSet } from '../../runtime/sql/SqlEngine';

const MAX_ROWS_SHOWN = 200;
const MAX_STARS = 3;

export function renderStars(n: number): string {
  const clamped = Math.max(0, Math.min(MAX_STARS, n));
  return '★'.repeat(clamped) + '☆'.repeat(MAX_STARS - clamped);
}

type PlayResultGlyphInput = 'ok' | 'err' | undefined;

/** The sidebar's per-challenge play-result glyph: ✓ / ✗ / blank (never played). */
export function renderResultGlyph(result: PlayResultGlyphInput): string {
  if (result === 'ok') return '<span class="run-result ok">✓</span>';
  if (result === 'err') return '<span class="run-result fail">✗</span>';
  return '<span class="run-result"></span>';
}

/** The editor tab's results table, capped at `cap` rows (matches the prototype's 200-row cap). */
export function renderResultsTable(resultSet: SqlResultSet | null, cap: number = MAX_ROWS_SHOWN): string {
  if (!resultSet || !resultSet.values.length) {
    return '<div class="empty-state">Query erfolgreich, aber 0 Zeilen zurückgegeben.</div>';
  }

  const shown = resultSet.values.slice(0, cap);
  const head = `<thead><tr>${resultSet.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>`;
  const rows = shown
    .map(
      (row) =>
        `<tr>${row.map((v) => `<td>${v === null ? 'NULL' : escapeHtml(String(v))}</td>`).join('')}</tr>`,
    )
    .join('');
  const overflow =
    resultSet.values.length > cap
      ? `<div class="empty-state" style="margin-top:8px;">... ${resultSet.values.length - cap} weitere Zeilen nicht angezeigt.</div>`
      : '';

  return `<table class="result-table">${head}<tbody>${rows}</tbody></table>${overflow}`;
}
