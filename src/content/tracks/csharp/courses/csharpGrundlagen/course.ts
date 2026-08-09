import type { Course } from '../../../../../domain/challenge.types';
import type { CSharpChallenge } from '../../types';
import { challenge01 } from './challenges/01';
import { challenge02 } from './challenges/02';
import { challenge03 } from './challenges/03';
import { challenge04 } from './challenges/04';
import { challenge05 } from './challenges/05';

/**
 * Step 7 of the plan in docs/csharp-engine-poc.md (actual content) has
 * begun — challenges land here now that step 6 (Node-side test engine,
 * test/helpers/nodeCSharpEngine.ts) exists to verify them the same
 * rigorous way every other track's content is verified (Gate 1/Gate 2 via
 * test/content/challengeRunner.test.ts).
 */
const challenges: CSharpChallenge[] = [challenge01, challenge02, challenge03, challenge04, challenge05];

export const csharpGrundlagenCourse: Course<CSharpChallenge> = {
  id: 'csharpGrundlagen',
  title: 'C# Grundlagen',
  description: 'Die absoluten Grundlagen von C# — keine Vorkenntnisse nötig.',
  challenges,
};
