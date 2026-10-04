import { API_URL } from '../../config/mockServer';
import { Task, TaskStatus } from '../../types';

const statuses: TaskStatus[] = ['new', 'in_progress', 'completed', 'cancelled'];
const REQUEST_TIMEOUT_MS = 12_000;

async function request(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Mock server request timed out.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function serverBaseUrl(serverUrl = API_URL): string {
  return serverUrl.replace(/\/$/, '');
}

function parseRemoteTask(value: unknown): Task {
  if (!value || typeof value !== 'object') throw new Error('Mock server returned an invalid task.');
  const task = value as Partial<Task>;
  if (typeof task.id !== 'string' || typeof task.title !== 'string' || typeof task.description !== 'string' ||
      typeof task.location !== 'string' || typeof task.dueAt !== 'string' || typeof task.createdAt !== 'string' ||
      typeof task.updatedAt !== 'string' || !Number.isFinite(Date.parse(task.updatedAt)) ||
      !Number.isFinite(Date.parse(task.createdAt)) || !Number.isFinite(Date.parse(task.dueAt)) ||
      !task.status || !statuses.includes(task.status) ||
      (task.deletedAt !== null && (typeof task.deletedAt !== 'string' || !Number.isFinite(Date.parse(task.deletedAt))))) {
    throw new Error('Mock server returned an invalid task.');
  }
  const latitude = task.latitude ?? null;
  const longitude = task.longitude ?? null;
  if ((latitude !== null && (!Number.isFinite(latitude) || Math.abs(latitude) > 90)) ||
      (longitude !== null && (!Number.isFinite(longitude) || Math.abs(longitude) > 180)) ||
      ((latitude === null) !== (longitude === null))) {
    throw new Error('Mock server returned invalid coordinates.');
  }
  return { ...task, latitude, longitude, notificationId: null, reminderVersion: null, syncStatus: 'synced' } as Task;
}

export async function getRemoteTask(serverUrl: string, id: string): Promise<Task | null> {
  const response = await request(`${serverBaseUrl(serverUrl)}/tasks/${encodeURIComponent(id)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Mock server returned ${response.status} while reading a task.`);
  return parseRemoteTask(await response.json() as unknown);
}

export async function saveRemoteTask(serverUrl: string, task: Task, exists: boolean): Promise<void> {
  const base = serverBaseUrl(serverUrl);
  const url = exists ? `${base}/tasks/${encodeURIComponent(task.id)}` : `${base}/tasks`;
  const response = await request(url, {
    method: exists ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...task, notificationId: null, reminderVersion: null, syncStatus: 'synced' }),
  });
  if (!response.ok) throw new Error(`Mock server returned ${response.status} while saving a task.`);
}

export async function deleteRemoteTask(serverUrl: string, id: string): Promise<void> {
  const response = await request(`${serverBaseUrl(serverUrl)}/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Mock server returned ${response.status} while deleting a task.`);
  }
}
