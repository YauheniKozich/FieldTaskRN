import { cancelReminder, scheduleReminder } from '../../platform/notifications/notificationService';
import { taskRepository } from '../../repositories/taskRepository';
import { Task } from '../../types';
import { reminderFingerprint } from '../../domain/reminders/reminderSchedule';

function needsReminder(task: Task): boolean {
  return !task.deletedAt && (task.status === 'new' || task.status === 'in_progress');
}

export async function reconcileTaskReminder(task: Task): Promise<boolean> {
  const active = needsReminder(task);
  if (active && task.notificationId && task.reminderVersion === reminderFingerprint(task))
    return false;
  if (!active && !task.notificationId && !task.reminderVersion) return false;

  const claimed = await taskRepository.updateReminderState(task, task.notificationId, null);
  if (!claimed) return true;
  const pendingTask = { ...task, reminderVersion: null };

  if (task.notificationId) await cancelReminder(task.notificationId);

  let nextId: string | null = null;
  let scheduleError: unknown = null;
  if (active) {
    try {
      nextId = await scheduleReminder(task);
    } catch (error) {
      scheduleError = error;
    }
  }

  try {
    const updated = await taskRepository.updateReminderState(
      pendingTask,
      nextId,
      nextId ? reminderFingerprint(task) : null,
    );
    if (!updated) {
      if (nextId) await cancelReminder(nextId);
      return true;
    }
  } catch (error) {
    if (nextId) await cancelReminder(nextId);
    throw error;
  }

  if (scheduleError) throw scheduleError;
  return false;
}

export async function reconcileCurrentTaskReminder(taskId: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const task = (await taskRepository.listAll()).find(item => item.id === taskId);
    if (!task || !(await reconcileTaskReminder(task))) return;
  }
  throw new Error('Task changed while updating its reminder. Please retry.');
}

export async function drainReminderCancellations(): Promise<void> {
  let firstError: unknown = null;
  for (const id of await taskRepository.pendingReminderCancellations()) {
    try {
      await cancelReminder(id);
      await taskRepository.completeReminderCancellation(id);
    } catch (error) {
      firstError ??= error;
    }
  }
  if (firstError) throw firstError;
}
