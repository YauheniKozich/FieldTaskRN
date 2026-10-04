import * as db from '../storage/database';
import { Attachment, HistoryEntry, Task, TaskInput } from '../types';
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const stamp = () => new Date().toISOString();
const changedAt = (previous: string) =>
  new Date(Math.max(Date.now(), Date.parse(previous) + 1)).toISOString();
export const taskRepository = {
  list: () => db.listTasks(),
  listAll: () => db.listTasks(true),
  history: () => db.listHistory(),
  deleteHistoryEntry: db.deleteHistoryEntry,
  attachments: db.listAttachments,
  serverUrl: () => db.getPreference('serverUrl'),
  async record(action: string, description: string, taskId: string | null = null) {
    await db.addHistory({
      id: id(),
      taskId,
      action,
      description,
      createdAt: stamp(),
    });
  },
  async create(input: TaskInput): Promise<Task> {
    const task: Task = {
      ...input,
      id: id(),
      createdAt: stamp(),
      updatedAt: stamp(),
      syncStatus: 'pending',
      deletedAt: null,
      notificationId: null,
      reminderVersion: null,
    };
    await db.putTaskWithHistory(task, {
      id: id(),
      taskId: task.id,
      action: 'task_created',
      description: `Created “${task.title}”.`,
      createdAt: stamp(),
    });
    return task;
  },
  async update(existing: Task, input: TaskInput): Promise<Task> {
    const task = {
      ...existing,
      ...input,
      updatedAt: changedAt(existing.updatedAt),
      syncStatus: 'pending' as const,
    };
    const history: HistoryEntry[] = [
      {
        id: id(),
        taskId: task.id,
        action: 'task_edited',
        description: `Edited “${task.title}”.`,
        createdAt: stamp(),
      },
    ];
    if (existing.status !== input.status)
      history.push({
        id: id(),
        taskId: task.id,
        action: 'status_changed',
        description: `Status changed to ${input.status.replace('_', ' ')}.`,
        createdAt: stamp(),
      });
    await db.putTaskWithHistory(task, history, existing);
    return task;
  },
  async status(task: Task, status: Task['status']) {
    const next = {
      ...task,
      status,
      updatedAt: changedAt(task.updatedAt),
      syncStatus: 'pending' as const,
    };
    await db.putTaskWithHistory(
      next,
      {
        id: id(),
        taskId: task.id,
        action: 'status_changed',
        description: `Status changed to ${status.replace('_', ' ')}.`,
        createdAt: stamp(),
      },
      task,
    );
    return next;
  },
  async softDelete(task: Task) {
    const updatedAt = changedAt(task.updatedAt);
    const next = {
      ...task,
      deletedAt: updatedAt,
      updatedAt,
      syncStatus: 'pending' as const,
    };
    await db.softDeleteTaskWithHistory(next, task, {
      id: id(),
      taskId: task.id,
      action: 'task_deleted',
      description: `Deleted “${task.title}”.`,
      createdAt: stamp(),
    });
    return next;
  },
  async addAttachments(attachments: Attachment[]) {
    if (!attachments.length) return;
    const taskId = attachments[0].taskId;
    if (attachments.some(attachment => attachment.taskId !== taskId))
      throw new Error('Attachments belong to different tasks.');
    const current = (await db.listTasks(true)).find(task => task.id === taskId);
    if (!current || current.deletedAt) throw new Error('The task no longer exists.');
    const entries = attachments.map(attachment => ({
      id: id(),
      taskId,
      action: 'attachment_added',
      description: `Added ${attachment.type} “${attachment.fileName}”.`,
      createdAt: stamp(),
    }));
    await db.addAttachmentsMutation(attachments, current, entries);
  },
  async removeAttachment(attachment: Attachment) {
    const current = (await db.listTasks(true)).find(task => task.id === attachment.taskId);
    if (!current || current.deletedAt) throw new Error('The task no longer exists.');
    const updatedAt = changedAt(current.updatedAt);
    const task = { ...current, updatedAt, syncStatus: 'pending' as const };
    await db.removeAttachmentMutation(attachment.id, task, current, {
      id: id(),
      taskId: attachment.taskId,
      action: 'attachment_removed',
      description: `Removed ${attachment.type} “${attachment.fileName}”.`,
      createdAt: stamp(),
    });
  },
  applySyncResult(tasks: Task[], removedIds: string[], snapshot: Task[], changedIds: string[]) {
    return db.applySyncResult(tasks, removedIds, snapshot, changedIds, count => ({
      id: id(),
      taskId: null,
      action: 'sync_succeeded',
      description: `Synchronized ${count} task change(s).`,
      createdAt: stamp(),
    }));
  },
  async recordSyncFailure(description: string) {
    const recent = (await db.listHistory())[0];
    if (
      recent?.action === 'sync_failed' &&
      recent.description === description &&
      Date.now() - Date.parse(recent.createdAt) < 60_000
    )
      return;
    await this.record('sync_failed', description);
  },
  putTask: db.putTask,
  deleteTask: db.deleteTask,
  preference: db.getPreference,
  savePreference: db.putPreference,
  updateReminderState: db.updateReminderState,
  markPendingTasksFailed: db.markPendingTasksFailed,
  pendingReminderCancellations: db.pendingReminderCancellations,
  completeReminderCancellation: db.completeReminderCancellation,
  async refresh() {
    return Promise.all([db.listTasks(), db.listHistory()]);
  },
};
