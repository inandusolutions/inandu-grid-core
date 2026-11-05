import { describe, expect, it } from 'vitest';
import { coerceToDate, formatCellValue, formatDateValue, matchesColumnFilter, zonedDateParts } from './index';
import type { ColumnConfig } from './index';

// Daylight-saving days, half-hour and +13/+14 zones, and locales the runtime may not know. None of this depends on
// the TZ of the machine: a column `timeZone` is an IANA name.
const at = (iso: string, timeZone: string, format = 'YYYY-MM-DD HH:mm') => formatCellValue(new Date(iso), 'date', format, 'en', undefined, timeZone);

describe('daylight saving (Europe/Madrid)', () => {
  it('skips the hour that does not exist on the spring-forward night', () => {
    expect(at('2026-03-29T00:59:00Z', 'Europe/Madrid')).toBe('2026-03-29 01:59');
    expect(at('2026-03-29T01:00:00Z', 'Europe/Madrid')).toBe('2026-03-29 03:00');
  });

  it('shows the repeated hour twice on the fall-back night', () => {
    expect(at('2026-10-25T00:30:00Z', 'Europe/Madrid')).toBe('2026-10-25 02:30');
    expect(at('2026-10-25T01:30:00Z', 'Europe/Madrid')).toBe('2026-10-25 02:30');
    expect(at('2026-10-25T02:00:00Z', 'Europe/Madrid')).toBe('2026-10-25 03:00');
  });

  it('keeps a 23-hour and a 25-hour day on their own calendar day', () => {
    expect(at('2026-03-29T22:00:00Z', 'Europe/Madrid', 'YYYY-MM-DD')).toBe('2026-03-30'); // 00:00 local, +2
    expect(at('2026-10-25T22:59:00Z', 'Europe/Madrid', 'YYYY-MM-DD')).toBe('2026-10-25'); // 23:59 local, +1
    expect(at('2026-10-25T23:00:00Z', 'Europe/Madrid', 'YYYY-MM-DD')).toBe('2026-10-26');
  });
});

describe('zones away from whole hours and from the usual side of the date line', () => {
  it.each([
    ['Asia/Kolkata', '2026-01-05T18:30:00Z', '2026-01-06 00:00'],
    ['Asia/Kathmandu', '2026-01-05T18:15:00Z', '2026-01-06 00:00'],
    ['Pacific/Auckland', '2026-12-31T11:30:00Z', '2027-01-01 00:30'],
    ['Pacific/Apia', '2026-01-05T10:00:00Z', '2026-01-05 23:00'],
    ['Pacific/Kiritimati', '2026-01-05T10:00:00Z', '2026-01-06 00:00'],
    ['America/Bogota', '2026-01-05T04:59:00Z', '2026-01-04 23:59'],
    ['Asia/Tokyo', '2026-01-05T14:59:00Z', '2026-01-05 23:59'],
    ['UTC', '2026-01-05T00:00:00Z', '2026-01-05 00:00'],
  ])('%s', (zone, iso, expected) => {
    expect(at(iso, zone)).toBe(expected);
  });

  it('reads the wall clock as midnight with hour 0, never 24', () => {
    expect(zonedDateParts(new Date('2026-01-05T00:00:00Z'), 'UTC').hour).toBe(0);
    expect(zonedDateParts(new Date('2026-01-05T05:00:00Z'), 'America/Bogota').hour).toBe(0);
  });
});

describe('a date filter on a column shown in a zone', () => {
  const column = { field: () => 'v', type: () => 'date', format: () => '', order: () => undefined, aggregate: () => '', timeZone: () => 'Pacific/Auckland' } as unknown as ColumnConfig;

  it('compares the day shown in that zone, across the date line', () => {
    const row = { v: '2026-12-31T11:30:00Z' }; // 2027-01-01 00:30 in Auckland
    expect(matchesColumnFilter(column, row, { from: '2027-01-01', to: '2027-01-01' }, 'en')).toBe(true);
    expect(matchesColumnFilter(column, row, { from: '2026-12-31', to: '2026-12-31' }, 'en')).toBe(false);
  });
});

describe('locales and zones the runtime does not know', () => {
  it('writes month names with a locale that is not well formed, instead of throwing', () => {
    expect(() => formatDateValue(new Date(2026, 0, 5), 'MMMM', { locale: 'not_a_locale!' })).not.toThrow();
    expect(formatDateValue(new Date(2026, 0, 5), 'MMMM', { locale: 'not_a_locale!' })).toMatch(/^(01|January)$/);
  });

  it('formats a number with a locale that is not well formed, instead of throwing', () => {
    expect(() => formatCellValue(1234.5, 'number', '', 'not_a_locale!')).not.toThrow();
    expect(formatCellValue(1234.5, 'number', '', 'not_a_locale!')).toContain('1');
  });

  it('falls back to the browser zone for a zone name it does not know', () => {
    expect(at('2026-01-05T12:00:00Z', 'Mars/Olympus', 'YYYY')).toBe('2026');
  });

  it('reads a bare date as local midnight whatever the zone name of the column', () => {
    const d = coerceToDate('2026-03-29');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 2, 29]);
  });
});
