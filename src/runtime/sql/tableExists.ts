import type { SqlEngine } from './SqlEngine';

/** Ported from the prototype's `tableExists` helper, used inside many challenges' `validate()`. */
export function tableExists(engine: SqlEngine, name: string): boolean {
  try {
    const result = engine.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`);
    return result.length > 0 && (result[0]?.values.length ?? 0) > 0;
  } catch {
    return false;
  }
}
