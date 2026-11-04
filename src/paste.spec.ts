import { describe, expect, it } from 'vitest';
import { parsePastedCell, parsePastedCellValue } from './index';

describe('parsePastedCell', () => {
  it('returns the parsed value for text a column can hold', () => {
    expect(parsePastedCell('42', 'number')).toEqual({ value: 42 });
    expect(parsePastedCell('hello', 'string')).toEqual({ value: 'hello' });
    expect(parsePastedCell('true', 'boolean')).toEqual({ value: true });
    expect(parsePastedCell('no', 'boolean')).toEqual({ value: false });
  });

  it('keeps an empty string for a text column (clearing text is a legitimate paste)', () => {
    expect(parsePastedCell('', 'string')).toEqual({ value: '' });
  });

  it('skips what a number or date column cannot hold, instead of reporting undefined', () => {
    expect(parsePastedCellValue('', 'number')).toBeUndefined();
    expect(parsePastedCell('', 'number')).toBeUndefined();
    expect(parsePastedCell('abc', 'number')).toBeUndefined();
    expect(parsePastedCell('not a date', 'date')).toBeUndefined();
  });

  it('parses a bare date as a local calendar date', () => {
    const parsed = parsePastedCell('2024-01-05', 'date');
    const d = parsed!.value as Date;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2024, 0, 5]);
  });
});
