import { describe, expect, it } from 'vitest';
import { createNodeCSharpEngine } from '../helpers/nodeCSharpEngine';
import { createNodePythonEngine } from '../helpers/nodePythonEngine';
import { createNodeSqliteEngine } from '../helpers/nodeSqliteEngine';
import { csharpGrundlagenCourse } from '../../src/content/tracks/csharp/courses/csharpGrundlagen/course';
import type { CSharpChallenge } from '../../src/content/tracks/csharp/types';
import { pythonGrundlagenCourse } from '../../src/content/tracks/python/courses/pythonGrundlagen/course';
import type { PythonChallenge } from '../../src/content/tracks/python/types';
import { sqlLernenToolCourse } from '../../src/content/tracks/sqlite/courses/sqlLernenTool/course';
import type { SqlChallenge } from '../../src/content/tracks/sqlite/types';
import { executeAndValidate as executeAndValidateCSharp } from '../../src/runtime/csharp/executeAndValidate';
import { executeAndValidate as executeAndValidatePython } from '../../src/runtime/python/executeAndValidate';
import type { PythonRuntime } from '../../src/runtime/python/PythonRuntime';
import { executeAndValidate } from '../../src/runtime/sql/executeAndValidate';
import { prepareChallenge } from '../../src/runtime/sql/prepareChallenge';
import type { SqlEngine } from '../../src/runtime/sql/SqlEngine';

const REPS_FOR_NONDETERMINISTIC = 10;

/**
 * The permanent, automated replacement for challenge-anforderungen.md
 * section 10's manual QA script: for every challenge, on a fresh engine,
 * deterministically materialize its prerequisites (prepareChallenge), run
 * its own canonical solution, and assert that the challenge's *real*
 * `validate()` — never re-implemented logic — accepts it. Nondeterministic
 * (RANDOM()-driven) challenges repeat 10x, all reps must pass.
 *
 * A fresh engine per challenge (rather than one shared session across the
 * whole course) is deliberate: it proves prepareChallenge's prereq-chain
 * replay actually works standalone, not just when challenges happen to run
 * in order in the same session — the exact bug this suite exists to guard
 * against (challenge-anforderungen.md section 11).
 *
 * Also runs Gate 2 (challenge-anforderungen.md section 12): every
 * `distractors` entry on a challenge — a plausible wrong solution a learner
 * without the intended understanding might submit — must fail the same
 * `validate()`. A distractor that passes means the check doesn't actually
 * test the concept it claims to. `distractors` is optional per challenge;
 * not declaring any yields zero extra tests for that challenge, not a
 * failure.
 */
function runOneChallenge(engine: SqlEngine, challenge: SqlChallenge, allChallenges: SqlChallenge[]) {
  prepareChallenge(engine, challenge, allChallenges);
  return executeAndValidate(engine, challenge.solution, challenge.validate);
}

function describeSqlCourse(courseLabel: string, challenges: SqlChallenge[]) {
  describe(`challenge runner: ${courseLabel}`, () => {
    for (const challenge of challenges) {
      const reps = challenge.nondeterministic ? REPS_FOR_NONDETERMINISTIC : 1;

      it(`${challenge.num} — ${challenge.title} (own solution passes its own validate${reps > 1 ? `, ${reps}x` : ''})`, () => {
        for (let i = 0; i < reps; i++) {
          const engine = createNodeSqliteEngine();
          const outcome = runOneChallenge(engine, challenge, challenges);
          if (outcome.error) {
            throw new Error(`[${challenge.num} rep ${i + 1}/${reps}] SQL error: ${outcome.error}`);
          }
          expect(outcome.ok, `[${challenge.num} rep ${i + 1}/${reps}] validate() failed: ${outcome.message}`).toBe(true);
        }
      });

      for (const [i, distractor] of (challenge.distractors ?? []).entries()) {
        it(`${challenge.num} — distractor ${i + 1}/${challenge.distractors!.length} (${distractor.reason}) must fail validate`, () => {
          const engine = createNodeSqliteEngine();
          prepareChallenge(engine, challenge, challenges);
          const outcome = executeAndValidate(engine, distractor.code, challenge.validate);
          expect(
            outcome.ok,
            `Distractor "${distractor.reason}" for ${challenge.num} passed validate() — the check does not actually test the intended concept.`,
          ).toBe(false);
        });
      }
    }
  });
}

describeSqlCourse(sqlLernenToolCourse.title, sqlLernenToolCourse.challenges);

/**
 * The Python track's equivalent of `runOneChallenge`/`describeSqlCourse`
 * above: no `prepareChallenge` step (this course's challenges are all
 * standalone scripts, see src/runtime/python/README.md's "not decided"
 * section, resolved here by simply not needing prereq replay yet), and each
 * `exec()` already runs in a fresh interpreter namespace, so a fresh engine
 * per repetition is enough on its own.
 */
function runOnePythonChallenge(engine: PythonRuntime, challenge: PythonChallenge) {
  return executeAndValidatePython(engine, challenge.solution, challenge.validate);
}

function describePythonCourse(courseLabel: string, challenges: PythonChallenge[]) {
  describe(`challenge runner: ${courseLabel}`, () => {
    for (const challenge of challenges) {
      const reps = challenge.nondeterministic ? REPS_FOR_NONDETERMINISTIC : 1;

      it(`${challenge.num} — ${challenge.title} (own solution passes its own validate${reps > 1 ? `, ${reps}x` : ''})`, () => {
        for (let i = 0; i < reps; i++) {
          const engine = createNodePythonEngine();
          const outcome = runOnePythonChallenge(engine, challenge);
          if (outcome.error) {
            throw new Error(`[${challenge.num} rep ${i + 1}/${reps}] Python error: ${outcome.error}`);
          }
          expect(outcome.ok, `[${challenge.num} rep ${i + 1}/${reps}] validate() failed: ${outcome.message}`).toBe(true);
        }
      });

      for (const [i, distractor] of (challenge.distractors ?? []).entries()) {
        it(`${challenge.num} — distractor ${i + 1}/${challenge.distractors!.length} (${distractor.reason}) must fail validate`, () => {
          const engine = createNodePythonEngine();
          const outcome = executeAndValidatePython(engine, distractor.code, challenge.validate);
          expect(
            outcome.ok,
            `Distractor "${distractor.reason}" for ${challenge.num} passed validate() — the check does not actually test the intended concept.`,
          ).toBe(false);
        });
      }
    }
  });
}

describePythonCourse(pythonGrundlagenCourse.title, pythonGrundlagenCourse.challenges);

/**
 * The C# track's equivalent of `describePythonCourse` above — same
 * no-prereq-replay reasoning (every challenge is a standalone program run
 * fresh), except `exec()` is async (real `dotnet exec` subprocess per call,
 * see test/helpers/nodeCSharpEngine.ts), so both the runner and its `it()`
 * callbacks are async here where the SQL/Python ones aren't.
 */
function describeCSharpCourse(courseLabel: string, challenges: CSharpChallenge[]) {
  describe(`challenge runner: ${courseLabel}`, () => {
    for (const challenge of challenges) {
      it(`${challenge.num} — ${challenge.title} (own solution passes its own validate)`, async () => {
        const engine = createNodeCSharpEngine();
        const outcome = await executeAndValidateCSharp(engine, challenge.solution, challenge.validate);
        if (outcome.error) {
          throw new Error(`[${challenge.num}] C# error: ${outcome.error}`);
        }
        expect(outcome.ok, `[${challenge.num}] validate() failed: ${outcome.message}`).toBe(true);
      });

      for (const [i, distractor] of (challenge.distractors ?? []).entries()) {
        it(`${challenge.num} — distractor ${i + 1}/${challenge.distractors!.length} (${distractor.reason}) must fail validate`, async () => {
          const engine = createNodeCSharpEngine();
          const outcome = await executeAndValidateCSharp(engine, distractor.code, challenge.validate);
          expect(
            outcome.ok,
            `Distractor "${distractor.reason}" for ${challenge.num} passed validate() — the check does not actually test the intended concept.`,
          ).toBe(false);
        });
      }
    }
  });
}

describeCSharpCourse(csharpGrundlagenCourse.title, csharpGrundlagenCourse.challenges);
