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
import { challenge12 } from './challenges/12';
import { challenge13 } from './challenges/13';
import { challenge14 } from './challenges/14';
import { challenge15 } from './challenges/15';
import { challenge16 } from './challenges/16';
import { challenge17 } from './challenges/17';
import { challenge18 } from './challenges/18';
import { challenge19 } from './challenges/19';
import { challenge20 } from './challenges/20';
import { challenge21 } from './challenges/21';
import { challenge22 } from './challenges/22';
import { challenge23 } from './challenges/23';

/**
 * Step 7 of the plan in docs/csharp-engine-poc.md (actual content) has
 * begun — challenges land here now that step 6 (Node-side test engine,
 * test/helpers/nodeCSharpEngine.ts) exists to verify them the same
 * rigorous way every other track's content is verified (Gate 1/Gate 2 via
 * test/content/challengeRunner.test.ts).
 */
const challenges: CSharpChallenge[] = [challenge01, challenge02, challenge03, challenge04, challenge05, challenge06, challenge07, challenge08, challenge09, challenge10, challenge11, challenge12, challenge13, challenge14, challenge15, challenge16, challenge17, challenge18, challenge19, challenge20, challenge21, challenge22, challenge23];

export const csharpGrundlagenCourse: Course<CSharpChallenge> = {
  id: 'csharpGrundlagen',
  title: 'C# Grundlagen',
  description: 'Die absoluten Grundlagen von C# — keine Vorkenntnisse nötig.',
  challenges,
};
