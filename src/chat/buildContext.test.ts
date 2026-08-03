import { describe, expect, it } from 'vitest';
import { buildContext } from './buildContext';

const TOOL_DESCRIPTION = 'Kontext zum Tool: eine browserbasierte Coding-Sandbox.';

describe('buildContext', () => {
  it('assembles the tool description, learning progress, and current-challenge context', () => {
    const context = buildContext({
      toolDescription: TOOL_DESCRIPTION,
      trackLabel: 'SQL (SQLite)',
      courseTitle: 'SQL Lernen Tool',
      challenges: [
        { title: 'Basis-INSERT', completed: true },
        { title: 'SELECT/WHERE', completed: false },
      ],
      currentChallengeTitle: 'SELECT/WHERE',
      currentTask: '<b>Deine Aufgabe:</b> Filtere die Tabelle.',
      currentSuccessCriteria: 'Das Ergebnis enthaelt <b>nur</b> passende Zeilen.',
      currentEditorContent: 'SELECT * FROM users;',
    });

    expect(context).toContain(TOOL_DESCRIPTION);
    expect(context).toContain('SQL (SQLite)');
    expect(context).toContain('SQL Lernen Tool');
    expect(context).toContain('abgeschlossene Challenges: Basis-INSERT');
    expect(context).toContain('Noch offene Challenges: SELECT/WHERE');
    expect(context).toContain('Aktuelle Challenge: SELECT/WHERE');
    expect(context).toContain('Aufgabe: Deine Aufgabe: Filtere die Tabelle.');
    expect(context).toContain('Erfolgskriterium: Das Ergebnis enthaelt nur passende Zeilen.');
    expect(context).toContain('SELECT * FROM users;');
  });

  it('strips HTML markup from the task and success criteria', () => {
    const context = buildContext({
      toolDescription: TOOL_DESCRIPTION,
      trackLabel: 'SQL (SQLite)',
      courseTitle: 'SQL Lernen Tool',
      challenges: [{ title: 'X', completed: false }],
      currentChallengeTitle: 'X',
      currentTask: '<div><p>hallo <b>welt</b></p></div>',
      currentSuccessCriteria: '<span>ok</span>',
      currentEditorContent: '',
    });

    expect(context).not.toContain('<');
    expect(context).toContain('hallo welt');
  });

  it('says "noch keine" when nothing is completed yet', () => {
    const context = buildContext({
      toolDescription: TOOL_DESCRIPTION,
      trackLabel: 'SQL (SQLite)',
      courseTitle: 'SQL Lernen Tool',
      challenges: [{ title: 'X', completed: false }],
      currentChallengeTitle: 'X',
      currentTask: '',
      currentSuccessCriteria: '',
      currentEditorContent: '',
    });

    expect(context).toContain('abgeschlossene Challenges: noch keine');
  });

  it('says "keine" when everything is completed', () => {
    const context = buildContext({
      toolDescription: TOOL_DESCRIPTION,
      trackLabel: 'SQL (SQLite)',
      courseTitle: 'SQL Lernen Tool',
      challenges: [{ title: 'X', completed: true }],
      currentChallengeTitle: 'X',
      currentTask: '',
      currentSuccessCriteria: '',
      currentEditorContent: '',
    });

    expect(context).toContain('Noch offene Challenges: keine');
  });
});
