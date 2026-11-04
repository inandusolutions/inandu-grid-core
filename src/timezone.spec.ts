import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { coerceToDate, formatCellValue, matchesColumnFilter } from './index';
import type { ColumnConfig } from './index';

// A calendar date must mean the same day whatever the viewer's time zone. West of UTC is where
// `new Date('2024-01-05')` (UTC midnight) lands on the previous evening, so that is where it broke.
const ZONES = ['America/Bogota', 'America/Los_Angeles', 'UTC', 'Asia/Tokyo'];
const original = process.env.TZ;

const dateColumn: ColumnConfig = {
  field: () => 'when',
  type: () => 'date',
  format: () => 'YYYY-MM-DD',
} as unknown as ColumnConfig;

function inZone(zone: string, run: () => void): void {
  process.env.TZ = zone;
  run();
}

describe.each(ZONES)('calendar dates in %s', zone => {
  beforeAll(() => {
    process.env.TZ = zone;
  });
  afterAll(() => {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  });

  const row = (when: string) => ({ when });
  const filter = (from?: string, to?: string) => (when: string) => matchesColumnFilter(dateColumn, row(when), { from, to }, 'en-US');

  it('reads a bare yyyy-mm-dd as local midnight', () => {
    const d = coerceToDate('2024-01-05');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2024, 0, 5, 0]);
  });

  it('formats a bare yyyy-mm-dd as the same day', () => {
    expect(formatCellValue('2024-01-05', 'date', 'YYYY-MM-DD', 'en-US')).toBe('2024-01-05');
  });

  it('includes the whole "to" day', () => {
    const matches = filter(undefined, '2024-01-05');
    expect(matches('2024-01-05')).toBe(true);
    expect(matches('2024-01-04')).toBe(true);
    expect(matches('2024-01-06')).toBe(false);
  });

  it('includes the "from" day and excludes the day before', () => {
    const matches = filter('2024-01-05', undefined);
    expect(matches('2024-01-05')).toBe(true);
    expect(matches('2024-01-04')).toBe(false);
  });

  it('keeps a one-day range to that day only', () => {
    const matches = filter('2024-01-05', '2024-01-05');
    expect(['2024-01-04', '2024-01-05', '2024-01-06'].map(matches)).toEqual([false, true, false]);
  });

  it('still compares a Date or a full timestamp cell against the day bounds', () => {
    expect(matchesColumnFilter(dateColumn, { when: new Date(2024, 0, 5, 23, 30) }, { to: '2024-01-05' }, 'en-US')).toBe(true);
    expect(matchesColumnFilter(dateColumn, { when: new Date(2024, 0, 6, 0, 30) }, { to: '2024-01-05' }, 'en-US')).toBe(false);
  });
});

it('actually runs the zone tests in the zone they name', () => {
  inZone('America/Bogota', () => {
    expect(new Date(2024, 0, 5).getTimezoneOffset()).toBe(300);
  });
  if (original === undefined) delete process.env.TZ;
  else process.env.TZ = original;
});
