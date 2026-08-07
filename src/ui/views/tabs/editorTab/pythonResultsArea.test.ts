import { describe, expect, it } from 'vitest';
import type { RunOutcome } from '../../../state/actions';
import { renderPythonLoadingOutcome, renderPythonRunOutcome } from './pythonResultsArea';

type PythonOutcome = Extract<RunOutcome, { kind: 'python' }>;

const base: PythonOutcome = {
  kind: 'python',
  ok: false,
  message: '',
  error: null,
  result: null,
};

describe('renderPythonRunOutcome', () => {
  it('renders a Python error as an error status with no stdout/variables blocks', () => {
    const html = renderPythonRunOutcome({ ...base, error: 'Traceback (most recent call last):\n  ...\nNameError: x' }, 0);
    expect(html).toContain('status-err');
    expect(html).toContain('NameError: x');
    expect(html).not.toContain('result-table');
    expect(html).not.toContain('Ausgabe (stdout)');
  });

  it('escapes the error message', () => {
    const html = renderPythonRunOutcome({ ...base, error: '<script>alert(1)</script>' }, 0);
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('renders success with the validation message, earned stars, stdout and variables', () => {
    const outcome: PythonOutcome = {
      ...base,
      ok: true,
      message: 'anzahl_a korrekt berechnet: 3.',
      result: { stdout: '3\n', variables: { anzahl_a: 3, wort: 'ananas' }, error: null },
    };
    const html = renderPythonRunOutcome(outcome, 3);
    expect(html).toContain('status-ok');
    expect(html).toContain('anzahl_a korrekt berechnet: 3.');
    expect(html).toContain('★★★');
    expect(html).toContain('Ausgabe (stdout)');
    expect(html).toContain('<pre>3\n</pre>');
    expect(html).toContain('result-table');
    expect(html).toContain('anzahl_a');
    expect(html).toContain('3');
    expect(html).toContain('wort');
  });

  it('renders a validation failure as a warning, still showing stdout and variables', () => {
    const outcome: PythonOutcome = {
      ...base,
      ok: false,
      message: 'anzahl_a ist 6, erwartet wird 3.',
      result: { stdout: '6\n', variables: { anzahl_a: 6 }, error: null },
    };
    const html = renderPythonRunOutcome(outcome, 0);
    expect(html).toContain('status-warn');
    expect(html).toContain('anzahl_a ist 6, erwartet wird 3.');
    expect(html).toContain('Ausgabe (stdout)');
    expect(html).toContain('result-table');
  });

  it('shows an empty-state when stdout is empty (no print())', () => {
    const outcome: PythonOutcome = { ...base, ok: true, message: 'ok', result: { stdout: '', variables: { x: 1 }, error: null } };
    const html = renderPythonRunOutcome(outcome, 1);
    expect(html).toContain('Keine Ausgabe (kein print())');
    expect(html).not.toContain('<pre>');
  });

  it('shows an empty-state when there are no variables', () => {
    const outcome: PythonOutcome = { ...base, ok: true, message: 'ok', result: { stdout: 'hi\n', variables: {}, error: null } };
    const html = renderPythonRunOutcome(outcome, 1);
    expect(html).toContain('Keine Variablen.');
  });

  it('omits the variables block entirely when result is null (no error, but nothing ran yet)', () => {
    const html = renderPythonRunOutcome({ ...base, ok: false, message: 'x' }, 0);
    expect(html).not.toContain('Variablen');
    expect(html).toContain('Keine Ausgabe (kein print())');
  });

  it('escapes stdout content', () => {
    const outcome: PythonOutcome = {
      ...base,
      ok: true,
      message: 'ok',
      result: { stdout: '<img src=x onerror=alert(1)>\n', variables: {}, error: null },
    };
    const html = renderPythonRunOutcome(outcome, 0);
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
  });

  it('escapes variable names and JSON-stringified values, including nested structures', () => {
    const outcome: PythonOutcome = {
      ...base,
      ok: true,
      message: 'ok',
      result: {
        stdout: '',
        variables: {
          '<b>evil</b>': '<script>x</script>',
          liste: [1, 2, 3],
          verschachtelt: { a: 1, b: [true, null] },
          flag: false,
        },
        error: null,
      },
    };
    const html = renderPythonRunOutcome(outcome, 0);
    expect(html).toContain('&lt;b&gt;evil&lt;/b&gt;');
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('[1,2,3]');
    expect(html).toContain('false');
  });

  it('does not render a status-stars span when 0 stars are earned on a validation failure', () => {
    const outcome: PythonOutcome = { ...base, ok: false, message: 'nope', result: { stdout: '', variables: {}, error: null } };
    const html = renderPythonRunOutcome(outcome, 0);
    expect(html).not.toContain('status-stars');
  });
});

describe('renderPythonLoadingOutcome', () => {
  it('renders a loading message', () => {
    const html = renderPythonLoadingOutcome();
    expect(html).toContain('Python-Umgebung wird geladen');
    expect(html).toContain('empty-state');
  });
});
