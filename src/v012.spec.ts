import { describe, expect, it } from 'vitest';
import {
  compareCellValues,
  formatCellValue,
  formatDateValue,
  hasMeaningfulFilterValue,
  invalidFilterBounds,
  matchesColumnFilter,
  parseLocaleNumber,
  parsePastedCell,
  parsePastedDate,
} from './index';
import type { ColumnConfig, InanduColumnType } from './index';

const column = (type: InanduColumnType, extra: Partial<ColumnConfig> = {}): ColumnConfig => ({
  field: () => 'v',
  type: () => type,
  format: () => '',
  order: () => undefined,
  aggregate: () => '',
  ...extra,
});

describe('strict, locale-aware paste', () => {
  it('reads a number in the separators of its locale', () => {
    expect(parseLocaleNumber('1.234,56', 'es')).toBe(1234.56);
    expect(parseLocaleNumber('1,234.56', 'en')).toBe(1234.56);
    expect(parseLocaleNumber('1,5', 'es')).toBe(1.5);
    expect(parseLocaleNumber('-3', 'en')).toBe(-3);
    expect(parseLocaleNumber('42')).toBe(42);
  });

  it('rejects what Number() would let through', () => {
    for (const bad of ['Infinity', '-Infinity', 'NaN', '0x10', '0b1', '1e999', '', '   ', 'abc', '1,5', '1.2.3']) {
      expect(parseLocaleNumber(bad)).toBeUndefined();
    }
    expect(parseLocaleNumber('1,5', 'en')).toBeUndefined(); // a group separator in the wrong place
    expect(parsePastedCell('   ', 'number')).toBeUndefined();
    expect(parsePastedCell('Infinity', 'number')).toBeUndefined();
  });

  it('reads ISO dates always and numeric dates in the order of the locale', () => {
    const iso = parsePastedDate('2024-01-05')!;
    expect([iso.getFullYear(), iso.getMonth(), iso.getDate()]).toEqual([2024, 0, 5]);
    const es = parsePastedDate('05/01/2024', 'es')!;
    expect([es.getMonth(), es.getDate()]).toEqual([0, 5]);
    const us = parsePastedDate('05/01/2024', 'en-US')!;
    expect([us.getMonth(), us.getDate()]).toEqual([4, 1]);
  });

  it('rejects an ambiguous or impossible date', () => {
    expect(parsePastedDate('05/01/2024')).toBeUndefined(); // no locale to say which is the month
    expect(parsePastedDate('31/02/2024', 'es')).toBeUndefined();
    expect(parsePastedDate('2024-02-31')).toBeUndefined();
    expect(parsePastedDate('')).toBeUndefined();
    expect(parsePastedDate('12345')).toBeUndefined();
  });

  it('reads booleans from a dictionary plus the labels of the column', () => {
    expect(parsePastedCell('sí', 'boolean')).toEqual({ value: true });
    expect(parsePastedCell('NO', 'boolean')).toEqual({ value: false });
    expect(parsePastedCell('0', 'boolean')).toEqual({ value: false });
    expect(parsePastedCell('quizás', 'boolean')).toBeUndefined();
    expect(parsePastedCell('activo', 'boolean', { booleanLabels: { truthy: ['Activo'], falsy: ['Baja'] } })).toEqual({ value: true });
    expect(parsePastedCell('baja', 'boolean', { booleanLabels: { falsy: ['Baja'] } })).toEqual({ value: false });
  });
});

describe('sort by column type', () => {
  it('compares text that stands for numbers as numbers', () => {
    expect(['10', '9', '2'].sort((a, b) => compareCellValues(a, b, { type: 'number' }))).toEqual(['2', '9', '10']);
  });

  it('compares text that stands for dates as dates', () => {
    const sorted = ['2024-12-01', '2024-02-01', '2023-05-09'].sort((a, b) => compareCellValues(a, b, { type: 'date' }));
    expect(sorted).toEqual(['2023-05-09', '2024-02-01', '2024-12-01']);
  });

  it('puts a blank text first in a numeric column', () => {
    expect(compareCellValues('', '3', { type: 'number' })).toBeLessThan(0);
  });

  it('still takes a locale string as the third argument', () => {
    expect(compareCellValues('á', 'b', 'es')).toBeLessThan(0);
    expect(compareCellValues('a', 'a')).toBe(0);
  });
});

describe('numeric columns and blanks', () => {
  it('shows a blank as blank and a boolean as itself, not 0 and 1', () => {
    expect(formatCellValue('', 'number', '', 'en')).toBe('');
    expect(formatCellValue('   ', 'number', '', 'en')).toBe('');
    expect(formatCellValue(true, 'number', '', 'en')).toBe('true');
    expect(formatCellValue(0, 'number', '', 'en')).toBe('0');
    expect(formatCellValue('7', 'number', '', 'en')).toBe('7');
  });

  it('a blank cell does not satisfy a numeric range', () => {
    expect(matchesColumnFilter(column('number'), { v: '' }, { max: '5' }, 'en')).toBe(false);
    expect(matchesColumnFilter(column('number'), { v: true }, { min: '0' }, 'en')).toBe(false);
  });
});

describe('a zero bound is a bound', () => {
  const num = column('number');
  it('applies min and max of 0, as a number or as text', () => {
    for (const zero of [0, '0'] as unknown as string[]) {
      expect(matchesColumnFilter(num, { v: -1 }, { min: zero }, 'en')).toBe(false);
      expect(matchesColumnFilter(num, { v: 0 }, { min: zero }, 'en')).toBe(true);
      expect(matchesColumnFilter(num, { v: 1 }, { max: zero }, 'en')).toBe(false);
      expect(matchesColumnFilter(num, { v: 0 }, { max: zero }, 'en')).toBe(true);
    }
  });

  it('a blank or absent bound constrains nothing', () => {
    for (const none of ['', undefined, null] as unknown as string[]) {
      expect(matchesColumnFilter(num, { v: 99 }, { min: none, max: none }, 'en')).toBe(true);
    }
  });

  it('counts 0 as something entered', () => {
    expect(hasMeaningfulFilterValue({ min: 0 as unknown as string })).toBe(true);
    expect(hasMeaningfulFilterValue({ min: '0' })).toBe(true);
    expect(hasMeaningfulFilterValue({ min: '' })).toBe(false);
    expect(hasMeaningfulFilterValue({})).toBe(false);
    expect(hasMeaningfulFilterValue(undefined)).toBe(false);
  });
});

describe('invalid bounds are reported', () => {
  it('names the number and date bounds that are ignored', () => {
    expect(invalidFilterBounds(column('number'), { min: 'abc', max: '5' })).toEqual(['min']);
    expect(invalidFilterBounds(column('number'), { min: '0' })).toEqual([]);
    expect(invalidFilterBounds(column('date'), { from: 'nope', to: '2024-01-05' })).toEqual(['from']);
    expect(invalidFilterBounds(column('string'), { text: 'x' })).toEqual([]);
  });
});

describe('date tokens', () => {
  const date = new Date(2024, 0, 5, 14, 7, 9, 12);

  it('escapes literal text between brackets', () => {
    expect(formatDateValue(date, 'DD [de] MMMM [de] YYYY', { locale: 'es' })).toBe('05 de enero de 2024');
    expect(formatDateValue(date, '[YYYY]')).toBe('YYYY');
  });

  it('writes the month name in the locale', () => {
    expect(formatDateValue(date, 'MMMM', { locale: 'en' })).toBe('January');
    expect(formatDateValue(date, 'MMM', { locale: 'en' })).toBe('Jan');
    expect(formatDateValue(date, 'MMMM', { locale: 'es' })).toBe('enero');
  });

  it('pads a year under 1000 to four digits', () => {
    const old = new Date(2000, 0, 1);
    old.setFullYear(999);
    expect(formatDateValue(old, 'YYYY')).toBe('0999');
  });

  it('keeps the numeric tokens', () => {
    expect(formatDateValue(date, 'YYYY-MM-DD HH:mm:ss.sss')).toBe('2024-01-05 14:07:09.012');
  });
});

describe('timeZone', () => {
  const instant = new Date('2024-01-05T00:00:00Z');

  it('shows the instant in the zone of the column', () => {
    expect(formatCellValue(instant, 'date', 'YYYY-MM-DD HH:mm', 'en', undefined, 'utc')).toBe('2024-01-05 00:00');
    expect(formatCellValue(instant, 'date', 'YYYY-MM-DD HH:mm', 'en', undefined, 'America/Bogota')).toBe('2024-01-04 19:00');
    expect(formatCellValue(instant, 'date', 'YYYY-MM-DD HH:mm', 'en', undefined, 'Asia/Tokyo')).toBe('2024-01-05 09:00');
  });

  it('falls back to the browser zone for a name that is not a zone', () => {
    expect(formatCellValue(instant, 'date', 'YYYY', 'en', undefined, 'Not/AZone')).toBe(formatCellValue(instant, 'date', 'YYYY', 'en'));
  });

  it('filters by the day the column shows', () => {
    const utc = column('date', { timeZone: () => 'utc' });
    const bogota = column('date', { timeZone: () => 'America/Bogota' });
    const row = { v: '2024-01-05T00:00:00Z' };
    expect(matchesColumnFilter(utc, row, { from: '2024-01-05', to: '2024-01-05' }, 'en')).toBe(true);
    expect(matchesColumnFilter(bogota, row, { from: '2024-01-05', to: '2024-01-05' }, 'en')).toBe(false);
    expect(matchesColumnFilter(bogota, row, { from: '2024-01-04', to: '2024-01-04' }, 'en')).toBe(true);
  });
});
