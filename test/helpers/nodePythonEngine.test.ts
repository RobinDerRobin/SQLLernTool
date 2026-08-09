import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createNodePythonEngine } from './nodePythonEngine';

describe('createNodePythonEngine', () => {
  it('captures print() output separately from the returned variables', () => {
    const engine = createNodePythonEngine();
    const result = engine.exec('name = "Anna"\nprint("Hallo,", name)');
    expect(result.error).toBeNull();
    expect(result.stdout.trim()).toBe('Hallo, Anna');
    expect(result.variables).toEqual({ name: 'Anna' });
  });

  it('reports a formatted traceback in `error` when the script raises', () => {
    const engine = createNodePythonEngine();
    const result = engine.exec('1 / 0');
    expect(result.error).not.toBeNull();
    expect(result.error).toContain('ZeroDivisionError');
  });

  it('excludes non-JSON-serializable names (functions, modules) from `variables`', () => {
    const engine = createNodePythonEngine();
    const result = engine.exec('import math\ndef f():\n    pass\nx = 42');
    expect(result.error).toBeNull();
    expect(result.variables).toEqual({ x: 42 });
  });

  it('runs each exec() in a fresh namespace (no state carried over)', () => {
    const engine = createNodePythonEngine();
    engine.exec('x = 1');
    const result = engine.exec('print(x)');
    expect(result.error).toContain('NameError');
  });

  it('isolates relative-path file I/O to a temp dir instead of the process cwd', () => {
    const engine = createNodePythonEngine();
    const result = engine.exec(
      'with open("notizen.txt", "w") as f:\n    f.write("Hallo")\nwith open("notizen.txt") as f:\n    inhalt = f.read()',
    );
    expect(result.error).toBeNull();
    expect(result.variables).toEqual({ inhalt: 'Hallo' });
    expect(existsSync(join(process.cwd(), 'notizen.txt'))).toBe(false);
  });

  it('serializes ints, floats, bools, lists, dicts, and None correctly', () => {
    const engine = createNodePythonEngine();
    const result = engine.exec(
      'a = 1\nb = 2.5\nc = True\nd = [1, 2, 3]\ne = {"k": "v"}\nf = None',
    );
    expect(result.error).toBeNull();
    expect(result.variables).toEqual({ a: 1, b: 2.5, c: true, d: [1, 2, 3], e: { k: 'v' }, f: null });
  });
});
