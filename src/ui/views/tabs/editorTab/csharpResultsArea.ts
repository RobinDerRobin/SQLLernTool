import { escapeHtml } from '../../../../domain/text/escapeHtml';
import type { CSharpExecuteAndValidateOutcome } from '../../../../runtime/csharp/executeAndValidate';
import { renderStars } from '../../../render/format';

/**
 * C#'s equivalent of resultsArea.ts's renderRunOutcome / pythonResultsArea.ts's
 * renderPythonRunOutcome — stdout-only, no variables table. Unlike Python, a compiled C#
 * program's locals aren't reflectable after Main returns (see docs/csharp-engine-poc.md's
 * validate() design decision, 2026-08-09), so there is nothing analogous to Python's variables
 * block to render here.
 */
export function renderCSharpRunOutcome(outcome: CSharpExecuteAndValidateOutcome, stars: number): string {
  if (outcome.error) {
    return `<span class="status-line status-err">Fehler:\n${escapeHtml(outcome.error)}</span>`;
  }

  const status = outcome.ok
    ? `<span class="status-line status-ok">✓ Aufgabe erfüllt${outcome.message ? ` — ${escapeHtml(outcome.message)}` : ''}<span class="status-stars">${renderStars(stars)}</span></span>`
    : `<span class="status-line status-warn">Programm lief ohne Fehler, aber: ${escapeHtml(outcome.message)}</span>`;

  const stdout = outcome.result?.stdout ?? '';
  const stdoutBlock = stdout
    ? `<div class="results-label" style="margin-top:10px;">Ausgabe (stdout)</div><pre>${escapeHtml(stdout)}</pre>`
    : '<div class="empty-state">Keine Ausgabe (kein Console.WriteLine).</div>';

  return `${status}${stdoutBlock}`;
}

export function renderCSharpLoadingOutcome(): string {
  return '<div class="empty-state">C#-Umgebung wird geladen …</div>';
}
