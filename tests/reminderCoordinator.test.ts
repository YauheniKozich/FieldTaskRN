import {
  drainReminderCancellations,
  reconcileTaskReminder,
} from '../src/features/reminders/reminderCoordinator';
import {
  cancelReminder,
  scheduleReminder,
} from '../src/platform/notifications/notificationService';
import { taskRepository } from '../src/repositories/taskRepository';
import { Task } from '../src/types';
import { reminderFingerprint } from '../src/domain/reminders/reminderSchedule';

jest.mock('../src/platform/notifications/notificationService', () => ({
  cancelReminder: jest.fn(),
  scheduleReminder: jest.fn(),
}));
jest.mock('../src/repositories/taskRepository', () => ({
  taskRepository: {
    updateReminderState: jest.fn(),
    pendingReminderCancellations: jest.fn(),
    completeReminderCancellation: jest.fn(),
  },
}));

const task: Task = {
  id: 'one',
  title: 'Inspect',
  description: 'Check',
  location: 'Depot',
  dueAt: '2026-10-04T09:00:00.000Z',
  latitude: null,
  longitude: null,
  status: 'new',
  createdAt: '2026-09-28T10:00:00.000Z',
  updatedAt: '2026-09-29T10:00:00.000Z',
  syncStatus: 'synced',
  deletedAt: null,
  notificationId: 'old',
  reminderVersion: '2026-09-28T10:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(cancelReminder).mockResolvedValue(undefined);
  jest.mocked(scheduleReminder).mockResolvedValue('new');
  jest.mocked(taskRepository.updateReminderState).mockResolvedValue(true);
});

it('cancels an outdated reminder and stores the new schedule', async () => {
  await expect(reconcileTaskReminder(task)).resolves.toBe(false);
  expect(cancelReminder).toHaveBeenCalledWith('old');
  expect(scheduleReminder).toHaveBeenCalledWith(task);
  expect(taskRepository.updateReminderState).toHaveBeenNthCalledWith(1, task, 'old', null);
  expect(taskRepository.updateReminderState).toHaveBeenNthCalledWith(
    2,
    { ...task, reminderVersion: null },
    'new',
    reminderFingerprint(task),
  );
});

it('cancels the reminder when the task is completed', async () => {
  await reconcileTaskReminder({ ...task, status: 'completed' });
  expect(cancelReminder).toHaveBeenCalledWith('old');
  expect(scheduleReminder).not.toHaveBeenCalled();
  expect(taskRepository.updateReminderState).toHaveBeenLastCalledWith(
    { ...task, status: 'completed', reminderVersion: null },
    null,
    null,
  );
});

it('persists an unscheduled state when permission is denied', async () => {
  jest.mocked(scheduleReminder).mockRejectedValueOnce(new Error('Permission denied'));
  await expect(reconcileTaskReminder(task)).rejects.toThrow('Permission denied');
  expect(taskRepository.updateReminderState).toHaveBeenLastCalledWith(
    { ...task, reminderVersion: null },
    null,
    null,
  );
});

it('cancels a newly created reminder when the task changed during scheduling', async () => {
  jest
    .mocked(taskRepository.updateReminderState)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(false);
  await expect(reconcileTaskReminder(task)).resolves.toBe(true);
  expect(cancelReminder).toHaveBeenNthCalledWith(1, 'old');
  expect(cancelReminder).toHaveBeenNthCalledWith(2, 'new');
});

it('does not cancel an existing reminder when another write wins the claim', async () => {
  jest.mocked(taskRepository.updateReminderState).mockResolvedValueOnce(false);
  await expect(reconcileTaskReminder(task)).resolves.toBe(true);
  expect(cancelReminder).not.toHaveBeenCalled();
  expect(scheduleReminder).not.toHaveBeenCalled();
});

it('keeps failed cancellations queued for a later retry', async () => {
  jest.mocked(taskRepository.pendingReminderCancellations).mockResolvedValueOnce(['old', 'other']);
  jest.mocked(cancelReminder).mockRejectedValueOnce(new Error('OS unavailable'));
  await expect(drainReminderCancellations()).rejects.toThrow('OS unavailable');
  expect(taskRepository.completeReminderCancellation).not.toHaveBeenCalledWith('old');
  expect(taskRepository.completeReminderCancellation).toHaveBeenCalledWith('other');
});
