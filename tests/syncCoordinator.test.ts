import NetInfo from '@react-native-community/netinfo';
import { synchronizePendingTasks } from '../src/features/sync/syncCoordinator';
import { getRemoteTask, saveRemoteTask } from '../src/data/remote/mockTaskApi';
import { taskRepository } from '../src/repositories/taskRepository';
import { Task } from '../src/types';
import { reconcileCurrentTaskReminder } from '../src/features/reminders/reminderCoordinator';

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: jest.fn(), addEventListener: jest.fn() },
}));
jest.mock('../src/data/remote/mockTaskApi', () => ({
  getRemoteTask: jest.fn(),
  saveRemoteTask: jest.fn(),
  deleteRemoteTask: jest.fn(),
}));
jest.mock('../src/repositories/taskRepository', () => ({
  taskRepository: {
    listAll: jest.fn(),
    serverUrl: jest.fn(),
    applySyncResult: jest.fn(),
    markPendingTasksFailed: jest.fn(),
    recordSyncFailure: jest.fn(),
  },
}));
jest.mock('../src/platform/attachments/attachmentService', () => ({
  removeAttachmentFile: jest.fn(),
}));
jest.mock('../src/platform/notifications/notificationService', () => ({
  cancelReminder: jest.fn(),
}));
jest.mock('../src/features/reminders/reminderCoordinator', () => ({
  reconcileCurrentTaskReminder: jest.fn(),
  drainReminderCancellations: jest.fn(),
}));

const task: Task = {
  id: 'one',
  title: 'Inspect',
  description: 'Check',
  location: 'Depot',
  dueAt: '2026-10-04T09:00:00.000Z',
  latitude: null,
  longitude: null,
  status: 'completed',
  createdAt: '2026-09-28T10:00:00.000Z',
  updatedAt: '2026-09-29T10:00:00.000Z',
  syncStatus: 'pending',
  deletedAt: null,
  notificationId: null,
  reminderVersion: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(NetInfo.fetch)
    .mockResolvedValue({ isConnected: true } as Awaited<ReturnType<typeof NetInfo.fetch>>);
  jest.mocked(taskRepository.listAll).mockResolvedValue([task]);
  jest.mocked(taskRepository.serverUrl).mockResolvedValue(null);
  jest.mocked(getRemoteTask).mockResolvedValue(null);
  jest.mocked(saveRemoteTask).mockResolvedValue(undefined);
});

it('retries a task skipped because it changed before the sync transaction', async () => {
  jest
    .mocked(taskRepository.applySyncResult)
    .mockResolvedValueOnce({
      appliedTasks: [],
      removedIds: [],
      deletedAttachments: [],
      skippedIds: ['one'],
    })
    .mockResolvedValueOnce({
      appliedTasks: [{ ...task, syncStatus: 'synced' }],
      removedIds: [],
      deletedAttachments: [],
      skippedIds: [],
    });

  await expect(synchronizePendingTasks()).resolves.toEqual({
    status: 'complete',
    reminderError: undefined,
  });
  expect(taskRepository.applySyncResult).toHaveBeenCalledTimes(2);
  expect(saveRemoteTask).toHaveBeenCalledTimes(2);
});

it('keeps the old reminder ID so a newer remote task can replace its schedule', async () => {
  const local: Task = {
    ...task,
    status: 'new',
    notificationId: 'old-reminder',
    reminderVersion: JSON.stringify([task.title, task.dueAt, 'new']),
  };
  const remote: Task = {
    ...local,
    dueAt: '2026-10-05T09:00:00.000Z',
    updatedAt: '2026-09-29T11:00:00.000Z',
    notificationId: null,
    reminderVersion: null,
    syncStatus: 'synced',
  };
  let committed: Task[] = [];
  jest.mocked(getRemoteTask).mockResolvedValueOnce(remote);
  jest
    .mocked(taskRepository.listAll)
    .mockResolvedValueOnce([local])
    .mockImplementationOnce(async () => committed);
  jest.mocked(taskRepository.applySyncResult).mockImplementationOnce(async tasks => {
    committed = tasks;
    return {
      appliedTasks: tasks,
      removedIds: [],
      deletedAttachments: [],
      skippedIds: [],
    };
  });

  await expect(synchronizePendingTasks()).resolves.toEqual({
    status: 'complete',
    reminderError: undefined,
  });
  expect(committed[0].notificationId).toBe('old-reminder');
  expect(committed[0].reminderVersion).toBe(local.reminderVersion);
  expect(reconcileCurrentTaskReminder).toHaveBeenCalledWith(local.id);
});
