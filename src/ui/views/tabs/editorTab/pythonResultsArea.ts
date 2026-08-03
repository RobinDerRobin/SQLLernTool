import { escapeHtml } from '../../../../domain/text/escapeHtml';
import type { JsonValue } from '../../../../runtime/python/PythonRuntime';
import { renderStars } from '../../../render/format';
import type { RunOutcome } from '../../../state/actions';

function renderVariables(variables: Record<string, JsonValue>): string {
  const entries = Object.entries(variables);
  if (!entries.length) {
    return '<div class="empty-state">Keine Variablen.</div>';
  }
  const rows = entries
    .map(([name, value]) => `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(JSON.stringify(value))}</td></tr>`)
    .join('');
  return `<table class="result-table"><thead><tr><th>Variable</th><th>Wert</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/** Python's equivalent of resultsArea.ts's renderRunOutcome — stdout + variables instead of a SQL result table. */
export function renderPythonRunOutcome(outcome: Extract<RunOutcome, { kind: 'python' }>, stars: number): string {
  if (outcome.error) {
    return `<span class="status-line status-err">Fehler:\n${escapeHtml(outcome.error)}</span>`;
  }

  const status = outcome.ok
    ? `<span class="status-line status-ok">✓ Aufgabe erfüllt${outcome.message ? ` — ${escapeHtml(outcome.message)}` : ''}<span class="status-stars">${renderStars(stars)}</span></span>`
    : `<span class="status-line status-warn">Skript lief ohne Fehler, aber: ${escapeHtml(outcome.message)}</span>`;

  const stdout = outcome.result?.stdout ?? '';
  const stdoutBlock = stdout
    ? `<div class="results-label" style="margin-top:10px;">Ausgabe (stdout)</div><pre>${escapeHtml(stdout)}</pre>`
    : '<div class="empty-state">Keine Ausgabe (kein print()).</div>';
  const variablesBlock = outcome.result
    ? `<div class="results-label" style="margin-top:10px;">Variablen</div>${renderVariables(outcome.result.variables)}`
    : '';

  return `${status}${stdoutBlock}${variablesBlock}`;
}

export function renderPythonLoadingOutcome(): string {
  return '<div class="empty-state">Python-Umgebung wird geladen …</div>';
}
