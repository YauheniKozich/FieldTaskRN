import * as SQLite from 'expo-sqlite';
import { Attachment, HistoryEntry, Task } from '../types';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function database(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const db = await SQLite.openDatabaseAsync('fieldtask.db');
      await db.execAsync('PRAGMA journal_mode = WAL;');
      const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      if ((version?.user_version ?? 0) < 1) {
        await db.withTransactionAsync(async () => {
          await db.execAsync(`
            CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS attachments (id TEXT PRIMARY KEY NOT NULL, task_id TEXT NOT NULL, payload TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS history (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
          `);
          await db.execAsync('PRAGMA user_version = 1;');
        });
      }
      if ((version?.user_version ?? 0) < 2) {
        await db.withTransactionAsync(async () => {
          await db.execAsync(
            'CREATE TABLE IF NOT EXISTS reminder_cleanup (id TEXT PRIMARY KEY NOT NULL);',
          );
          await db.execAsync('PRAGMA user_version = 2;');
        });
      }
      return db;
    })().catch(error => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

export async function listTasks(includeDeleted = false): Promise<Task[]> {
  const db = await database();
  const rows = await db.getAllAsync<{ payload: string }>('SELECT payload FROM tasks');
  return rows
    .map(row => JSON.parse(row.payload) as Task)
    .filter(task => includeDeleted || !task.deletedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}

export async function putTask(task: Task): Promise<void> {
  const db = await database();
  await db.runAsync(
    'INSERT OR REPLACE INTO tasks (id,payload) VALUES (?,?)',
    task.id,
    JSON.stringify(task),
  );
}

export async function updateReminderState(
  task: Task,
  notificationId: string | null,
  reminderVersion: string | null,
): Promise<boolean> {
  const db = await database();
  let updated = false;
  await db.withExclusiveTransactionAsync(async txn => {
    const row = await txn.getFirstAsync<{ payload: string }>(
      'SELECT payload FROM tasks WHERE id=?',
      task.id,
    );
    if (row?.payload !== JSON.stringify(task)) return;
    const next = { ...task, notificationId, reminderVersion };
    await txn.runAsync('UPDATE tasks SET payload=? WHERE id=?', JSON.stringify(next), task.id);
    updated = true;
  });
  return updated;
}

export async function deleteTask(id: string): Promise<void> {
  const db = await database();
  await db.runAsync('DELETE FROM tasks WHERE id=?', id);
}

export async function listAttachments(taskId: string): Promise<Attachment[]> {
  const db = await database();
  const rows = await db.getAllAsync<{ payload: string }>(
    'SELECT payload FROM attachments WHERE task_id=?',
    taskId,
  );
  return rows.map(row => JSON.parse(row.payload) as Attachment);
}

export async function addAttachmentsMutation(
  attachments: Attachment[],
  task: Task,
  entries: HistoryEntry[],
): Promise<void> {
  const db = await database();
  await db.withExclusiveTransactionAsync(async txn => {
    const row = await txn.getFirstAsync<{ payload: string }>(
      'SELECT payload FROM tasks WHERE id=?',
      task.id,
    );
    const current = row ? (JSON.parse(row.payload) as Task) : null;
    if (!current || current.deletedAt || row?.payload !== JSON.stringify(task)) {
      throw new Error('The task changed while adding attachments. Please try again.');
    }
    const updatedAt = new Date(Math.max(Date.now(), Date.parse(task.updatedAt) + 1)).toISOString();
    const next = { ...task, updatedAt, syncStatus: 'pending' as const };
    await txn.runAsync(
      'INSERT OR REPLACE INTO tasks (id,payload) VALUES (?,?)',
      next.id,
      JSON.stringify(next),
    );
    for (const attachment of attachments) {
      await txn.runAsync(
        'INSERT INTO attachments (id,task_id,payload) VALUES (?,?,?)',
        attachment.id,
        attachment.taskId,
        JSON.stringify(attachment),
      );
    }
    for (const entry of entries) {
      await txn.runAsync(
        'INSERT INTO history (id,payload) VALUES (?,?)',
        entry.id,
        JSON.stringify(entry),
      );
    }
  });
}

export async function removeAttachmentMutation(
  attachmentId: string,
  task: Task,
  previous: Task,
  entry: HistoryEntry,
): Promise<void> {
  const db = await database();
  await db.withExclusiveTransactionAsync(async txn => {
    const row = await txn.getFirstAsync<{ payload: string }>(
      'SELECT payload FROM tasks WHERE id=?',
      task.id,
    );
    if (row?.payload !== JSON.stringify(previous))
      throw new Error('The task changed. Please try again.');
    await txn.runAsync('DELETE FROM attachments WHERE id=?', attachmentId);
    await txn.runAsync(
      'INSERT OR REPLACE INTO tasks (id,payload) VALUES (?,?)',
      task.id,
      JSON.stringify(task),
    );
    await txn.runAsync(
      'INSERT INTO history (id,payload) VALUES (?,?)',
      entry.id,
      JSON.stringify(entry),
    );
  });
}

export async function addHistory(item: HistoryEntry): Promise<void> {
  const db = await database();
  await db.runAsync('INSERT INTO history(id,payload) VALUES(?,?)', item.id, JSON.stringify(item));
}

export async function listHistory(): Promise<HistoryEntry[]> {
  const db = await database();
  const rows = await db.getAllAsync<{ payload: string }>('SELECT payload FROM history');
  return rows
    .map(row => JSON.parse(row.payload) as HistoryEntry)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}

export async function deleteHistoryEntry(id: string): Promise<boolean> {
  const db = await database();
  const result = await db.runAsync('DELETE FROM history WHERE id=?', id);
  return result.changes > 0;
}

export async function getPreference(key: string): Promise<string | null> {
  const db = await database();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM preferences WHERE key=?',
    key,
  );
  return row?.value ?? null;
}

export async function putPreference(key: string, value: string): Promise<void> {
  const db = await database();
  await db.runAsync('INSERT OR REPLACE INTO preferences(key,value) VALUES(?,?)', key, value);
}

export async function markPendingTasksFailed(): Promise<void> {
  const db = await database();
  await db.withExclusiveTransactionAsync(async txn => {
    const rows = await txn.getAllAsync<{ payload: string }>('SELECT payload FROM tasks');
    for (const row of rows) {
      const task = JSON.parse(row.payload) as Task;
      if (task.syncStatus === 'pending') {
        await txn.runAsync(
          'UPDATE tasks SET payload=? WHERE id=?',
          JSON.stringify({ ...task, syncStatus: 'failed' }),
          task.id,
        );
      }
    }
  });
}

export async function pendingReminderCancellations(): Promise<string[]> {
  const db = await database();
  const rows = await db.getAllAsync<{ id: string }>('SELECT id FROM reminder_cleanup');
  return rows.map(row => row.id);
}

export async function completeReminderCancellation(id: string): Promise<void> {
  const db = await database();
  await db.runAsync('DELETE FROM reminder_cleanup WHERE id=?', id);
}

export async function putTaskWithHistory(
  task: Task,
  history: HistoryEntry | HistoryEntry[],
  previous?: Task,
): Promise<void> {
  const db = await database();
  const entries = Array.isArray(history) ? history : [history];
  await db.withExclusiveTransactionAsync(async txn => {
    const row = await txn.getFirstAsync<{ payload: string }>(
      'SELECT payload FROM tasks WHERE id=?',
      task.id,
    );
    if (previous && row?.payload !== JSON.stringify(previous))
      throw new Error('The task changed. Please try again.');
    if (!previous && row) throw new Error('A task with this ID already exists.');
    await txn.runAsync(
      'INSERT OR REPLACE INTO tasks (id,payload) VALUES (?,?)',
      task.id,
      JSON.stringify(task),
    );
    for (const entry of entries)
      await txn.runAsync(
        'INSERT INTO history(id,payload) VALUES(?,?)',
        entry.id,
        JSON.stringify(entry),
      );
  });
}

export async function softDeleteTaskWithHistory(
  task: Task,
  previous: Task,
  entry: HistoryEntry,
): Promise<void> {
  const db = await database();
  await db.withExclusiveTransactionAsync(async txn => {
    const row = await txn.getFirstAsync<{ payload: string }>(
      'SELECT payload FROM tasks WHERE id=?',
      task.id,
    );
    if (row?.payload !== JSON.stringify(previous))
      throw new Error('The task changed. Please try again.');
    await txn.runAsync(
      'INSERT OR REPLACE INTO tasks (id,payload) VALUES (?,?)',
      task.id,
      JSON.stringify(task),
    );
    await txn.runAsync(
      'INSERT INTO history(id,payload) VALUES(?,?)',
      entry.id,
      JSON.stringify(entry),
    );
  });
}

export type AppliedSyncResult = {
  appliedTasks: Task[];
  removedIds: string[];
  deletedAttachments: Attachment[];
  skippedIds: string[];
};

export async function applySyncResult(
  tasks: Task[],
  removedIds: string[],
  snapshot: Task[],
  changedIds: string[],
  makeHistoryEntry: (count: number) => HistoryEntry,
): Promise<AppliedSyncResult> {
  const db = await database();
  const expected = new Map(snapshot.map(task => [task.id, JSON.stringify(task)]));
  const changed = new Set(changedIds);
  const removalSet = new Set(removedIds);
  const result: AppliedSyncResult = {
    appliedTasks: [],
    removedIds: [],
    deletedAttachments: [],
    skippedIds: [],
  };
  await db.withExclusiveTransactionAsync(async txn => {
    async function isCurrent(id: string): Promise<boolean> {
      const row = await txn.getFirstAsync<{ payload: string }>(
        'SELECT payload FROM tasks WHERE id=?',
        id,
      );
      return expected.has(id) && row?.payload === expected.get(id);
    }
    for (const task of tasks) {
      if (removalSet.has(task.id)) continue;
      if (!(await isCurrent(task.id))) {
        result.skippedIds.push(task.id);
        continue;
      }
      await txn.runAsync(
        'INSERT OR REPLACE INTO tasks (id,payload) VALUES (?,?)',
        task.id,
        JSON.stringify(task),
      );
      result.appliedTasks.push(task);
    }
    for (const id of removedIds) {
      if (!(await isCurrent(id))) {
        result.skippedIds.push(id);
        continue;
      }
      const rows = await txn.getAllAsync<{ payload: string }>(
        'SELECT payload FROM attachments WHERE task_id=?',
        id,
      );
      const taskRow = await txn.getFirstAsync<{ payload: string }>(
        'SELECT payload FROM tasks WHERE id=?',
        id,
      );
      const current = taskRow ? (JSON.parse(taskRow.payload) as Task) : null;
      if (current?.notificationId) {
        await txn.runAsync(
          'INSERT OR IGNORE INTO reminder_cleanup (id) VALUES (?)',
          current.notificationId,
        );
      }
      result.deletedAttachments.push(...rows.map(row => JSON.parse(row.payload) as Attachment));
      await txn.runAsync('DELETE FROM attachments WHERE task_id=?', id);
      await txn.runAsync('DELETE FROM tasks WHERE id=?', id);
      result.removedIds.push(id);
    }
    const count =
      result.appliedTasks.filter(task => changed.has(task.id)).length +
      result.removedIds.filter(id => changed.has(id)).length;
    if (count) {
      const entry = makeHistoryEntry(count);
      await txn.runAsync(
        'INSERT INTO history(id,payload) VALUES(?,?)',
        entry.id,
        JSON.stringify(entry),
      );
    }
  });
  return result;
}
