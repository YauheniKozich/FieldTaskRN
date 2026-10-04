import { parseLocalDueAt } from '../src/domain/tasks/taskDate';

describe('parseLocalDueAt', () => {
  it('rejects normalized or malformed calendar values', () => {
    expect(parseLocalDueAt('2026-02-30T10:00')).toBeNull();
    expect(parseLocalDueAt('2026-13-01T10:00')).toBeNull();
    expect(parseLocalDueAt('2026-10-04T25:00')).toBeNull();
    expect(parseLocalDueAt('2026-10-04T9:00')).toBeNull();
  });

  it('accepts a real local date and preserves its wall-clock components', () => {
    const value = parseLocalDueAt('2026-10-04T10:30');
    expect(value).not.toBeNull();
    if (!value) throw new Error('Expected a valid local date.');
    const parsed = new Date(value);
    expect([
      parsed.getFullYear(),
      parsed.getMonth() + 1,
      parsed.getDate(),
      parsed.getHours(),
      parsed.getMinutes(),
    ]).toEqual([2026, 10, 4, 10, 30]);
  });
});
