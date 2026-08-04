import { stripHtml } from '../domain/text/stripHtml';

interface ChatChallengeSummary {
  title: string;
  completed: boolean;
}

interface BuildContextInput {
  toolDescription: string;
  trackLabel: string;
  courseTitle: string;
  challenges: ChatChallengeSummary[];
  currentChallengeTitle: string;
  /** Raw HTML, as stored on the challenge — stripped internally. */
  currentTask: string;
  /** Raw HTML, as stored on the challenge — stripped internally. */
  currentSuccessCriteria: string;
  currentEditorContent: string;
}

/**
 * Pure context assembly for the per-challenge AI chat — no fetch, no DOM.
 * Ported from the prototype's buildContext/buildKnowledgeContext, made
 * track/course-aware instead of assuming a single hardcoded SQL course.
 */
export function buildContext(input: BuildContextInput): string {
  const done = input.challenges.filter((c) => c.completed).map((c) => c.title);
  const open = input.challenges.filter((c) => !c.completed).map((c) => c.title);

  const knowledge =
    `Mein bisheriger Lernstand (${input.trackLabel} – ${input.courseTitle}): ` +
    `abgeschlossene Challenges: ${done.length ? done.join(', ') : 'noch keine'}. ` +
    `Noch offene Challenges: ${open.length ? open.join(', ') : 'keine'}. ` +
    `Setze bitte kein Wissen voraus, das über die abgeschlossenen Challenges hinausgeht — ` +
    `erkläre Grundlagen bei Bedarf kurz mit, statt sie stillschweigend vorauszusetzen.`;

  return [
    input.toolDescription,
    '',
    knowledge,
    '',
    `Aktuelle Challenge: ${input.currentChallengeTitle}`,
    `Aufgabe: ${stripHtml(input.currentTask)}`,
    `Erfolgskriterium: ${stripHtml(input.currentSuccessCriteria)}`,
    'Mein aktueller Editor-Inhalt:',
    input.currentEditorContent,
  ].join('\n');
}
