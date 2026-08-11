import { describe, expect, it } from 'vitest';
import type { CSharpExecuteAndValidateOutcome } from '../../../../runtime/csharp/executeAndValidate';
import { renderCSharpLoadingOutcome, renderCSharpRunOutcome } from './csharpResultsArea';

const base: CSharpExecuteAndValidateOutcome = {
  ok: false,
  message: '',
  error: null,
  result: null,
};

describe('renderCSharpRunOutcome', () => {
  it('renders a C# error (compiler diagnostic or uncaught exception) as an error status with no stdout block', () => {
    const html = renderCSharpRunOutcome({ ...base, error: "(1,9): error CS0029: Cannot implicitly convert type 'string' to 'int'" }, 0);
    expect(html).toContain('status-err');
    expect(html).toContain('CS0029');
    expect(html).not.toContain('Ausgabe (stdout)');
  });

  it('escapes the error message', () => {
    const html = renderCSharpRunOutcome({ ...base, error: '<script>alert(1)</script>' }, 0);
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('renders success with the validation message, earned stars, and stdout', () => {
    const outcome: CSharpExecuteAndValidateOutcome = {
      ...base,
      ok: true,
      message: 'x korrekt berechnet: 4.',
      result: { stdout: 'x = 4\n', error: null },
    };
    const html = renderCSharpRunOutcome(outcome, 3);
    expect(html).toContain('status-ok');
    expect(html).toContain('x korrekt berechnet: 4.');
    expect(html).toContain('★★★');
    expect(html).toContain('Ausgabe (stdout)');
    expect(html).toContain('<pre>x = 4\n</pre>');
  });

  it('renders a validation failure as a warning, still showing stdout', () => {
    const outcome: CSharpExecuteAndValidateOutcome = {
      ...base,
      ok: false,
      message: 'x ist 6, erwartet wird 4.',
      result: { stdout: 'x = 6\n', error: null },
    };
    const html = renderCSharpRunOutcome(outcome, 0);
    expect(html).toContain('status-warn');
    expect(html).toContain('x ist 6, erwartet wird 4.');
    expect(html).toContain('Ausgabe (stdout)');
  });

  it('shows an empty-state when stdout is empty (no Console.WriteLine)', () => {
    const outcome: CSharpExecuteAndValidateOutcome = { ...base, ok: true, message: 'ok', result: { stdout: '', error: null } };
    const html = renderCSharpRunOutcome(outcome, 1);
    expect(html).toContain('Keine Ausgabe (kein Console.WriteLine)');
    expect(html).not.toContain('<pre>');
  });

  it('shows an empty-state when result is null (no error, but nothing ran yet)', () => {
    const html = renderCSharpRunOutcome({ ...base, ok: false, message: 'x' }, 0);
    expect(html).toContain('Keine Ausgabe (kein Console.WriteLine)');
  });

  it('escapes stdout content', () => {
    const outcome: CSharpExecuteAndValidateOutcome = {
      ...base,
      ok: true,
      message: 'ok',
      result: { stdout: '<img src=x onerror=alert(1)>\n', error: null },
    };
    const html = renderCSharpRunOutcome(outcome, 0);
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
  });

  it('does not render a status-stars span when 0 stars are earned on a validation failure', () => {
    const outcome: CSharpExecuteAndValidateOutcome = { ...base, ok: false, message: 'nope', result: { stdout: '', error: null } };
    const html = renderCSharpRunOutcome(outcome, 0);
    expect(html).not.toContain('status-stars');
  });
});

describe('renderCSharpLoadingOutcome', () => {
  it('renders a loading message', () => {
    const html = renderCSharpLoadingOutcome();
    expect(html).toContain('C#-Umgebung wird geladen');
    expect(html).toContain('empty-state');
  });
});
