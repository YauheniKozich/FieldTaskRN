import { mapHtml, MapTask } from '../src/features/map/mapHtml';

const task: MapTask = {
  id: 'one',
  title: '</script><script>alert(1)</script>',
  description: 'Check',
  location: 'Depot',
  dueAt: '2026-10-04T09:00:00.000Z',
  latitude: 52.2,
  longitude: 21.0,
  status: 'new',
  createdAt: '2026-09-28T10:00:00.000Z',
  updatedAt: '2026-09-29T10:00:00.000Z',
  syncStatus: 'pending',
  deletedAt: null,
  notificationId: null,
};

it('embeds Leaflet locally and escapes task text inside the script', () => {
  const html = mapHtml([task]);
  expect(html).toContain('Leaflet 1.9.4');
  expect(html).not.toContain('src="https://unpkg.com');
  expect(html).not.toContain(task.title);
  expect(html).toContain('\\u003c/script\\u003e');
});
