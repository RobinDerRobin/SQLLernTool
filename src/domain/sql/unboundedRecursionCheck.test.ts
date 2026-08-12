import { describe, expect, it } from 'vitest';
import { findUnboundedRecursion } from './unboundedRecursionCheck';

describe('findUnboundedRecursion', () => {
  it('returns null for a recursive CTE with a WHERE bound in the recursive member', () => {
    const sql = `WITH RECURSIVE seq(n) AS (
      SELECT 1
      UNION ALL
      SELECT n + 1 FROM seq WHERE n < 100
    )
    SELECT * FROM seq;`;
    expect(findUnboundedRecursion(sql)).toBeNull();
  });

  it('returns null when the recursive member has no WHERE but the outer query has a LIMIT', () => {
    const sql = `WITH RECURSIVE seq(n) AS (
      SELECT 1
      UNION ALL
      SELECT n + 1 FROM seq
    )
    SELECT * FROM seq LIMIT 10;`;
    expect(findUnboundedRecursion(sql)).toBeNull();
  });

  it('flags a recursive CTE with neither WHERE nor LIMIT', () => {
    const sql = `WITH RECURSIVE seq(n) AS (
      SELECT 1
      UNION ALL
      SELECT n + 1 FROM seq
    )
    SELECT * FROM seq;`;
    const result = findUnboundedRecursion(sql);
    expect(result).not.toBeNull();
    expect(result).toContain('WITH RECURSIVE');
  });

  it('flags it even when wrapped in an INSERT ... SELECT (the dangerous, non-interruptible case)', () => {
    const sql = `CREATE TABLE t (n INTEGER);
    WITH RECURSIVE seq(n) AS (
      SELECT 1
      UNION ALL
      SELECT n + 1 FROM seq
    )
    INSERT INTO t SELECT n FROM seq;`;
    expect(findUnboundedRecursion(sql)).not.toBeNull();
  });

  it('is not fooled by a WHERE that only appears in the anchor, not the recursive member', () => {
    const sql = `WITH RECURSIVE seq(n) AS (
      SELECT 1 WHERE 1 = 1
      UNION ALL
      SELECT n + 1 FROM seq
    )
    SELECT * FROM seq;`;
    expect(findUnboundedRecursion(sql)).not.toBeNull();
  });

  it('sanity: a real WHERE (outside any string) in the recursive member is still detected fine', () => {
    const sql = `WITH RECURSIVE seq(n) AS (
      SELECT 1
      UNION ALL
      SELECT n + 1 FROM seq WHERE n < 5
    )
    SELECT * FROM seq;`;
    expect(findUnboundedRecursion(sql)).toBeNull();
  });

  it('is not fooled by a WHERE-lookalike that only appears inside a string literal — still flags it as unbounded', () => {
    const sql = `WITH RECURSIVE seq(n) AS (
      SELECT 1
      UNION ALL
      SELECT n + 1, 'not a real WHERE n < 5 clause' FROM seq
    )
    SELECT * FROM seq;`;
    expect(findUnboundedRecursion(sql)).not.toBeNull();
  });

  it('correctly skips a doubled single-quote (SQL escape for an embedded quote) without losing track of a real WHERE afterward', () => {
    const sql = `WITH RECURSIVE seq(n) AS (
      SELECT 1
      UNION ALL
      SELECT n + 1, 'it''s a test' FROM seq WHERE n < 5
    )
    SELECT * FROM seq;`;
    expect(findUnboundedRecursion(sql)).toBeNull();
  });

  it('correctly skips a doubled single-quote inside a string containing a WHERE-lookalike — still flags it as unbounded', () => {
    const sql = `WITH RECURSIVE seq(n) AS (
      SELECT 1
      UNION ALL
      SELECT n + 1, 'it''s WHERE n < 5, or is it?' FROM seq
    )
    SELECT * FROM seq;`;
    expect(findUnboundedRecursion(sql)).not.toBeNull();
  });

  it('does not crash and safely returns null for a malformed CTE missing its closing paren', () => {
    const sql = `WITH RECURSIVE seq(n) AS (
      SELECT 1
      UNION ALL
      SELECT n + 1 FROM seq`;
    expect(findUnboundedRecursion(sql)).toBeNull();
  });

  it('ignores a `)` inside a string literal or comment when finding the CTE body end', () => {
    const sql = `WITH RECURSIVE seq(n) AS (
      SELECT 1, ')' AS marker -- a comment with ) in it
      UNION ALL
      SELECT n + 1 FROM seq WHERE n < 5
    )
    SELECT * FROM seq;`;
    expect(findUnboundedRecursion(sql)).toBeNull();
  });

  it('returns null for SQL with no recursive CTE at all', () => {
    expect(findUnboundedRecursion('SELECT * FROM users;')).toBeNull();
  });

  it('is not fooled by a WHERE that only appears inside a line comment in the recursive member', () => {
    const sql = `WITH RECURSIVE seq(n) AS (
      SELECT 1
      UNION ALL
      SELECT n + 1 FROM seq -- WHERE n < 100
    )
    SELECT * FROM seq;`;
    expect(findUnboundedRecursion(sql)).not.toBeNull();
  });

  it('is not fooled by a LIMIT that only appears inside a block comment after the CTE', () => {
    const sql = `WITH RECURSIVE seq(n) AS (
      SELECT 1
      UNION ALL
      SELECT n + 1 FROM seq
    )
    SELECT * FROM seq; /* LIMIT 10 */`;
    expect(findUnboundedRecursion(sql)).not.toBeNull();
  });

  it('is not thrown off by an unbalanced paren inside a comment in the recursive member', () => {
    const sql = `WITH RECURSIVE seq(n) AS (
      SELECT 1
      UNION ALL
      SELECT n + 1 FROM seq -- a stray ( paren in a comment
    )
    SELECT * FROM seq;`;
    expect(findUnboundedRecursion(sql)).not.toBeNull();
  });

  it('handles multiple statements, flagging only the unbounded one', () => {
    const sql = `WITH RECURSIVE bounded(n) AS (
      SELECT 1 UNION ALL SELECT n + 1 FROM bounded WHERE n < 10
    )
    SELECT * FROM bounded;

    WITH RECURSIVE unbounded(n) AS (
      SELECT 1 UNION ALL SELECT n + 1 FROM unbounded
    )
    SELECT * FROM unbounded;`;
    expect(findUnboundedRecursion(sql)).not.toBeNull();
  });
});
