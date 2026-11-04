import { describe, expect, it } from 'vitest';
import { hasMeaningfulFilterValue, matchesColumnFilter } from './index';
import type { ColumnConfig, InanduColumnType, InanduGridColumnFilterValue } from './index';

function column(type: InanduColumnType, format = ''): ColumnConfig {
  return { field: () => 'f', type: () => type, format: () => format } as unknown as ColumnConfig;
}

const matches = (type: InanduColumnType, raw: unknown, filter: InanduGridColumnFilterValue, format = '') =>
  matchesColumnFilter(column(type, format), { f: raw }, filter, 'en-US');

describe('hasMeaningfulFilterValue', () => {
  it('is false for nothing, for {} and for keys that hold nothing', () => {
    expect(hasMeaningfulFilterValue(undefined)).toBe(false);
    expect(hasMeaningfulFilterValue({})).toBe(false);
    expect(hasMeaningfulFilterValue({ text: '', min: '' })).toBe(false);
  });
  it('is true when some key narrows the column', () => {
    expect(hasMeaningfulFilterValue({ text: 'a' })).toBe(true);
    expect(hasMeaningfulFilterValue({ bool: 'false' })).toBe(true);
  });
  it('treats an empty set filter as meaningful (nothing ticked matches nothing)', () => {
    expect(hasMeaningfulFilterValue({ values: [] })).toBe(true);
  });
});

describe('matchesColumnFilter: set filter', () => {
  it('matches the formatted display value', () => {
    expect(matches('number', 1234.5, { values: ['1,234.5'] }, '1.0-2')).toBe(true);
    expect(matches('number', 1234.5, { values: ['1234.5'] }, '1.0-2')).toBe(false);
  });
  it('an empty set matches nothing, and it takes over the column', () => {
    expect(matches('string', 'a', { values: [], text: 'a' })).toBe(false);
  });
  it('can match the empty display of a null cell', () => {
    expect(matches('string', null, { values: [''] })).toBe(true);
  });
});

describe('matchesColumnFilter: number range', () => {
  it('is inclusive on both ends', () => {
    expect(matches('number', 5, { min: '5', max: '10' })).toBe(true);
    expect(matches('number', 10, { min: '5', max: '10' })).toBe(true);
    expect(matches('number', 4.99, { min: '5' })).toBe(false);
    expect(matches('number', 10.01, { max: '10' })).toBe(false);
  });
  it('matches everything when no bound is set', () => {
    expect(matches('number', 'whatever', {})).toBe(true);
  });
  it('never matches a cell that is not a number once a bound is set', () => {
    expect(matches('number', null, { min: '1' })).toBe(false);
    expect(matches('number', 'abc', { max: '1' })).toBe(false);
  });
  it('reads a numeric string cell as a number', () => {
    expect(matches('number', '7', { min: '5', max: '10' })).toBe(true);
  });
});

describe('matchesColumnFilter: boolean', () => {
  it('matches true / false and everything without a choice', () => {
    expect(matches('boolean', true, { bool: 'true' })).toBe(true);
    expect(matches('boolean', 0, { bool: 'true' })).toBe(false);
    expect(matches('boolean', 0, { bool: 'false' })).toBe(true);
    expect(matches('boolean', true, {})).toBe(true);
  });
});

describe('matchesColumnFilter: text', () => {
  it('is a case-insensitive contains over the display value', () => {
    expect(matches('string', 'Hello World', { text: 'WORLD' })).toBe(true);
    expect(matches('string', 'Hello World', { text: 'xyz' })).toBe(false);
  });
  it('trims the needle and ignores a blank one', () => {
    expect(matches('string', 'Hello', { text: '  ell  ' })).toBe(true);
    expect(matches('string', 'Hello', { text: '   ' })).toBe(true);
  });
  it('searches the formatted value, not the raw one', () => {
    expect(matches('number', 1234.5, { text: '1,234' }, '1.0-2')).toBe(true);
  });
});

describe('matchesColumnFilter: date range', () => {
  it('matches everything with no bound, and nothing for a null or unparseable cell once a bound is set', () => {
    expect(matches('date', 'garbage', {})).toBe(true);
    expect(matches('date', null, { from: '2024-01-01' })).toBe(false);
    expect(matches('date', 'garbage', { to: '2024-01-01' })).toBe(false);
  });
  it('is inclusive on both days', () => {
    expect(matches('date', '2024-01-01', { from: '2024-01-01', to: '2024-01-31' })).toBe(true);
    expect(matches('date', '2024-01-31', { from: '2024-01-01', to: '2024-01-31' })).toBe(true);
    expect(matches('date', '2023-12-31', { from: '2024-01-01' })).toBe(false);
    expect(matches('date', '2024-02-01', { to: '2024-01-31' })).toBe(false);
  });
  it('compares a Date cell with a time of day against the whole "to" day', () => {
    expect(matches('date', new Date(2024, 0, 31, 23, 59), { to: '2024-01-31' })).toBe(true);
  });
});
