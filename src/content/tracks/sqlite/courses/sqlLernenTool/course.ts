import type { Course } from '../../../../../domain/challenge.types';
import type { SqlChallenge } from '../../types';
import { challenge01 } from './challenges/01';
import { challenge1_1 } from './challenges/1_1';
import { challenge1_2 } from './challenges/1_2';
import { challenge02 } from './challenges/02';
import { challenge2_1 } from './challenges/2_1';
import { challenge2_2 } from './challenges/2_2';
import { challenge03 } from './challenges/03';
import { challenge3_1 } from './challenges/3_1';
import { challenge3_2 } from './challenges/3_2';
import { challenge3_3 } from './challenges/3_3';
import { challenge04 } from './challenges/04';
import { challenge4_1 } from './challenges/4_1';
import { challenge4_2 } from './challenges/4_2';
import { challenge05 } from './challenges/05';
import { challenge5_1 } from './challenges/5_1';
import { challenge5_2 } from './challenges/5_2';
import { challenge06 } from './challenges/06';
import { challenge6_1 } from './challenges/6_1';
import { challenge6_2 } from './challenges/6_2';
import { challenge07 } from './challenges/07';
import { challenge7_1 } from './challenges/7_1';
import { challenge7_2 } from './challenges/7_2';
import { challenge08 } from './challenges/08';
import { challenge8_1 } from './challenges/8_1';
import { challenge8_2 } from './challenges/8_2';
import { challenge09 } from './challenges/09';
import { challenge9_1 } from './challenges/9_1';
import { challenge9_2 } from './challenges/9_2';
import { challenge10 } from './challenges/10';
import { challenge10_1 } from './challenges/10_1';
import { challenge10_2 } from './challenges/10_2';
import { challenge11 } from './challenges/11';
import { challenge11_1 } from './challenges/11_1';
import { challenge11_2 } from './challenges/11_2';
import { challenge11_3 } from './challenges/11_3';
import { challenge11_4 } from './challenges/11_4';
import { challenge11_5 } from './challenges/11_5';
import { challenge11_6 } from './challenges/11_6';
import { challenge11_7 } from './challenges/11_7';
import { challenge12 } from './challenges/12';
import { challenge13 } from './challenges/13';
import { challenge14 } from './challenges/14';
import { challenge14_1 } from './challenges/14_1';
import { challenge14_2 } from './challenges/14_2';
import { challenge14_3 } from './challenges/14_3';
import { challenge14_4 } from './challenges/14_4';
import { challenge14_5 } from './challenges/14_5';
import { challenge15 } from './challenges/15';
import { challenge15_1 } from './challenges/15_1';
import { challenge15_2 } from './challenges/15_2';
import { challenge15_3 } from './challenges/15_3';
import { challenge15_4 } from './challenges/15_4';
import { challenge16 } from './challenges/16';
import { challenge16_1 } from './challenges/16_1';
import { challenge16_2 } from './challenges/16_2';
import { challenge17 } from './challenges/17';
import { challenge18 } from './challenges/18';
import { challenge18_1 } from './challenges/18_1';
import { challenge18_2 } from './challenges/18_2';
import { challenge19 } from './challenges/19';
import { challenge19_1 } from './challenges/19_1';
import { challenge20 } from './challenges/20';
import { challenge20_1 } from './challenges/20_1';
import { challenge20_2 } from './challenges/20_2';
import { challenge20_3 } from './challenges/20_3';
import { challenge20_4 } from './challenges/20_4';
import { challenge21 } from './challenges/21';
import { challenge21_1 } from './challenges/21_1';
import { challenge21_2 } from './challenges/21_2';
import { challenge22 } from './challenges/22';
import { challenge22_1 } from './challenges/22_1';
import { challenge23 } from './challenges/23';
import { challenge23_1 } from './challenges/23_1';
import { challenge23_2 } from './challenges/23_2';
import { challenge24 } from './challenges/24';
import { challenge24_1 } from './challenges/24_1';
import { challenge24_2 } from './challenges/24_2';
import { challenge25 } from './challenges/25';

const challenges: SqlChallenge[] = [
  challenge01,
  challenge1_1,
  challenge1_2,
  challenge02,
  challenge2_1,
  challenge2_2,
  challenge03,
  challenge3_1,
  challenge3_2,
  challenge3_3,
  challenge04,
  challenge4_1,
  challenge4_2,
  challenge05,
  challenge5_1,
  challenge5_2,
  challenge06,
  challenge6_1,
  challenge6_2,
  challenge07,
  challenge7_1,
  challenge7_2,
  challenge08,
  challenge8_1,
  challenge8_2,
  challenge09,
  challenge9_1,
  challenge9_2,
  challenge10,
  challenge10_1,
  challenge10_2,
  challenge11,
  challenge11_1,
  challenge11_2,
  challenge11_3,
  challenge11_4,
  challenge11_5,
  challenge11_6,
  challenge11_7,
  challenge12,
  challenge13,
  challenge14,
  challenge14_1,
  challenge14_2,
  challenge14_3,
  challenge14_4,
  challenge14_5,
  challenge15,
  challenge15_1,
  challenge15_2,
  challenge15_3,
  challenge15_4,
  challenge16,
  challenge16_1,
  challenge16_2,
  challenge17,
  challenge18,
  challenge18_1,
  challenge18_2,
  challenge19,
  challenge19_1,
  challenge20,
  challenge20_1,
  challenge20_2,
  challenge20_3,
  challenge20_4,
  challenge21,
  challenge21_1,
  challenge21_2,
  challenge22,
  challenge22_1,
  challenge23,
  challenge23_1,
  challenge23_2,
  challenge24,
  challenge24_1,
  challenge24_2,
  challenge25,
];

export const sqlLernenToolCourse: Course<SqlChallenge> = {
  id: 'sqlLernenTool',
  title: 'SQL Lernen Tool',
  description: 'SQLite im Browser, mit Tutorials, Tipps und Postgres-Hinweisen.',
  challenges,
};
