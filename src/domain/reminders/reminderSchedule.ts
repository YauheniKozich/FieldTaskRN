export function reminderTimestamp(dueAt: string, now = Date.now()): number {
  const standardReminder = Date.parse(dueAt) - 30 * 60_000;
  return standardReminder > now ? standardReminder : now + 30_000;
}

export function reminderFingerprint(task: {
  title: string;
  dueAt: string;
  status: string;
}): string {
  return JSON.stringify([task.title, task.dueAt, task.status]);
}
