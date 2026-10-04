import * as SQLite from 'expo-sqlite';
import { database } from '../src/storage/database';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

it('adds the reminder cancellation queue when opening a version 1 database', async () => {
  const statements: string[] = [];
  const db = {
    execAsync: jest.fn(async (sql: string) => {
      statements.push(sql);
    }),
    getFirstAsync: jest.fn().mockResolvedValue({ user_version: 1 }),
    withTransactionAsync: jest.fn(async (callback: () => Promise<void>) => {
      await callback();
    }),
  };
  jest.mocked(SQLite.openDatabaseAsync).mockResolvedValue(db as unknown as SQLite.SQLiteDatabase);

  await database();
  expect(statements).toContain(
    'CREATE TABLE IF NOT EXISTS reminder_cleanup (id TEXT PRIMARY KEY NOT NULL);',
  );
  expect(statements).toContain('PRAGMA user_version = 2;');
});
