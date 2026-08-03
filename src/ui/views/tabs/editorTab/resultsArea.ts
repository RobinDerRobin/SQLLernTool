import { escapeHtml } from '../../../../domain/text/escapeHtml';
import type { ExecuteAndValidateOutcome } from '../../../../runtime/sql/executeAndValidate';
import { renderResultsTable, renderStars } from '../../../render/format';

/**
 * The three-way status distinction from the prototype:
 * SQL error → error; ran but validation failed → warning; ran and validated → ok.
 */
export function renderRunOutcome(outcome: ExecuteAndValidateOutcome, stars: number): string {
  if (outcome.error) {
    return `<span class="status-line status-err">Fehler: ${escapeHtml(outcome.error)}</span>`;
  }

  const status = outcome.ok
    ? `<span class="status-line status-ok">✓ Aufgabe erfüllt${outcome.message ? ` — ${escapeHtml(outcome.message)}` : ''}<span class="status-stars">${renderStars(stars)}</span></span>`
    : `<span class="status-line status-warn">Query lief ohne SQL-Fehler, aber: ${escapeHtml(outcome.message)}</span>`;

  const body = outcome.results.length
    ? renderResultsTable(outcome.last)
    : '<div class="empty-state">Kein tabellarisches Ergebnis (Statement ohne SELECT-Rückgabe).</div>';

  return `${status}${body}`;
}
