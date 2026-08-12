import { describe, expect, it } from 'vitest';
import { csharpGrundlagenCourse } from '../../src/content/tracks/csharp/courses/csharpGrundlagen/course';
import { pythonGrundlagenCourse } from '../../src/content/tracks/python/courses/pythonGrundlagen/course';
import { sqlLernenToolCourse } from '../../src/content/tracks/sqlite/courses/sqlLernenTool/course';

/**
 * Every challenge's `task`/`prereqNote`/`tutorial`/`hints`/`syntaxExplanation`/
 * `successCriteria` is raw HTML, eventually assigned via `.innerHTML` — `task`/`prereqNote`
 * directly in taskTab.ts, the rest via `highlightContentHtml` (tutorialTab.ts, hintsSection.ts,
 * solutionSection.ts) — same underlying risk either way. A bare `<` immediately followed by a
 * letter inside a
 * `<pre>`/`<code>` block — e.g. a C# generic like `List<int>` — is parsed by the browser as the
 * start of a real (unknown) element, silently swallowing everything up to and including the
 * next matching `>`. Found live: `List<int>` rendered as just `List`, with `int` gone entirely.
 * SQL/Python content rarely hits this (comparisons like `n < 5` have a space/digit after `<`,
 * which browsers don't treat as a tag start; Python has no `<T>` generic syntax at all) — C#
 * generics are exactly the shape that triggers it, so this guards all three tracks generically
 * rather than special-casing C#.
 */
function assertNoHtmlParsingCorruption(html: string, label: string): void {
  if (!/<pre>|<code>/.test(html)) return;
  const container = document.createElement('div');
  container.innerHTML = html;

  const rawSpans = [...html.matchAll(/<pre>([\s\S]*?)<\/pre>|<code>([\s\S]*?)<\/code>/g)];
  const parsedEls = [...container.querySelectorAll('pre, code')];
  expect(
    parsedEls.length,
    `${label}: found ${rawSpans.length} <pre>/<code> block(s) in source but ${parsedEls.length} after HTML parsing — a nested tag-like sequence likely broke the structure`,
  ).toBe(rawSpans.length);

  rawSpans.forEach((match, i) => {
    const rawInner = match[1] ?? match[2] ?? '';
    const decoded = rawInner
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    expect(
      parsedEls[i]!.textContent,
      `${label}: content changed after HTML parsing — likely a bare "<" followed by a letter (e.g. a generic type like List<int>) misread as a real tag and swallowed. Escape it as &lt;/&gt; in the source.`,
    ).toBe(decoded);
  });
}

const courses = [
  ['sqlite', sqlLernenToolCourse.challenges],
  ['python', pythonGrundlagenCourse.challenges],
  ['csharp', csharpGrundlagenCourse.challenges],
] as const;

describe('challenge content survives HTML parsing without silent corruption', () => {
  for (const [trackId, challenges] of courses) {
    for (const challenge of challenges) {
      it(`${trackId}/${challenge.num}`, () => {
        // task and prereqNote are embedded raw by taskTab.ts (no highlightContentHtml step,
        // unlike tutorial/hints/syntaxExplanation/successCriteria) — same underlying risk
        // (any of these ends up as someone's .innerHTML), so covered the same way here.
        assertNoHtmlParsingCorruption(challenge.task, `${trackId}/${challenge.num} task`);
        if (challenge.prereqNote) assertNoHtmlParsingCorruption(challenge.prereqNote, `${trackId}/${challenge.num} prereqNote`);
        assertNoHtmlParsingCorruption(challenge.tutorial, `${trackId}/${challenge.num} tutorial`);
        challenge.hints.forEach((hint, i) => assertNoHtmlParsingCorruption(hint, `${trackId}/${challenge.num} hint[${i}]`));
        assertNoHtmlParsingCorruption(challenge.syntaxExplanation, `${trackId}/${challenge.num} syntaxExplanation`);
        assertNoHtmlParsingCorruption(challenge.successCriteria, `${trackId}/${challenge.num} successCriteria`);
      });
    }
  }
});
