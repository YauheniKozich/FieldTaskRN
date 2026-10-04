import { useTaskStore } from '../src/store/useTaskStore';
import { taskRepository } from '../src/repositories/taskRepository';
import { chooseMedia, removeAttachmentFile } from '../src/platform/attachments/attachmentService';
import { Attachment } from '../src/types';

jest.mock('../src/repositories/taskRepository', () => ({
  taskRepository: {
    list: jest.fn(),
    history: jest.fn(),
    preference: jest.fn(),
    refresh: jest.fn(),
    addAttachments: jest.fn(),
  },
}));
jest.mock('../src/platform/attachments/attachmentService', () => ({
  chooseMedia: jest.fn(),
  chooseDocuments: jest.fn(),
  removeAttachmentFile: jest.fn(),
  attachmentExists: jest.fn(),
}));
jest.mock('../src/platform/location/locationService', () => ({
  getCurrentTaskCoordinates: jest.fn(),
}));
jest.mock('../src/platform/notifications/notificationService', () => ({
  scheduleReminder: jest.fn(),
}));
jest.mock('../src/features/sync/syncCoordinator', () => ({
  observeNetworkReconnect: jest.fn(),
  synchronizePendingTasks: jest.fn(),
}));
jest.mock('../src/features/reminders/reminderCoordinator', () => ({
  reconcileCurrentTaskReminder: jest.fn(),
  drainReminderCancellations: jest.fn(),
}));

it('allows initialization to be retried after a database error', async () => {
  jest
    .mocked(taskRepository.list)
    .mockRejectedValueOnce(new Error('Database unavailable'))
    .mockResolvedValueOnce([]);
  jest.mocked(taskRepository.history).mockResolvedValue([]);
  jest.mocked(taskRepository.preference).mockResolvedValue(null);

  await useTaskStore.getState().init();
  expect(useTaskStore.getState().error).toBe('Database unavailable');

  await useTaskStore.getState().init();
  expect(useTaskStore.getState().error).toBe('');
  expect(taskRepository.list).toHaveBeenCalledTimes(2);
});

it('removes copied files if the attachment batch could not be committed', async () => {
  const attachments: Attachment[] = ['one', 'two'].map(id => ({
    id,
    taskId: 'task',
    type: 'image',
    localUri: `file://${id}`,
    fileName: `${id}.jpg`,
    mimeType: 'image/jpeg',
    createdAt: '2026-09-29T10:00:00.000Z',
  }));
  jest.mocked(chooseMedia).mockResolvedValueOnce(attachments);
  jest.mocked(taskRepository.addAttachments).mockRejectedValueOnce(new Error('Storage full'));

  await expect(useTaskStore.getState().addMedia('task')).rejects.toThrow('Storage full');
  expect(taskRepository.addAttachments).toHaveBeenCalledWith(attachments);
  expect(removeAttachmentFile).toHaveBeenCalledWith('file://one');
  expect(removeAttachmentFile).toHaveBeenCalledWith('file://two');
});
