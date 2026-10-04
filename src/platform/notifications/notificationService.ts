import * as Notifications from 'expo-notifications';
import { reminderTimestamp } from '../../domain/reminders/reminderSchedule';
import { ru } from '../../localization/ru';
import { Task } from '../../types';
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
export async function scheduleReminder(task: Task, demo = false): Promise<string> {
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted)
    throw new Error('Notification permission is off. You can enable it in device settings.');
  await Notifications.setNotificationChannelAsync('task-reminders', {
    name: ru.notifications.channel,
    importance: Notifications.AndroidImportance.HIGH,
  });
  const trigger = demo
    ? {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 30,
        channelId: 'task-reminders',
      }
    : {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(reminderTimestamp(task.dueAt)),
        channelId: 'task-reminders',
      };
  return Notifications.scheduleNotificationAsync({
    content: {
      title: demo ? ru.notifications.demoTitle : ru.notifications.dueTitle,
      body: task.title,
      data: { taskId: task.id },
    },
    trigger,
  });
}
export async function cancelReminder(id: string | null) {
  if (id) await Notifications.cancelScheduledNotificationAsync(id);
}
