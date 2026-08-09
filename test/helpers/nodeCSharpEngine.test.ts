import { describe, expect, it } from 'vitest';
import { createNodeCSharpEngine } from './nodeCSharpEngine';

describe('createNodeCSharpEngine', () => {
  it('captures Console.WriteLine output as stdout, error null on success', async () => {
    const engine = createNodeCSharpEngine();
    const result = await engine.exec('Console.WriteLine("Hallo, Welt");\nConsole.WriteLine(3 + 4);');
    expect(result.error).toBeNull();
    expect(result.stdout).toBe('Hallo, Welt\n7\n');
  });

  it('reports a compiler diagnostic in `error` for code that fails to compile', async () => {
    const engine = createNodeCSharpEngine();
    const result = await engine.exec('int x = "not an int";');
    expect(result.error).not.toBeNull();
    expect(result.error).toContain('CS0029');
  });

  it('reports an exception in `error` for code that throws at runtime', async () => {
    const engine = createNodeCSharpEngine();
    const result = await engine.exec('int[] arr = new int[2];\nConsole.WriteLine(arr[5]);');
    expect(result.error).not.toBeNull();
    expect(result.error).toContain('IndexOutOfRangeException');
  });

  it('runs each exec() as a fresh program (no state carried over)', async () => {
    const engine = createNodeCSharpEngine();
    await engine.exec('int x = 1;');
    const result = await engine.exec('Console.WriteLine(x);');
    expect(result.error).not.toBeNull();
    expect(result.error).toContain('CS0103');
  });

  it('supports LINQ and collections via the global usings the driver injects', async () => {
    const engine = createNodeCSharpEngine();
    const result = await engine.exec(
      'var nums = new List<int> { 1, 2, 3, 4, 5 };\nvar sum = nums.Where(n => n % 2 == 0).Sum();\nConsole.WriteLine(sum);',
    );
    expect(result.error).toBeNull();
    expect(result.stdout).toBe('6\n');
  });
});
