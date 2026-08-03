import { describe, expect, it } from 'vitest';
import { withTimeout } from './withTimeout';

describe('withTimeout', () => {
  it("resolves with the inner promise's value when it settles before the timeout", async () => {
    const inner = Promise.resolve('done');
    await expect(withTimeout(inner, 1000, 'timed out')).resolves.toBe('done');
  });

  it("rejects with the inner promise's error when it rejects before the timeout", async () => {
    const inner = Promise.reject(new Error('boom'));
    await expect(withTimeout(inner, 1000, 'timed out')).rejects.toThrow('boom');
  });

  it('rejects with the timeout message when the inner promise never settles', async () => {
    const inner = new Promise<string>(() => {
      /* never settles — simulates a CSP-blocked script whose error event never fires */
    });
    await expect(withTimeout(inner, 20, 'blocked by CSP')).rejects.toThrow('blocked by CSP');
  });
});
