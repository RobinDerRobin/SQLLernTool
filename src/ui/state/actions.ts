import { buildContext } from '../../chat/buildContext';
import {
  getChallengeProgress,
  getCourseSettings,
  withAppSettings,
  withChallengeProgress,
  withCourseSettings,
  type ChatMessage,
  type ProgressState,
} from '../../domain/progress/progressModel';
import { makeProgressKey } from '../../domain/progress/progressKey';
import { calculateStars } from '../../domain/scoring/stars';
import { hasRealCode } from '../../domain/text/hasRealCode';
import { stripHtml } from '../../domain/text/stripHtml';
import type { PythonChallenge } from '../../content/tracks/python/types';
import { loadPyodideFromCdn } from '../../runtime/python/pyodideEngine';
import { withTimeout } from '../../util/withTimeout';
import { executeAndValidate as executeAndValidatePython } from '../../runtime/python/executeAndValidate';
import type { PythonExecuteAndValidateOutcome } from '../../runtime/python/executeAndValidate';
import type { SqlChallenge } from '../../content/tracks/sqlite/types';
import { executeAndValidate as executeAndValidateSql, type ExecuteAndValidateOutcome } from '../../runtime/sql/executeAndValidate';
import { getGivenTableNames, prepareChallenge } from '../../runtime/sql/prepareChallenge';
import type { SqlJsStatic } from '../../runtime/sql/sqlJsEngine';
import type { CSharpChallenge } from '../../content/tracks/csharp/types';
import { loadCSharpEngineFromServer } from '../../runtime/csharp/csharpEngine';
import { executeAndValidate as executeAndValidateCSharp } from '../../runtime/csharp/executeAndValidate';
import type { CSharpExecuteAndValidateOutcome } from '../../runtime/csharp/executeAndValidate';
import type { AppContext } from '../context';
import {
  getCourseChallenges as getCourseChallengesFromRegistry,
  findChallengeInRegistry,
  getDefaultTrackAndCourse,
} from './challengeLookup';
import {
  withActiveTab,
  withChatDraftPrefill,
  withChatUnread,
  withCSharpStatus,
  withGivenTableNames,
  withInitStatus,
  withPlayResult,
  withPythonStatus,
  withSelection,
  withTablesInfo,
  withThemePickerOpen,
  type ActiveTab,
  type ChallengeSelection,
} from './sessionState';

export type RunOutcome =
  | ({ kind: 'sql' } & ExecuteAndValidateOutcome)
  | ({ kind: 'python' } & PythonExecuteAndValidateOutcome)
  | { kind: 'python-loading' }
  | ({ kind: 'csharp' } & CSharpExecuteAndValidateOutcome)
  | { kind: 'csharp-loading' }
  | { kind: 'none' };

/** Where the Vite dev-server middleware (csharpEngineDevServer in vite.config.ts) serves the published Blazor bundle from. Production hosting location is still undecided (docs/csharp-engine-poc.md), so this is dev-only for now. */
const CSHARP_ENGINE_BASE_URL = '/csharp-engine/';

const SQL_TOOL_DESCRIPTION =
  'Kontext zum Tool, in dem ich gerade arbeite: Eine browserbasierte SQL-Sandbox mit SQLite (sql.js) für Lern-Challenges. ' +
  "Tab rückt ein, Enter übernimmt die Einrückung der vorigen Zeile (außer diese endet mit ';', dann startet die neue " +
  'Zeile ohne Einrückung), Klammern und Anführungszeichen schließen sich automatisch. Ergebnisse einer Query erscheinen ' +
  'als Tabelle, Fehler zeigen die betroffene Zeilennummer. Ein Tabelleninspektor zeigt die aktuell existierenden ' +
  'Tabellen mit Spalten und Zeilenzahl. Du musst mich nicht fragen, wie der Editor bedient wird — das ist dir bereits bekannt.';

const PYTHON_TOOL_DESCRIPTION =
  'Kontext zum Tool, in dem ich gerade arbeite: Eine browserbasierte Python-Sandbox (Pyodide) für Lern-Challenges. ' +
  'Tab rückt ein, Enter übernimmt die Einrückung der vorigen Zeile und rückt nach einer Zeile, die mit ":" endet, eine ' +
  'Stufe weiter ein. Klammern und Anführungszeichen schließen sich automatisch. Nach dem Ausführen zeigt das Tool die ' +
  'Ausgabe (stdout, also alles was print() erzeugt hat) sowie alle am Ende gesetzten Variablen mit ihrem Wert. Es gibt ' +
  'keinen Tabelleninspektor wie im SQL-Track. Du musst mich nicht fragen, wie der Editor bedient wird — das ist dir bereits bekannt.';

function isCompleted(progress: ProgressState, sel: { trackId: string; courseId: string }, num: string): boolean {
  const p = getChallengeProgress(progress, sel.trackId, sel.courseId, num);
  return p.bestStars > 0 || p.solutionViewed;
}

function persist(ctx: AppContext): void {
  ctx.progressStore.save(ctx.store.getState().progress);
}

function appendChatMessage(progress: ProgressState, sel: ChallengeSelection, message: ChatMessage): ProgressState {
  const existing = getChallengeProgress(progress, sel.trackId, sel.courseId, sel.challengeNum).chatHistory;
  return withChallengeProgress(progress, sel.trackId, sel.courseId, sel.challengeNum, {
    chatHistory: [...existing, message],
  });
}

/** Records a run/play outcome's star and pass/fail bookkeeping — shared by every track's runQuery/playChallenge branch. */
function recordOutcome(ctx: AppContext, trackId: string, courseId: string, num: string, succeeded: boolean): void {
  const key = makeProgressKey(trackId, courseId, num);
  ctx.store.update((s) => {
    let progress = s.progress;
    let session = s.session;
    if (succeeded) {
      const cp = getChallengeProgress(progress, trackId, courseId, num);
      const stars = calculateStars({ hintsUsed: cp.hintsUsed, solutionViewed: cp.solutionViewed });
      progress = withChallengeProgress(progress, trackId, courseId, num, { bestStars: stars });
      session = withPlayResult(session, key, 'ok');
    } else {
      session = withPlayResult(session, key, 'err');
    }
    return { ...s, progress, session };
  });
  persist(ctx);
}

const PYTHON_ENGINE_LOAD_TIMEOUT_MS = 15_000;
const PYTHON_ENGINE_TIMEOUT_MESSAGE =
  'Pyodide hat nach 15 Sekunden nicht geantwortet. Vermutlich blockiert eine Browser-Erweiterung ' +
  '(Werbeblocker, Datenschutz-/Sicherheits-Add-on) oder eine Content-Security-Policy das Laden externer ' +
  'Skripte von cdn.jsdelivr.net. Prüfe die Browser-Konsole (F12) auf eine CSP-Fehlermeldung und versuche ' +
  'es notfalls in einem Inkognito-Fenster ohne Erweiterungen.';

/**
 * Loads Pyodide exactly once (cached by EngineFactory itself) and reflects
 * progress in session.pythonStatus so the UI can show a loading banner. Safe
 * to call repeatedly — a no-op once the engine is ready. Wrapped in a
 * timeout for the same reason `loadSqlJsFromCdn` in app.ts is: a CSP-blocked
 * `<script>` load doesn't always fire its `error` event, which would
 * otherwise leave this pending forever with the UI stuck on "wird geladen".
 */
async function ensurePythonEngineLoaded(ctx: AppContext): Promise<void> {
  if (ctx.engines.getMainPython()) {
    ctx.store.update((s) => ({ ...s, session: withPythonStatus(s.session, 'ready') }));
    return;
  }
  ctx.store.update((s) => ({ ...s, session: withPythonStatus(s.session, 'loading') }));
  try {
    await withTimeout(
      ctx.engines.ensurePythonEngine(loadPyodideFromCdn),
      PYTHON_ENGINE_LOAD_TIMEOUT_MS,
      PYTHON_ENGINE_TIMEOUT_MESSAGE,
    );
    ctx.store.update((s) => ({ ...s, session: withPythonStatus(s.session, 'ready') }));
  } catch (e) {
    ctx.store.update((s) => ({ ...s, session: withPythonStatus(s.session, { error: (e as Error).message }) }));
  }
}

const CSHARP_ENGINE_LOAD_TIMEOUT_MS = 15_000;
const CSHARP_ENGINE_TIMEOUT_MESSAGE =
  'Die C#-Umgebung hat nach 15 Sekunden nicht geantwortet. Vermutlich blockiert eine Browser-Erweiterung ' +
  'oder eine Content-Security-Policy das Laden des Blazor-Bundles. Prüfe die Browser-Konsole (F12) auf eine ' +
  'Fehlermeldung und versuche es notfalls in einem Inkognito-Fenster ohne Erweiterungen.';

/**
 * Loads the C# engine exactly once (cached by EngineFactory itself) and
 * reflects progress in session.csharpStatus so the UI can show a loading
 * banner — same shape as ensurePythonEngineLoaded. Wrapped in a timeout for
 * the same reason: an iframe that never fires its ready message would
 * otherwise leave this pending forever with the UI stuck on "wird geladen".
 */
async function ensureCSharpEngineLoaded(ctx: AppContext): Promise<void> {
  if (ctx.engines.getMainCSharp()) {
    ctx.store.update((s) => ({ ...s, session: withCSharpStatus(s.session, 'ready') }));
    return;
  }
  ctx.store.update((s) => ({ ...s, session: withCSharpStatus(s.session, 'loading') }));
  try {
    await withTimeout(
      ctx.engines.ensureCSharpEngine(() => loadCSharpEngineFromServer(CSHARP_ENGINE_BASE_URL)),
      CSHARP_ENGINE_LOAD_TIMEOUT_MS,
      CSHARP_ENGINE_TIMEOUT_MESSAGE,
    );
    ctx.store.update((s) => ({ ...s, session: withCSharpStatus(s.session, 'ready') }));
  } catch (e) {
    ctx.store.update((s) => ({ ...s, session: withCSharpStatus(s.session, { error: (e as Error).message }) }));
  }
}

/** Boots the app: loads sql.js (eagerly — it's small), opens the last-viewed (or first) challenge, marks ready/error. */
export async function initApp(ctx: AppContext, loadSqlJs: () => Promise<SqlJsStatic>): Promise<void> {
  try {
    const SQL = await loadSqlJs();
    ctx.engines.setMainFromSqlJs(SQL);

    const lastChallenge = ctx.store.getState().progress.app.lastChallenge;
    const fallback = getDefaultTrackAndCourse(ctx.registry);
    const fallbackChallenge = fallback
      ? getCourseChallengesFromRegistry(ctx.registry, fallback.trackId, fallback.courseId)[0]
      : undefined;

    const target =
      lastChallenge && findChallengeInRegistry(ctx.registry, lastChallenge.trackId, lastChallenge.courseId, lastChallenge.num)
        ? lastChallenge
        : fallback && fallbackChallenge
          ? { trackId: fallback.trackId, courseId: fallback.courseId, num: fallbackChallenge.num }
          : null;

    if (target) selectChallenge(ctx, target.trackId, target.courseId, target.num);
    ctx.store.update((s) => ({ ...s, session: withInitStatus(s.session, 'ready') }));
  } catch (e) {
    ctx.store.update((s) => ({ ...s, session: withInitStatus(s.session, { error: (e as Error).message }) }));
  }
}

/**
 * Opens a challenge: flushes the outgoing challenge's draft (if given), then
 * — for the SQL track — deterministically materializes the target's
 * prerequisite chain + its own setup via `prepareChallenge` (the fix for the
 * prototype's "prereq breaks when opened standalone" bug). The Python track
 * has no such step yet: every challenge in this first course is a standalone
 * script with no `prereqNums`/`setup` (see src/runtime/python/README.md) —
 * instead, opening a Python challenge lazily triggers the Pyodide load.
 */
export function selectChallenge(
  ctx: AppContext,
  trackId: string,
  courseId: string,
  num: string,
  currentDraftValue?: string,
): void {
  const challenges = getCourseChallengesFromRegistry(ctx.registry, trackId, courseId);
  const challenge = challenges.find((c) => c.num === num);
  if (!challenge) return;

  if (trackId === 'sqlite') {
    const engine = ctx.engines.getMain();
    if (!engine) return;
    prepareChallenge(engine, challenge as unknown as SqlChallenge, challenges as unknown as SqlChallenge[]);
  }

  const prevSelection = ctx.store.getState().session.selection;

  ctx.store.update((s) => {
    let progress = s.progress;
    if (prevSelection && currentDraftValue !== undefined) {
      progress = withChallengeProgress(
        progress,
        prevSelection.trackId,
        prevSelection.courseId,
        prevSelection.challengeNum,
        { draftSql: currentDraftValue },
      );
    }
    progress = withAppSettings(progress, { lastChallenge: { trackId, courseId, num } });
    return { ...s, progress };
  });

  const tablesInfo = trackId === 'sqlite' ? (ctx.engines.getMain()?.getTablesInfo() ?? null) : null;
  const givenTableNames =
    trackId === 'sqlite'
      ? getGivenTableNames(challenge as unknown as SqlChallenge, challenges as unknown as SqlChallenge[])
      : [];

  ctx.store.update((s) => ({
    ...s,
    session: withGivenTableNames(
      withTablesInfo(withSelection(withActiveTab(s.session, 'task'), { trackId, courseId, challengeNum: num }), tablesInfo),
      givenTableNames,
    ),
  }));

  persist(ctx);

  if (trackId === 'python') {
    void ensurePythonEngineLoaded(ctx);
  }
  if (trackId === 'csharp') {
    void ensureCSharpEngineLoaded(ctx);
  }
}

/**
 * Self-checks a challenge's saved draft. For SQL this always uses a fresh,
 * disposable engine — never the shared main engine — so checking another
 * challenge from the sidebar can never disturb whatever is currently open in
 * the editor. Python has no such risk (every `exec()` already runs in a
 * fresh interpreter namespace, see PythonRuntime), so it reuses the main
 * engine directly.
 */
export function playChallenge(ctx: AppContext, trackId: string, courseId: string, num: string): void {
  const challenges = getCourseChallengesFromRegistry(ctx.registry, trackId, courseId);
  const challenge = challenges.find((c) => c.num === num);
  if (!challenge) return;

  const progress = ctx.store.getState().progress;
  const challengeProgress = getChallengeProgress(progress, trackId, courseId, num);
  if (!hasRealCode(challengeProgress.draftSql)) return;

  if (trackId === 'sqlite') {
    const engine = ctx.engines.createDisposable();
    prepareChallenge(engine, challenge as unknown as SqlChallenge, challenges as unknown as SqlChallenge[]);
    const outcome = executeAndValidateSql(engine, challengeProgress.draftSql, (challenge as unknown as SqlChallenge).validate);
    recordOutcome(ctx, trackId, courseId, num, !outcome.error && outcome.ok);
    return;
  }

  if (trackId === 'python') {
    const engine = ctx.engines.getMainPython();
    if (!engine) {
      recordOutcome(ctx, trackId, courseId, num, false);
      return;
    }
    const outcome = executeAndValidatePython(engine, challengeProgress.draftSql, (challenge as PythonChallenge).validate);
    recordOutcome(ctx, trackId, courseId, num, !outcome.error && outcome.ok);
  }
}

/**
 * Wipes the main SQL engine and re-materializes the currently open challenge
 * (via `prepareChallenge`, same bug fix as `selectChallenge`). Clears
 * bestStars/playResults course-wide. SQL-only: the Python track has no
 * persistent engine state to reset, so this is a no-op when a Python
 * challenge is open.
 */
export function resetSchema(ctx: AppContext): void {
  const selection = ctx.store.getState().session.selection;
  if (!selection || selection.trackId !== 'sqlite') return;
  const engine = ctx.engines.getMain();
  if (!engine) return;

  engine.reset();
  const challenges = getCourseChallengesFromRegistry(ctx.registry, selection.trackId, selection.courseId) as unknown as SqlChallenge[];
  const challenge = challenges.find((c) => c.num === selection.challengeNum);
  let givenTableNames: string[] = [];
  if (challenge) {
    prepareChallenge(engine, challenge, challenges);
    givenTableNames = getGivenTableNames(challenge, challenges);
  }
  const tablesInfo = engine.getTablesInfo();

  ctx.store.update((s) => {
    let progress = s.progress;
    for (const c of challenges) {
      progress = withChallengeProgress(progress, selection.trackId, selection.courseId, c.num, { bestStars: 0 });
    }
    // Cleared for the whole session, not just this course — acceptable while
    // there is only ever one SQL course; revisit if a second SQL course ships.
    const session = withGivenTableNames(
      withTablesInfo({ ...s.session, playResults: {} }, tablesInfo),
      givenTableNames,
    );
    return { ...s, progress, session };
  });

  persist(ctx);
}

/**
 * Runs code against the currently open challenge's track and returns the
 * outcome for the view to render. Async because C#'s executeAndValidate is
 * (real Roslyn compile + WASM run via the iframe transport, never
 * synchronous the way sql.js/CPython-subprocess calls are) — SQL and Python
 * themselves stay synchronous internally, this only awaits the one branch
 * that needs it.
 */
export async function runQuery(ctx: AppContext, code: string): Promise<RunOutcome> {
  const selection = ctx.store.getState().session.selection;
  if (!selection) return { kind: 'none' };
  const challenge = findChallengeInRegistry(ctx.registry, selection.trackId, selection.courseId, selection.challengeNum);
  if (!challenge) return { kind: 'none' };

  if (selection.trackId === 'sqlite') {
    const engine = ctx.engines.getMain();
    if (!engine) return { kind: 'none' };
    const outcome = executeAndValidateSql(engine, code, (challenge as unknown as SqlChallenge).validate);
    const tablesInfo = engine.getTablesInfo();
    ctx.store.update((s) => ({ ...s, session: withTablesInfo(s.session, tablesInfo) }));
    recordOutcome(ctx, selection.trackId, selection.courseId, selection.challengeNum, !outcome.error && outcome.ok);
    return { kind: 'sql', ...outcome };
  }

  if (selection.trackId === 'python') {
    const engine = ctx.engines.getMainPython();
    if (!engine) return { kind: 'python-loading' };
    const outcome = executeAndValidatePython(engine, code, (challenge as PythonChallenge).validate);
    recordOutcome(ctx, selection.trackId, selection.courseId, selection.challengeNum, !outcome.error && outcome.ok);
    return { kind: 'python', ...outcome };
  }

  if (selection.trackId === 'csharp') {
    const engine = ctx.engines.getMainCSharp();
    if (!engine) return { kind: 'csharp-loading' };
    const outcome = await executeAndValidateCSharp(engine, code, (challenge as CSharpChallenge).validate);
    recordOutcome(ctx, selection.trackId, selection.courseId, selection.challengeNum, !outcome.error && outcome.ok);
    return { kind: 'csharp', ...outcome };
  }

  return { kind: 'none' };
}

/** Reveals hint `idx` (0-based) if it's the next one due; in exam mode also spends from the shared per-course pool. */
export function revealHint(ctx: AppContext, idx: number): void {
  const state = ctx.store.getState();
  const selection = state.session.selection;
  if (!selection) return;

  const challengeProgress = getChallengeProgress(
    state.progress,
    selection.trackId,
    selection.courseId,
    selection.challengeNum,
  );
  if (idx !== challengeProgress.hintsUsed) return;

  const courseSettings = getCourseSettings(state.progress, selection.trackId, selection.courseId);
  if (courseSettings.mode === 'exam' && courseSettings.examTipsRemaining <= 0) return;

  ctx.store.update((s) => {
    let progress = withChallengeProgress(s.progress, selection.trackId, selection.courseId, selection.challengeNum, {
      hintsUsed: idx + 1,
    });
    if (courseSettings.mode === 'exam') {
      progress = withCourseSettings(progress, selection.trackId, selection.courseId, {
        examTipsRemaining: courseSettings.examTipsRemaining - 1,
      });
    }
    return { ...s, progress };
  });
  persist(ctx);

  const levelText =
    idx === 0
      ? 'einen ersten, sanften Hinweis'
      : idx === 1
        ? 'einen konkreteren Tipp, der mehr verrät als der erste'
        : 'einen sehr weitreichenden Tipp, der fast an die Lösung heranreicht';

  // The authored hint is shown inline by the view regardless; it is also passed
  // to Claude as grounding so the reply elaborates on the intended
  // concreteness ladder instead of improvising a different hint at a different level.
  const authoredHint = findChallengeInRegistry(ctx.registry, selection.trackId, selection.courseId, selection.challengeNum)?.hints[idx];
  const grounding = authoredHint
    ? ` Der vorgesehene Tipp ${idx + 1} lautet: "${stripHtml(authoredHint)}". Erkläre und vertiefe genau diesen Hinweis, statt einen anderen zu geben.`
    : '';
  void sendChatMessage(
    ctx,
    `Gib mir ${levelText} zu dieser Challenge, ohne die komplette Musterlösung zu verraten.${grounding}`,
  );
}

/** Marks the solution as viewed and zeroes bestStars — only the first time (idempotent afterward). */
export function markSolutionViewed(ctx: AppContext): void {
  const state = ctx.store.getState();
  const selection = state.session.selection;
  if (!selection) return;
  const progress = getChallengeProgress(state.progress, selection.trackId, selection.courseId, selection.challengeNum);
  if (progress.solutionViewed) return;

  ctx.store.update((s) => ({
    ...s,
    progress: withChallengeProgress(s.progress, selection.trackId, selection.courseId, selection.challengeNum, {
      solutionViewed: true,
      bestStars: 0,
    }),
  }));
  persist(ctx);
}

/** Prefills the chat draft with a comparison prompt; the actual line-diff is a pure render helper the view calls directly. */
export function compareToSolution(ctx: AppContext): void {
  const selection = ctx.store.getState().session.selection;
  if (!selection) return;
  const challenge = findChallengeInRegistry(ctx.registry, selection.trackId, selection.courseId, selection.challengeNum);
  if (!challenge) return;
  const prompt = `Vergleiche meine Lösung mit der Musterlösung für "${challenge.title}": Warum funktioniert die Musterlösung, und was sind die wichtigsten Unterschiede zu meiner Version?`;
  ctx.store.update((s) => ({ ...s, session: withChatDraftPrefill(s.session, prompt) }));
}

export function setMode(ctx: AppContext, mode: 'study' | 'exam'): void {
  const selection = ctx.store.getState().session.selection;
  if (!selection) return;
  ctx.store.update((s) => ({
    ...s,
    progress: withCourseSettings(s.progress, selection.trackId, selection.courseId, { mode }),
  }));
  persist(ctx);
}

export function switchTab(ctx: AppContext, tab: ActiveTab): void {
  ctx.store.update((s) => ({
    ...s,
    session: withActiveTab(tab === 'chat' ? withChatUnread(s.session, false) : s.session, tab),
  }));
}

export function toggleSidebar(ctx: AppContext): void {
  const current = ctx.store.getState().progress.app.sidebarCollapsed;
  ctx.store.update((s) => ({ ...s, progress: withAppSettings(s.progress, { sidebarCollapsed: !current }) }));
  persist(ctx);
}

export function setTheme(ctx: AppContext, theme: string): void {
  ctx.store.update((s) => ({ ...s, progress: withAppSettings(s.progress, { theme }) }));
  persist(ctx);
}

export function toggleThemePicker(ctx: AppContext, open: boolean): void {
  ctx.store.update((s) => ({ ...s, session: withThemePickerOpen(s.session, open) }));
}

/** The debouncing already happens one layer up, in domEditor.ts's onChange callback. */
export function saveDraft(ctx: AppContext, value: string): void {
  const selection = ctx.store.getState().session.selection;
  if (!selection) return;
  saveDraftFor(ctx, selection.trackId, selection.courseId, selection.challengeNum, value);
}

/**
 * Saves a draft to an explicitly named challenge rather than whatever is
 * currently selected. Needed when navigating away: the editor still holds the
 * *outgoing* challenge's text at the moment the selection has already moved
 * on, and waiting for the 600ms debounce would lose the last keystrokes.
 */
export function saveDraftFor(ctx: AppContext, trackId: string, courseId: string, num: string, value: string): void {
  ctx.store.update((s) => ({
    ...s,
    progress: withChallengeProgress(s.progress, trackId, courseId, num, { draftSql: value }),
  }));
  persist(ctx);
}

function toolDescriptionFor(trackId: string): string {
  return trackId === 'python' ? PYTHON_TOOL_DESCRIPTION : SQL_TOOL_DESCRIPTION;
}

export async function sendChatMessage(ctx: AppContext, userText: string): Promise<void> {
  const trimmed = userText.trim();
  if (!trimmed) return;

  const selection = ctx.store.getState().session.selection;
  if (!selection) return;
  const challenge = findChallengeInRegistry(ctx.registry, selection.trackId, selection.courseId, selection.challengeNum);
  if (!challenge) return;

  ctx.store.update((s) => ({ ...s, progress: appendChatMessage(s.progress, selection, { role: 'user', content: trimmed }) }));
  persist(ctx);

  const state = ctx.store.getState();
  const challenges = getCourseChallengesFromRegistry(ctx.registry, selection.trackId, selection.courseId);
  const courseTitle =
    ctx.registry[selection.trackId]?.courses.find((c) => c.id === selection.courseId)?.title ?? selection.courseId;
  const context = buildContext({
    toolDescription: toolDescriptionFor(selection.trackId),
    trackLabel: ctx.registry[selection.trackId]?.label ?? selection.trackId,
    courseTitle,
    challenges: challenges.map((c) => ({ title: c.title, completed: isCompleted(state.progress, selection, c.num) })),
    currentChallengeTitle: challenge.title,
    currentTask: challenge.task,
    currentSuccessCriteria: challenge.successCriteria,
    currentEditorContent: getChallengeProgress(
      state.progress,
      selection.trackId,
      selection.courseId,
      selection.challengeNum,
    ).draftSql,
  });

  const historyBeforeThisMessage = getChallengeProgress(
    state.progress,
    selection.trackId,
    selection.courseId,
    selection.challengeNum,
  ).chatHistory.slice(0, -1);

  const augmentedUserText = `${trimmed}\n\nBitte antworte kurz und auf Deutsch. Hilf mir, selbst weiterzukommen, statt einfach die komplette Musterlösung zu verraten — außer ich frage explizit danach.`;

  let reply: ChatMessage;
  try {
    const text = await ctx.chatClient.sendMessage({ system: context, history: historyBeforeThisMessage, userText: augmentedUserText });
    reply = { role: 'assistant', content: text };
  } catch (e) {
    reply = { role: 'assistant', content: `Fehler beim Abfragen von Claude: ${(e as Error).message}` };
  }

  ctx.store.update((s) => ({
    ...s,
    progress: appendChatMessage(s.progress, selection, reply),
    session: s.session.activeTab !== 'chat' ? withChatUnread(s.session, true) : s.session,
  }));
  persist(ctx);
}

/**
 * One-off Postgres-note Q&A — not stored in the shared chat history. SQL-track
 * only: the calling UI (pgAskPanel.ts) only renders for `trackId === 'sqlite'`,
 * so this is never reached for another track's challenge in practice.
 */
export async function sendPgAskMessage(ctx: AppContext, question: string): Promise<string> {
  const trimmed = question.trim();
  if (!trimmed) return '';
  const state = ctx.store.getState();
  const selection = state.session.selection;
  if (!selection || selection.trackId !== 'sqlite') return '';
  const challenge = findChallengeInRegistry(ctx.registry, selection.trackId, selection.courseId, selection.challengeNum) as
    | SqlChallenge
    | undefined;
  if (!challenge) return '';

  const challenges = getCourseChallengesFromRegistry(ctx.registry, selection.trackId, selection.courseId);
  const done = challenges.filter((c) => isCompleted(state.progress, selection, c.num)).map((c) => c.title);
  const open = challenges.filter((c) => !done.includes(c.title)).map((c) => c.title);
  const knowledge =
    `Mein bisheriger Lernstand: abgeschlossene Challenges: ${done.length ? done.join(', ') : 'noch keine'}. ` +
    `Noch offene Challenges: ${open.length ? open.join(', ') : 'keine'}.`;

  const draftSql = getChallengeProgress(
    state.progress,
    selection.trackId,
    selection.courseId,
    selection.challengeNum,
  ).draftSql;

  const contextText =
    `${SQL_TOOL_DESCRIPTION}\n\n${knowledge}\n\n` +
    `Ich lerne SQL (aktuell in SQLite) für ein Projekt, das PostgreSQL nutzt. Zur Challenge "${challenge.title}" gibt es folgenden Postgres-Hinweis:\n${stripHtml(challenge.extra.pg)}\n\n` +
    `Mein aktueller Editor-Inhalt:\n${draftSql}\n\nMeine Frage: ${trimmed}\n\nBitte antworte kurz und auf Deutsch.`;

  return ctx.chatClient.sendMessage({ system: '', history: [], userText: contextText });
}
