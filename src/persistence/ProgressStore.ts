import type { ProgressState } from '../domain/progress/progressModel';

export interface ProgressStore {
  load(): ProgressState;
  save(state: ProgressState): void;
}
