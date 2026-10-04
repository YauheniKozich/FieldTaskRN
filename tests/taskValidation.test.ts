import { TaskInput } from '../src/types';
import { validateTask } from '../src/domain/tasks/taskValidation';
import { reminderTimestamp } from '../src/domain/reminders/reminderSchedule';
import { remoteVersionWins } from '../src/domain/sync/syncRules';

const valid: TaskInput = {
  title: 'Inspect', description: 'Check equipment', dueAt: new Date(Date.now() + 3_600_000).toISOString(),
  location: 'Warsaw depot', latitude: null, longitude: null, status: 'new'
};

describe('validateTask', () => {
  it.each(['', '   '])('rejects empty or whitespace-only titles (%j)', title => {
    expect(validateTask({ ...valid, title })).toBe('Enter a task title.');
  });
  it.each(['', '   '])('rejects empty or whitespace-only descriptions (%j)', description => {
    expect(validateTask({ ...valid, description })).toBe('Enter a task description.');
  });
  it('rejects missing and invalid due dates with a clear error', () => {
    expect(validateTask({ ...valid, dueAt: '' })).toBe('Enter a valid due date and time.');
    expect(validateTask({ ...valid, dueAt: 'not-a-date' })).toBe('Enter a valid due date and time.');
  });
  it('rejects an empty address', () => {
    expect(validateTask({ ...valid, location: '  ' })).toBe('Enter a task address.');
  });
  it('accepts address-only locations', () => expect(validateTask(valid)).toBeNull());
  it('rejects invalid latitude and longitude bounds', () => {
    expect(validateTask({ ...valid, latitude: -91, longitude: 0 })).toBe('Latitude must be between −90 and 90.');
    expect(validateTask({ ...valid, latitude: 0, longitude: 181 })).toBe('Longitude must be between −180 and 180.');
  });
  it('requires both coordinates when either is provided', () => {
    expect(validateTask({ ...valid, latitude: 52 })).toContain('both latitude and longitude');
  });
  it('rejects dates in the past', () => {
    expect(validateTask({ ...valid, dueAt: new Date(Date.now() - 60_000).toISOString() })).toBe('Due date must be in the future.');
  });
});

describe('reminderTimestamp', () => {
  it('schedules 30 minutes before a due time when there is enough lead time', () => {
    expect(reminderTimestamp('2026-10-02T10:00:00Z', Date.parse('2026-10-02T09:00:00Z')))
      .toBe(Date.parse('2026-10-02T09:30:00Z'));
  });
  it('uses the documented 30 second fallback when the reminder time passed', () => {
    expect(reminderTimestamp('2026-10-02T09:10:00Z', Date.parse('2026-10-02T09:00:00Z')))
      .toBe(Date.parse('2026-10-02T09:00:30Z'));
  });
});

describe('remoteVersionWins', () => {
  it('chooses the later remote version', () => expect(remoteVersionWins('2026-01-01T00:00:00.000Z', '2026-01-01T00:00:01.000Z')).toBe(true));
  it('keeps the local version when timestamps are equal', () => expect(remoteVersionWins('2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')).toBe(false));
  it('does not let invalid remote timestamps win', () => expect(remoteVersionWins('2026-01-01T00:00:00.000Z', 'bad')).toBe(false));
});
