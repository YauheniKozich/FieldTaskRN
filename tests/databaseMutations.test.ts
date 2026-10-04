import * as SQLite from 'expo-sqlite';
import {
  addAttachmentsMutation,
  applySyncResult,
  softDeleteTaskWithHistory,
} from '../src/storage/database';
import { Attachment, HistoryEntry, Task } from '../src/types';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

const task: Task = {
  id: 'task',
  title: 'Inspect',
  description: 'Check',
  location: 'Depot',
  dueAt: '2026-10-04T09:00:00.000Z',
  latitude: null,
  longitude: null,
  status: 'new',
  createdAt: '2026-09-28T10:00:00.000Z',
  updatedAt: '2026-09-29T10:00:00.000Z',
  syncStatus: 'pending',
  deletedAt: null,
  notificationId: 'reminder-id',
  reminderVersion: '2026-09-29T10:00:00.000Z',
};

const attachment = (id: string): Attachment => ({
  id,
  taskId: task.id,
  type: 'image',
  localUri: `file://${id}`,
  fileName: `${id}.jpg`,
  mimeType: 'image/jpeg',
  createdAt: '2026-09-29T10:00:00.000Z',
});

const entry: HistoryEntry = {
  id: 'history',
  taskId: task.id,
  action: 'task_deleted',
  description: 'Deleted task',
  createdAt: '2026-09-29T10:01:00.000Z',
};

const state = {
  tasks: new Map<string, string>([[task.id, JSON.stringify(task)]]),
  attachments: new Map<string, Attachment>(),
  history: new Map<string, string>(),
  reminderCleanup: new Set<string>(),
};
let failOnSecondAttachment = false;

beforeAll(() => {
  const db = {
    execAsync: jest.fn().mockResolvedValue(undefined),
    getFirstAsync: jest.fn().mockResolvedValue({ user_version: 2 }),
    withExclusiveTransactionAsync: jest.fn(async (callback: (txn: unknown) => Promise<void>) => {
      const working = {
        tasks: new Map(state.tasks),
        attachments: new Map(state.attachments),
        history: new Map(state.history),
        reminderCleanup: new Set(state.reminderCleanup),
      };
      let attachmentInserts = 0;
      const txn = {
        getFirstAsync: async (_sql: string, id: string) => {
          const payload = working.tasks.get(id);
          return payload ? { payload } : null;
        },
        getAllAsync: async (_sql: string, taskId: string) =>
          Array.from(working.attachments.values())
            .filter(item => item.taskId === taskId)
            .map(item => ({ payload: JSON.stringify(item) })),
        runAsync: async (sql: string, ...args: string[]) => {
          if (sql.startsWith('INSERT OR REPLACE INTO tasks')) working.tasks.set(args[0], args[1]);
          else if (sql.startsWith('INSERT INTO attachments')) {
            attachmentInserts += 1;
            if (failOnSecondAttachment && attachmentInserts === 2) throw new Error('Storage full');
            working.attachments.set(args[0], JSON.parse(args[2]) as Attachment);
          } else if (sql.startsWith('DELETE FROM attachments WHERE task_id')) {
            for (const [id, item] of working.attachments)
              if (item.taskId === args[0]) working.attachments.delete(id);
          } else if (sql.startsWith('DELETE FROM tasks')) working.tasks.delete(args[0]);
          else if (sql.startsWith('INSERT INTO history')) working.history.set(args[0], args[1]);
          else if (sql.startsWith('INSERT OR IGNORE INTO reminder_cleanup'))
            working.reminderCleanup.add(args[0]);
        },
      };
      await callback(txn);
      state.tasks = working.tasks;
      state.attachments = working.attachments;
      state.history = working.history;
      state.reminderCleanup = working.reminderCleanup;
    }),
  };
  jest.mocked(SQLite.openDatabaseAsync).mockResolvedValue(db as unknown as SQLite.SQLiteDatabase);
});

it('rolls back every attachment in a batch when one insert fails', async () => {
  failOnSecondAttachment = true;
  await expect(
    addAttachmentsMutation([attachment('one'), attachment('two')], task, [
      entry,
      { ...entry, id: 'other' },
    ]),
  ).rejects.toThrow('Storage full');
  expect(state.attachments.size).toBe(0);
  expect(state.tasks.get(task.id)).toBe(JSON.stringify(task));
  failOnSecondAttachment = false;
});

it('retains attachments in a tombstone and removes them only after sync commits deletion', async () => {
  state.attachments.set('one', attachment('one'));
  const deleted: Task = {
    ...task,
    deletedAt: '2026-09-29T10:01:00.000Z',
    updatedAt: '2026-09-29T10:01:00.000Z',
  };
  await softDeleteTaskWithHistory(deleted, task, entry);
  expect(state.attachments.has('one')).toBe(true);

  const result = await applySyncResult([deleted], [task.id], [deleted], [task.id], count => ({
    ...entry,
    id: 'sync',
    action: 'sync_succeeded',
    description: String(count),
  }));
  expect(result.deletedAttachments).toEqual([attachment('one')]);
  expect(state.attachments.size).toBe(0);
  expect(state.tasks.has(task.id)).toBe(false);
  expect(state.reminderCleanup.has('reminder-id')).toBe(true);
});
