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
import { challenge11 } from './challenges/11';
import { challenge11_1 } from './challenges/11_1';
import { challenge11_2 } from './challenges/11_2';
import { challenge11_3 } from './challenges/11_3';
import { challenge11_4 } from './challenges/11_4';
import { challenge11_5 } from './challenges/11_5';
import { challenge12 } from './challenges/12';
import { challenge12_1 } from './challenges/12_1';
import { challenge12_2 } from './challenges/12_2';
import { challenge12_3 } from './challenges/12_3';
import { challenge12_4 } from './challenges/12_4';
import { challenge12_5 } from './challenges/12_5';
import { challenge12_6 } from './challenges/12_6';
import { challenge12_7 } from './challenges/12_7';
import { challenge12_8 } from './challenges/12_8';
import { challenge12_9 } from './challenges/12_9';
import { challenge12_10 } from './challenges/12_10';
import { challenge13 } from './challenges/13';
import { challenge13_1 } from './challenges/13_1';
import { challenge13_2 } from './challenges/13_2';
import { challenge13_3 } from './challenges/13_3';
import { challenge13_4 } from './challenges/13_4';
import { challenge13_5 } from './challenges/13_5';
import { challenge13_6 } from './challenges/13_6';
import { challenge13_7 } from './challenges/13_7';
import { challenge13_8 } from './challenges/13_8';
import { challenge13_9 } from './challenges/13_9';

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
  challenge11,
  challenge11_1,
  challenge11_2,
  challenge11_3,
  challenge11_4,
  challenge11_5,
  challenge12,
  challenge12_1,
  challenge12_2,
  challenge12_3,
  challenge12_4,
  challenge12_5,
  challenge12_6,
  challenge12_7,
  challenge12_8,
  challenge12_9,
  challenge12_10,
  challenge13,
  challenge13_1,
  challenge13_2,
  challenge13_3,
  challenge13_4,
  challenge13_5,
  challenge13_6,
  challenge13_7,
  challenge13_8,
  challenge13_9,
];

export const pythonGrundlagenCourse: Course<PythonChallenge> = {
  id: 'pythonGrundlagen',
  title: 'Python Grundlagen',
  description: 'Die absoluten Grundlagen von Python — keine Vorkenntnisse nötig.',
  challenges,
};
