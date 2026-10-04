import NetInfo from '@react-native-community/netinfo';
import { API_URL } from '../../config/mockServer';
import { deleteRemoteTask, getRemoteTask, saveRemoteTask } from '../../data/remote/mockTaskApi';
import { remoteVersionWins } from '../../domain/sync/syncRules';
import { reminderFingerprint } from '../../domain/reminders/reminderSchedule';
import { taskRepository } from '../../repositories/taskRepository';
import { removeAttachmentFile } from '../../platform/attachments/attachmentService';
import {
  drainReminderCancellations,
  reconcileCurrentTaskReminder,
} from '../reminders/reminderCoordinator';
import { Task } from '../../types';

export type SyncOutcome =
  | { status: 'offline' }
  | { status: 'busy' }
  | { status: 'complete'; reminderError?: string }
  | { status: 'failed'; message: string };

let syncing = false;
let rerunRequested = false;
const MAX_SYNC_PASSES = 5;

export function observeNetworkReconnect(onReconnect: () => void) {
  return NetInfo.addEventListener(state => {
    if (state.isConnected) onReconnect();
  });
}

function sameServerContent(local: Task, remote: Task): boolean {
  return (
    local.title === remote.title &&
    local.description === remote.description &&
    local.dueAt === remote.dueAt &&
    local.location === remote.location &&
    local.latitude === remote.latitude &&
    local.longitude === remote.longitude &&
    local.status === remote.status &&
    local.createdAt === remote.createdAt &&
    local.updatedAt === remote.updatedAt &&
    local.deletedAt === remote.deletedAt
  );
}

function withLocalReminder(local: Task, remote: Task): Task {
  return {
    ...remote,
    notificationId: local.notificationId,
    reminderVersion: local.reminderVersion,
    syncStatus: 'synced',
  };
}

async function reconcileRemoteTasks(local: Task[], serverUrl: string) {
  const output = [...local];
  const removedIds: string[] = [];
  const changedIds: string[] = [];

  for (const task of local) {
    const remote = await getRemoteTask(serverUrl, task.id);
    const remoteIsNewer = remote !== null && remoteVersionWins(task.updatedAt, remote.updatedAt);

    if (task.deletedAt) {
      if (remoteIsNewer && remote && !remote.deletedAt) {
        output[output.findIndex(item => item.id === task.id)] = withLocalReminder(task, remote);
        changedIds.push(task.id);
      } else {
        if (remote) await deleteRemoteTask(serverUrl, task.id);
        removedIds.push(task.id);
        if (task.syncStatus !== 'synced' || remote) changedIds.push(task.id);
      }
      continue;
    }

    if (remoteIsNewer && remote) {
      if (remote.deletedAt) {
        await deleteRemoteTask(serverUrl, task.id);
        removedIds.push(task.id);
      } else {
        output[output.findIndex(item => item.id === task.id)] = withLocalReminder(task, remote);
      }
      changedIds.push(task.id);
      continue;
    }

    if (remote && task.syncStatus === 'synced' && sameServerContent(task, remote)) continue;

    await saveRemoteTask(serverUrl, task, remote !== null);
    output[output.findIndex(item => item.id === task.id)] = {
      ...task,
      syncStatus: 'synced',
    };
    changedIds.push(task.id);
  }

  return { tasks: output, removedIds, changedIds };
}

export async function synchronizePendingTasks(): Promise<SyncOutcome> {
  if (syncing) {
    rerunRequested = true;
    return { status: 'busy' };
  }
  syncing = true;

  try {
    let reminderError: string | undefined;
    for (let pass = 0; pass < MAX_SYNC_PASSES; pass += 1) {
      rerunRequested = false;
      const connection = await NetInfo.fetch();
      if (!connection.isConnected) return { status: 'offline' };

      const snapshot = await taskRepository.listAll();
      const serverUrl = (await taskRepository.serverUrl()) || API_URL;
      const result = await reconcileRemoteTasks(snapshot, serverUrl);
      const applied = await taskRepository.applySyncResult(
        result.tasks,
        result.removedIds,
        snapshot,
        result.changedIds,
      );
      for (const attachment of applied.deletedAttachments)
        removeAttachmentFile(attachment.localUri);
      try {
        await drainReminderCancellations();
      } catch (error) {
        reminderError = error instanceof Error ? error.message : 'Reminder could not be cancelled.';
      }
      for (const task of await taskRepository.listAll()) {
        const active = !task.deletedAt && (task.status === 'new' || task.status === 'in_progress');
        const stale = active
          ? !task.notificationId || task.reminderVersion !== reminderFingerprint(task)
          : Boolean(task.notificationId || task.reminderVersion);
        if (!stale) continue;
        try {
          await reconcileCurrentTaskReminder(task.id);
        } catch (error) {
          reminderError = error instanceof Error ? error.message : 'Reminder could not be updated.';
        }
      }
      if (applied.skippedIds.length) rerunRequested = true;
      if (!rerunRequested) return { status: 'complete', reminderError };
    }
    return {
      status: 'failed',
      message: 'Tasks kept changing during synchronization. Please retry.',
    };
  } catch (error) {
    await taskRepository.markPendingTasksFailed();
    const message = error instanceof Error ? error.message : 'Mock server unavailable.';
    await taskRepository.recordSyncFailure(message);
    return { status: 'failed', message };
  } finally {
    syncing = false;
  }
}
