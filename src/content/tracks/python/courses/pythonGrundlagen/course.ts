import type { Course } from '../../../../../domain/challenge.types';
import type { PythonChallenge } from '../../types';
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

const challenges: PythonChallenge[] = [
  challenge01,
  challenge02,
  challenge03,
  challenge04,
  challenge05,
  challenge06,
  challenge07,
  challenge08,
  challenge09,
  challenge10,
];

export const pythonGrundlagenCourse: Course<PythonChallenge> = {
  id: 'pythonGrundlagen',
  title: 'Python Grundlagen',
  description: 'Die absoluten Grundlagen von Python — keine Vorkenntnisse nötig.',
  challenges,
};
