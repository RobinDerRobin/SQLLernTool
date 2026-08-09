import type { Course } from '../../../../../domain/challenge.types';
import type { CSharpChallenge } from '../../types';

/**
 * Deliberately empty so far — this is step 5 of the plan in
 * docs/csharp-engine-poc.md (content-track scaffold), not step 7 (actual
 * content). Challenges land here once step 6 (Node-side test engine, for
 * Gate 1/Gate 2) exists to verify them the same rigorous way every other
 * track's content is verified.
 */
const challenges: CSharpChallenge[] = [];

export const csharpGrundlagenCourse: Course<CSharpChallenge> = {
  id: 'csharpGrundlagen',
  title: 'C# Grundlagen',
  description: 'Die absoluten Grundlagen von C# — keine Vorkenntnisse nötig.',
  challenges,
};
