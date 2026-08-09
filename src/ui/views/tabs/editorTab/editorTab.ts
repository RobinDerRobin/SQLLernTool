import { createDomEditor, type DomEditor } from '../../../../editor/domEditor';
import type { LanguagePlugin } from '../../../../editor/languages/LanguagePlugin';
import { pythonLanguagePlugin } from '../../../../editor/languages/python/pythonLanguagePlugin';
import { sqlLanguagePlugin } from '../../../../editor/languages/sql/sqlLanguagePlugin';
import { escapeHtml } from '../../../../domain/text/escapeHtml';
import { getChallengeProgress } from '../../../../domain/progress/progressModel';
import { calculateStars } from '../../../../domain/scoring/stars';
import type { AppContext } from '../../../context';
import { runQuery, saveDraft, saveDraftFor } from '../../../state/actions';
import { findChallengeInRegistry } from '../../../state/challengeLookup';
import type { ChallengeSelection, PythonEngineStatus } from '../../../state/sessionState';
import type { Unsubscribe } from '../../../state/store';
import { on } from '../../../util/delegate';
import { renderPythonLoadingOutcome, renderPythonRunOutcome } from './pythonResultsArea';
import { renderRunOutcome } from './resultsArea';
import { mountTablesPanel } from './tablesPanel';

const SHELL_HTML = `
  <div class="editor-wrap">
    <div class="expected-result-banner"></div>
    <div class="python-engine-status"></div>
    <div class="editor-toolbar">
      <span class="label">SQL</span>
      <div class="toolbar-actions">
        <button type="button" class="btn tables-toggle-btn">Tabellen</button>
        <span class="hint">Strg/Cmd + Enter</span>
        <button type="button" class="run-btn">▶ Ausführen</button>
      </div>
    </div>
    <div class="tables-panel"></div>
    <div class="editor-shell">
      <div class="line-numbers"></div>
      <div class="code-wrap">
        <pre class="highlight-layer"></pre>
        <textarea class="editor" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea>
      </div>
    </div>
  </div>
  <div class="results-wrap">
    <div class="results-label">Ergebnis</div>
    <div class="results-body"><div class="empty-state">Noch keine Query ausgeführt.</div></div>
  </div>`;

interface MountedEditorTab {
  editor: DomEditor;
  unmount: Unsubscribe;
}

/** SQL runs a "Query" (feminine); Python runs "Code" (neuter) — the empty-state placeholder before the first run should say the right one, not always "Query". */
function emptyResultsPlaceholder(trackId: string): string {
  const text = trackId === 'sqlite' ? 'Noch keine Query ausgeführt.' : 'Noch kein Code ausgeführt.';
  return `<div class="empty-state">${text}</div>`;
}

/**
 * Restates the challenge's successCriteria directly above the editor —
 * previously this was only visible on the Aufgabe tab, so writing the
 * solution meant either memorizing it or tab-switching back and forth to
 * check what the query/script actually has to return.
 */
function renderExpectedResult(successCriteria: string | undefined): string {
  if (!successCriteria) return '';
  return `
    <div class="success-criteria">
      <div class="sc-label">Erwartetes Ergebnis</div>
      <div class="sc-text">${successCriteria}</div>
    </div>`;
}

/**
 * Surfaces Pyodide's load state right in the editor — without this, a failed
 * or CSP-blocked Pyodide load was previously invisible until the user
 * happened to click "Ausführen" and saw a generic "wird geladen" result.
 */
function renderPythonEngineStatus(status: PythonEngineStatus): string {
  if (status === 'idle' || status === 'ready') return '';
  if (status === 'loading') return '<div class="loading-banner">Python-Umgebung wird geladen …</div>';
  return `<div class="loading-banner loading-banner-error">Python-Umgebung konnte nicht geladen werden: ${escapeHtml(status.error)}</div>`;
}

function placeholderFor(title: string, trackId: string): string {
  const comment = trackId === 'python' ? '#' : '--';
  return `${comment} Schreib hier deine Lösung für: ${title}\n`;
}

function pluginForTrack(trackId: string): LanguagePlugin {
  return trackId === 'python' ? pythonLanguagePlugin : sqlLanguagePlugin;
}

/**
 * Owns the code editor instance. The editor's DOM (textarea/overlay/gutter) is
 * created once and never re-rendered — only its *content* is swapped when the
 * user opens a different challenge within the same track, so the caret,
 * scroll position and event bindings all survive. Switching *track* (SQL <->
 * Python) is the one case that needs a different `LanguagePlugin`; since
 * `createDomEditor` takes its plugin once at construction, the underlying
 * editor instance is destroyed and recreated on the same DOM elements in that
 * case — behind a stable facade, so callers holding onto `editor` (task tab's
 * insert-solution/compare) never see the swap.
 */
export function mountEditorTab(root: HTMLElement, ctx: AppContext): MountedEditorTab {
  root.innerHTML = SHELL_HTML;

  const textarea = root.querySelector<HTMLTextAreaElement>('textarea.editor')!;
  const overlay = root.querySelector<HTMLElement>('.highlight-layer')!;
  const gutter = root.querySelector<HTMLElement>('.line-numbers')!;
  const tablesPanel = root.querySelector<HTMLElement>('.tables-panel')!;
  const tablesToggleBtn = root.querySelector<HTMLElement>('.tables-toggle-btn')!;
  const toolbarLabel = root.querySelector<HTMLElement>('.editor-toolbar .label')!;
  const expectedResultBanner = root.querySelector<HTMLElement>('.expected-result-banner')!;
  const pythonEngineStatusEl = root.querySelector<HTMLElement>('.python-engine-status')!;
  const resultsBody = root.querySelector<HTMLElement>('.results-body')!;

  function showResults(html: string): void {
    resultsBody.innerHTML = html;
  }

  function run(): void {
    const state = ctx.store.getState();
    const selection = state.session.selection;
    if (!selection) return;
    const code = activeEditor.getValue();
    if (!code.trim()) return;

    const outcome = runQuery(ctx, code);
    const progress = getChallengeProgress(
      ctx.store.getState().progress,
      selection.trackId,
      selection.courseId,
      selection.challengeNum,
    );
    const stars = calculateStars(progress);
    if (outcome.kind === 'sql') {
      showResults(renderRunOutcome(outcome, stars));
    } else if (outcome.kind === 'python') {
      showResults(renderPythonRunOutcome(outcome, stars));
    } else if (outcome.kind === 'python-loading') {
      showResults(renderPythonLoadingOutcome());
    }
  }

  let activeTrackId = 'sqlite';
  let activeEditor: DomEditor = createDomEditor({ textarea, overlay, gutter }, pluginForTrack(activeTrackId), {
    onChange: (value) => saveDraft(ctx, value),
    onRun: run,
  });

  // A stable object every external caller (task tab's solutionSection/compareView) holds onto for
  // the whole session — its methods always delegate to whichever underlying editor is current.
  const editorFacade: DomEditor = {
    getValue: () => activeEditor.getValue(),
    setValue: (value) => activeEditor.setValue(value),
    focus: () => activeEditor.focus(),
    destroy: () => activeEditor.destroy(),
  };

  function ensurePluginForTrack(trackId: string): void {
    if (trackId === activeTrackId) return;
    activeTrackId = trackId;
    activeEditor.destroy();
    activeEditor = createDomEditor({ textarea, overlay, gutter }, pluginForTrack(trackId), {
      onChange: (value) => saveDraft(ctx, value),
      onRun: run,
    });
  }

  function syncChromeForTrack(trackId: string): void {
    const isSql = trackId === 'sqlite';
    toolbarLabel.textContent = isSql ? 'SQL' : 'Python';
    tablesToggleBtn.style.display = isSql ? '' : 'none';
    if (!isSql) tablesPanel.classList.remove('open');
  }

  const unmountTables = mountTablesPanel(tablesPanel, ctx);

  const offToggle = on(root, 'click', '.tables-toggle-btn', () => tablesPanel.classList.toggle('open'));
  const offRun = on(root, 'click', '.run-btn', run);

  // Swap the editor's content when the selection changes, flushing the
  // outgoing challenge's text first (the debounced save would otherwise lose
  // whatever was typed in the last 600ms before navigating away).
  let loadedSelection: ChallengeSelection | null = null;

  function syncEditorToSelection(): void {
    const selection = ctx.store.getState().session.selection;
    if (!selection) return;
    const isSame =
      loadedSelection &&
      loadedSelection.trackId === selection.trackId &&
      loadedSelection.courseId === selection.courseId &&
      loadedSelection.challengeNum === selection.challengeNum;
    if (isSame) return;

    // Claim the new selection *before* touching the store: saveDraftFor below
    // notifies subscribers, which re-enters this very function — the updated
    // guard above makes that re-entry a no-op instead of infinite recursion.
    const previous = loadedSelection;
    loadedSelection = selection;

    if (previous) {
      saveDraftFor(ctx, previous.trackId, previous.courseId, previous.challengeNum, editorFacade.getValue());
    }

    ensurePluginForTrack(selection.trackId);
    syncChromeForTrack(selection.trackId);

    const challenge = findChallengeInRegistry(ctx.registry, selection.trackId, selection.courseId, selection.challengeNum);
    const saved = getChallengeProgress(
      ctx.store.getState().progress,
      selection.trackId,
      selection.courseId,
      selection.challengeNum,
    ).draftSql;

    editorFacade.setValue(saved || placeholderFor(challenge?.title ?? selection.challengeNum, selection.trackId));
    expectedResultBanner.innerHTML = renderExpectedResult(challenge?.successCriteria);
    showResults(emptyResultsPlaceholder(selection.trackId));
  }

  let lastRenderedPythonStatus: PythonEngineStatus | null = null;
  function syncPythonEngineStatus(): void {
    const state = ctx.store.getState();
    const status: PythonEngineStatus = state.session.selection?.trackId === 'python' ? state.session.pythonStatus : 'idle';
    if (status === lastRenderedPythonStatus) return;
    lastRenderedPythonStatus = status;
    pythonEngineStatusEl.innerHTML = renderPythonEngineStatus(status);
  }

  const unsubscribe = ctx.store.subscribe(() => {
    syncEditorToSelection();
    syncPythonEngineStatus();
  });
  syncEditorToSelection();
  syncPythonEngineStatus();

  return {
    editor: editorFacade,
    unmount: () => {
      unsubscribe();
      unmountTables();
      offToggle();
      offRun();
      activeEditor.destroy();
    },
  };
}
