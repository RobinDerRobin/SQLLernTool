import type { Course } from '../../../../../domain/challenge.types';
import type { CSharpChallenge } from '../../types';
import { challenge01 } from './challenges/01';
import { challenge02 } from './challenges/02';
import { challenge03 } from './challenges/03';
import { challenge04 } from './challenges/04';
import { challenge05 } from './challenges/05';
import { challenge06 } from './challenges/06';
import { challenge07 } from './challenges/07';
import { challenge08 } from './challenges/08';
import { challenge09 } from './challenges/09';
import { challenge10 } from './challenges/10';
import { challenge11 } from './challenges/11';

/**
 * Step 7 of the plan in docs/csharp-engine-poc.md (actual content) has
 * begun — challenges land here now that step 6 (Node-side test engine,
 * test/helpers/nodeCSharpEngine.ts) exists to verify them the same
 * rigorous way every other track's content is verified (Gate 1/Gate 2 via
 * test/content/challengeRunner.test.ts).
 */
const challenges: CSharpChallenge[] = [challenge01, challenge02, challenge03, challenge04, challenge05, challenge06, challenge07, challenge08, challenge09, challenge10, challenge11];

export const csharpGrundlagenCourse: Course<CSharpChallenge> = {
  id: 'csharpGrundlagen',
  title: 'C# Grundlagen',
  description: 'Die absoluten Grundlagen von C# — keine Vorkenntnisse nötig.',
  challenges,
};
