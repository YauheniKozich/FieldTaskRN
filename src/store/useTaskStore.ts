import { create } from 'zustand';
import { Attachment, HistoryEntry, Task, TaskInput } from '../types';
import { TaskCoordinates, getCurrentTaskCoordinates } from '../platform/location/locationService';
import { validateTask } from '../domain/tasks/taskValidation';
import { taskRepository as repository } from '../repositories/taskRepository';
import { scheduleReminder } from '../platform/notifications/notificationService';
import {
  attachmentExists,
  chooseDocuments,
  chooseMedia,
  removeAttachmentFile,
} from '../platform/attachments/attachmentService';
import { observeNetworkReconnect, synchronizePendingTasks } from '../features/sync/syncCoordinator';
import {
  drainReminderCancellations,
  reconcileCurrentTaskReminder,
} from '../features/reminders/reminderCoordinator';

type State = {
  tasks: Task[];
  history: HistoryEntry[];
  loading: boolean;
  error: string;
  reminderError: string;
  notice: string;
  theme: 'system' | 'light' | 'dark';
  sort: 'created' | 'due' | 'status';
  init: () => Promise<void>;
  create: (value: TaskInput) => Promise<string>;
  update: (id: string, value: TaskInput) => Promise<void>;
  setStatus: (id: string, status: Task['status']) => Promise<void>;
  remove: (id: string) => Promise<void>;
  deleteHistoryEntry: (id: string) => Promise<void>;
  attachmentsForTask: (id: string) => Promise<Attachment[]>;
  attachmentExists: (uri: string) => boolean;
  currentTaskCoordinates: () => Promise<TaskCoordinates | null>;
  addMedia: (taskId: string) => Promise<Attachment[]>;
  addDocuments: (taskId: string) => Promise<Attachment[]>;
  removeAttachment: (attachment: Attachment) => Promise<void>;
  sync: () => Promise<void>;
  demoNotification: () => Promise<void>;
  setTheme: (value: State['theme']) => Promise<void>;
  setSort: (value: State['sort']) => void;
  clearNotice: () => void;
  refresh: () => Promise<void>;
};

let initialization: Promise<void> | null = null;

async function ensureInitialized(getState: () => State) {
  if (getState().loading) await getState().init();
  if (getState().error) throw new Error(getState().error);
}

export const useTaskStore = create<State>((set, get) => {
  async function updateReminder(taskId: string) {
    try {
      await reconcileCurrentTaskReminder(taskId);
      set({ reminderError: '' });
    } catch (error) {
      set({
        reminderError: error instanceof Error ? error.message : 'Reminder could not be updated.',
      });
    }
  }

  function syncInBackground() {
    void get()
      .sync()
      .catch(error => {
        set({
          notice: `Sync failed: ${error instanceof Error ? error.message : 'Synchronization could not complete.'}`,
        });
      });
  }

  async function addAttachments(taskId: string, choose: (id: string) => Promise<Attachment[]>) {
    await ensureInitialized(get);
    const attachments = await choose(taskId);
    try {
      await repository.addAttachments(attachments);
    } catch (error) {
      for (const attachment of attachments) removeAttachmentFile(attachment.localUri);
      throw error;
    }
    await get().refresh();
    if (attachments.length) syncInBackground();
    return attachments;
  }

  return {
    tasks: [],
    history: [],
    loading: true,
    error: '',
    reminderError: '',
    notice: '',
    theme: 'system',
    sort: 'created',
    async refresh() {
      await ensureInitialized(get);
      const [tasks, history] = await repository.refresh();
      set({ tasks, history });
    },
    async deleteHistoryEntry(id) {
      const deleted = await repository.deleteHistoryEntry(id);
      if (!deleted) throw new Error('History item no longer exists.');
      set({ history: await repository.history() });
    },
    attachmentsForTask: id => repository.attachments(id),
    attachmentExists,
    currentTaskCoordinates: getCurrentTaskCoordinates,
    async init() {
      if (initialization) return initialization;
      set({ loading: true, error: '' });
      initialization = (async () => {
        try {
          const [tasks, history, theme] = await Promise.all([
            repository.list(),
            repository.history(),
            repository.preference('theme'),
          ]);
          set({
            tasks,
            history,
            theme: theme === 'light' || theme === 'dark' ? theme : 'system',
          });
          try {
            await drainReminderCancellations();
          } catch (error) {
            set({
              reminderError:
                error instanceof Error ? error.message : 'Reminder could not be cancelled.',
            });
          }
        } catch (error) {
          initialization = null;
          set({
            error: error instanceof Error ? error.message : 'Could not open local database.',
          });
        } finally {
          set({ loading: false });
        }
      })();
      return initialization;
    },
    async create(value) {
      await ensureInitialized(get);
      const problem = validateTask(value);
      if (problem) throw new Error(problem);
      const task = await repository.create(value);
      await updateReminder(task.id);
      await get().refresh();
      syncInBackground();
      return task.id;
    },
    async update(taskId, value) {
      await ensureInitialized(get);
      const problem = validateTask(value);
      if (problem) throw new Error(problem);
      const task = get().tasks.find(item => item.id === taskId);
      if (!task) throw new Error('This task is no longer available on this device.');
      await repository.update(task, value);
      await updateReminder(taskId);
      await get().refresh();
      syncInBackground();
    },
    async setStatus(taskId, status) {
      await ensureInitialized(get);
      const task = get().tasks.find(item => item.id === taskId);
      if (!task || task.status === status) return;
      await repository.status(task, status);
      await updateReminder(taskId);
      await get().refresh();
      syncInBackground();
    },
    async remove(taskId) {
      await ensureInitialized(get);
      const task = get().tasks.find(item => item.id === taskId);
      if (!task) return;
      await repository.softDelete(task);
      await updateReminder(taskId);
      await get().refresh();
      syncInBackground();
    },
    addMedia: taskId => addAttachments(taskId, chooseMedia),
    addDocuments: taskId => addAttachments(taskId, chooseDocuments),
    async removeAttachment(attachment) {
      await ensureInitialized(get);
      await repository.removeAttachment(attachment);
      removeAttachmentFile(attachment.localUri);
      await get().refresh();
      syncInBackground();
    },
    async sync() {
      await ensureInitialized(get);
      const outcome = await synchronizePendingTasks();
      if (outcome.status === 'busy') return;
      await get().refresh();
      if (outcome.status === 'offline') {
        set({
          notice: 'Offline. Changes are saved on this device and waiting to sync.',
        });
      } else {
        set({
          notice:
            outcome.status === 'complete' ? 'Sync complete.' : `Sync failed: ${outcome.message}`,
          ...(outcome.status === 'complete' ? { reminderError: outcome.reminderError ?? '' } : {}),
        });
      }
    },
    async demoNotification() {
      try {
        const task = get().tasks[0] ?? {
          id: 'demo',
          title: 'Demo field task',
          dueAt: new Date(Date.now() + 60_000).toISOString(),
        };
        await scheduleReminder(task, true);
        set({
          notice: 'Demo notification scheduled for about 30 seconds from now.',
        });
      } catch (error) {
        set({
          reminderError:
            error instanceof Error ? error.message : 'Could not schedule demo notification.',
        });
      }
    },
    async setTheme(theme) {
      await ensureInitialized(get);
      await repository.savePreference('theme', theme);
      set({ theme });
    },
    setSort: sort => set({ sort }),
    clearNotice: () => set({ notice: '' }),
  };
});

export function observeConnectivity() {
  return observeNetworkReconnect(() => {
    void useTaskStore
      .getState()
      .sync()
      .catch(error => {
        useTaskStore.setState({
          notice: `Sync failed: ${error instanceof Error ? error.message : 'Synchronization could not complete.'}`,
        });
      });
  });
}
