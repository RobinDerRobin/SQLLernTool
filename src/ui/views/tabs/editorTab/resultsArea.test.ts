import { describe, expect, it } from 'vitest';
import type { ExecuteAndValidateOutcome } from '../../../../runtime/sql/executeAndValidate';
import { renderRunOutcome } from './resultsArea';

const base: ExecuteAndValidateOutcome = { ok: false, message: '', error: null, results: [], last: null };

describe('renderRunOutcome', () => {
  it('renders a SQL error as an error status with no result table', () => {
    const html = renderRunOutcome({ ...base, error: 'Zeile 2: near "SELEKT": syntax error' }, 0);
    expect(html).toContain('status-err');
    expect(html).toContain('Zeile 2');
    expect(html).not.toContain('<table');
  });

  it('escapes the error message', () => {
    const html = renderRunOutcome({ ...base, error: '<script>' }, 0);
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders success with the validation message and earned stars', () => {
    const outcome: ExecuteAndValidateOutcome = {
      ...base,
      ok: true,
      message: 'users enthält 5 Zeilen.',
      results: [{ columns: ['id'], values: [[1]] }],
      last: { columns: ['id'], values: [[1]] },
    };
    const html = renderRunOutcome(outcome, 3);
    expect(html).toContain('status-ok');
    expect(html).toContain('users enthält 5 Zeilen.');
    expect(html).toContain('★★★');
    expect(html).toContain('<table');
  });

  it('renders a validation failure as a warning, still showing the result table', () => {
    const outcome: ExecuteAndValidateOutcome = {
      ...base,
      ok: false,
      message: 'Nur 3 Zeilen — erwartet 5.',
      results: [{ columns: ['id'], values: [[1]] }],
      last: { columns: ['id'], values: [[1]] },
    };
    const html = renderRunOutcome(outcome, 0);
    expect(html).toContain('status-warn');
    expect(html).toContain('Nur 3 Zeilen');
    expect(html).toContain('<table');
  });

  it('notes when a statement produced no tabular result at all', () => {
    const outcome: ExecuteAndValidateOutcome = { ...base, ok: true, message: 'ok', results: [], last: null };
    const html = renderRunOutcome(outcome, 3);
    expect(html).toContain('Kein tabellarisches Ergebnis');
  });
});
