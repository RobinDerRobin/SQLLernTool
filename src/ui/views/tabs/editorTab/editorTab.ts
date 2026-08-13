import { createDomEditor, type DomEditor } from '../../../../editor/domEditor';
import { csharpLanguagePlugin } from '../../../../editor/languages/csharp/csharpLanguagePlugin';
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
import { renderCSharpLoadingOutcome, renderCSharpRunOutcome } from './csharpResultsArea';
import { renderPythonLoadingOutcome, renderPythonRunOutcome } from './pythonResultsArea';
import { renderRunOutcome } from './resultsArea';
import { mountTablesPanel } from './tablesPanel';

const SHELL_HTML = `
  <div class="editor-wrap">
    <div class="expected-result-banner"></div>
    <div class="python-engine-status" role="status"></div>
    <div class="editor-toolbar">
      <span class="label">SQL</span>
      <div class="toolbar-actions">
        <button type="button" class="btn tables-toggle-btn" aria-expanded="false">Tabellen</button>
        <span class="hint">Strg/Cmd + Enter</span>
        <button type="button" class="run-btn">▶ Ausführen</button>
      </div>
    </div>
    <div class="tables-panel"></div>
    <div class="editor-shell">
      <div class="line-numbers"></div>
      <div class="code-wrap">
        <pre class="highlight-layer"></pre>
        <textarea class="editor" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="SQL-Code-Editor"></textarea>
      </div>
    </div>
  </div>
  <div class="results-wrap">
    <div class="results-label">Ergebnis</div>
    <div class="results-body" role="status"><div class="empty-state">Noch keine Query ausgeführt.</div></div>
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
 * Surfaces a lazily-loaded engine's load state right in the editor — without
 * this, a failed or CSP-blocked Pyodide/C#-engine load was previously
 * invisible until the user happened to click "Ausführen" and saw a generic
 * "wird geladen" result. `label` is the German name shown in the banner
 * ("Python"/"C#"); shared by both Python and C# since the status shape and
 * rendering are otherwise identical.
 */
function renderEngineStatus(status: PythonEngineStatus, label: string): string {
  if (status === 'idle' || status === 'ready') return '';
  if (status === 'loading') return `<div class="loading-banner">${label}-Umgebung wird geladen …</div>`;
  return `<div class="loading-banner loading-banner-error">${label}-Umgebung konnte nicht geladen werden: ${escapeHtml(status.error)}</div>`;
}

function placeholderFor(title: string, trackId: string): string {
  const comment = trackId === 'python' ? '#' : trackId === 'csharp' ? '//' : '--';
  return `${comment} Schreib hier deine Lösung für: ${title}\n`;
}

function pluginForTrack(trackId: string): LanguagePlugin {
  if (trackId === 'python') return pythonLanguagePlugin;
  if (trackId === 'csharp') return csharpLanguagePlugin;
  return sqlLanguagePlugin;
}

/**
 * Owns the code editor instance. The editor's DOM (textarea/overlay/gutter) is
 * created once and never re-rendered — only its *content* is swapped when the
 * user opens a different challenge within the same track, so the caret,
 * scroll position and event bindings all survive. Switching *track* (SQL /
 * Python / C#) is the one case that needs a different `LanguagePlugin`; since
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

  async function run(): Promise<void> {
    const state = ctx.store.getState();
    const selection = state.session.selection;
    if (!selection) return;
    const code = activeEditor.getValue();
    if (!code.trim()) return;

    const outcome = await runQuery(ctx, code);

    // C#'s real compile+run is the only branch slow enough for the user to
    // have navigated elsewhere by the time it resolves — dropping a stale
    // result here instead of overwriting whatever challenge is now open.
    const currentSelection = ctx.store.getState().session.selection;
    if (
      !currentSelection ||
      currentSelection.trackId !== selection.trackId ||
      currentSelection.courseId !== selection.courseId ||
      currentSelection.challengeNum !== selection.challengeNum
    ) {
      return;
    }

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
    } else if (outcome.kind === 'csharp') {
      showResults(renderCSharpRunOutcome(outcome, stars));
    } else if (outcome.kind === 'csharp-loading') {
      showResults(renderCSharpLoadingOutcome());
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
    const trackLabel = isSql ? 'SQL' : trackId === 'csharp' ? 'C#' : 'Python';
    toolbarLabel.textContent = trackLabel;
    textarea.setAttribute('aria-label', `${trackLabel}-Code-Editor`);
    tablesToggleBtn.style.display = isSql ? '' : 'none';
    if (!isSql) {
      tablesPanel.classList.remove('open');
      tablesToggleBtn.setAttribute('aria-expanded', 'false');
    }
  }

  const unmountTables = mountTablesPanel(tablesPanel, ctx);

  const offToggle = on(root, 'click', '.tables-toggle-btn', () => {
    const nowOpen = tablesPanel.classList.toggle('open');
    tablesToggleBtn.setAttribute('aria-expanded', String(nowOpen));
  });
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

  let lastRenderedEngineStatusHtml: string | null = null;
  function syncEngineStatus(): void {
    const state = ctx.store.getState();
    const trackId = state.session.selection?.trackId;
    const html =
      trackId === 'python'
        ? renderEngineStatus(state.session.pythonStatus, 'Python')
        : trackId === 'csharp'
          ? renderEngineStatus(state.session.csharpStatus, 'C#')
          : '';
    if (html === lastRenderedEngineStatusHtml) return;
    lastRenderedEngineStatusHtml = html;
    pythonEngineStatusEl.innerHTML = html;
  }

  const unsubscribe = ctx.store.subscribe(() => {
    syncEditorToSelection();
    syncEngineStatus();
  });
  syncEditorToSelection();
  syncEngineStatus();

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
