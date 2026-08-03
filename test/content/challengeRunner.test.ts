import { describe, expect, it } from 'vitest';
import { createNodePythonEngine } from '../helpers/nodePythonEngine';
import { createNodeSqliteEngine } from '../helpers/nodeSqliteEngine';
import { pythonGrundlagenCourse } from '../../src/content/tracks/python/courses/pythonGrundlagen/course';
import type { PythonChallenge } from '../../src/content/tracks/python/types';
import { sqlLernenToolCourse } from '../../src/content/tracks/sqlite/courses/sqlLernenTool/course';
import type { SqlChallenge } from '../../src/content/tracks/sqlite/types';
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
    }
  });
}

describePythonCourse(pythonGrundlagenCourse.title, pythonGrundlagenCourse.challenges);
