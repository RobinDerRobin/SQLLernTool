import type { Course } from '../../../../../domain/challenge.types';
import type { CSharpChallenge } from '../../types';
import { challenge01 } from './challenges/01';

/**
 * Step 7 of the plan in docs/csharp-engine-poc.md (actual content) has
 * begun — the first challenge lands here now that step 6 (Node-side test
 * engine, test/helpers/nodeCSharpEngine.ts) exists to verify it the same
 * rigorous way every other track's content is verified (Gate 1/Gate 2 via
 * test/content/challengeRunner.test.ts).
 */
const challenges: CSharpChallenge[] = [challenge01];

export const csharpGrundlagenCourse: Course<CSharpChallenge> = {
  id: 'csharpGrundlagen',
  title: 'C# Grundlagen',
  description: 'Die absoluten Grundlagen von C# — keine Vorkenntnisse nötig.',
  challenges,
};
