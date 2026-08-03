import { describe, expect, it } from 'vitest';
import { extractCreatedTableNames } from './tableNames';

describe('extractCreatedTableNames', () => {
  it('extracts a simple CREATE TABLE name', () => {
    expect(extractCreatedTableNames('CREATE TABLE users (id INTEGER);')).toEqual(['users']);
  });

  it('extracts a name after IF NOT EXISTS', () => {
    expect(extractCreatedTableNames('CREATE TABLE IF NOT EXISTS users (id INTEGER);')).toEqual(['users']);
  });

  it('is case-insensitive on the keywords', () => {
    expect(extractCreatedTableNames('create table users (id integer);')).toEqual(['users']);
  });

  it('strips quoting characters around the name', () => {
    expect(extractCreatedTableNames('CREATE TABLE "users" (id INTEGER);')).toEqual(['users']);
    expect(extractCreatedTableNames("CREATE TABLE 'users' (id INTEGER);")).toEqual(['users']);
    expect(extractCreatedTableNames('CREATE TABLE `users` (id INTEGER);')).toEqual(['users']);
  });

  it('extracts multiple distinct table names from multi-statement SQL', () => {
    const sql = 'CREATE TABLE a (id INTEGER);\nCREATE TABLE b (id INTEGER);';
    expect(extractCreatedTableNames(sql)).toEqual(['a', 'b']);
  });

  it('deduplicates repeated CREATE TABLE statements for the same name', () => {
    const sql = 'CREATE TABLE a (id INTEGER);\nDROP TABLE a;\nCREATE TABLE a (id INTEGER);';
    expect(extractCreatedTableNames(sql)).toEqual(['a']);
  });

  it('handles CREATE TABLE ... AS SELECT', () => {
    expect(extractCreatedTableNames('CREATE TABLE active_users AS SELECT * FROM users;')).toEqual(['active_users']);
  });

  it('returns an empty array when there is no CREATE TABLE statement', () => {
    expect(extractCreatedTableNames('SELECT * FROM users;')).toEqual([]);
  });
});
