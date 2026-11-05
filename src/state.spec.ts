import { describe, expect, it } from 'vitest';
import { ALL_GRID_STATE_PARTS, GRID_STATE_VERSION, MAX_COLUMN_WIDTH, MIN_COLUMN_WIDTH, sanitizeGridState } from './index';

const good = {
  v: 1,
  columnWidths: { name: 120 },
  reorderedFields: ['b', 'a'],
  hiddenFields: ['c'],
  pinnedOverrides: { a: 'left', b: 'none' },
  sortCriteria: [{ field: 'a', direction: 'desc' }],
  filterQuery: 'ana',
  columnFilters: { qty: { min: '0', max: '9' }, tag: { values: ['x', 'y'] } },
};

describe('sanitizeGridState', () => {
  it('keeps a well-formed state as it is', () => {
    const { v: _v, ...expected } = good;
    expect(sanitizeGridState(good)).toEqual(expected);
  });

  it('reads nothing from what is not an object', () => {
    for (const bad of [null, undefined, 'x', 42, [], true]) expect(sanitizeGridState(bad)).toEqual({});
  });

  it('ignores a state written by a newer version', () => {
    expect(sanitizeGridState({ ...good, v: GRID_STATE_VERSION + 1 })).toEqual({});
    expect(sanitizeGridState({ ...good, v: 'two' })).toEqual({});
  });

  it('drops a part with the wrong type without touching the others', () => {
    const state = sanitizeGridState({ ...good, hiddenFields: 'c', sortCriteria: { field: 'a' }, filterQuery: 5 });
    expect(state.hiddenFields).toBeUndefined();
    expect(state.sortCriteria).toBeUndefined();
    expect(state.filterQuery).toBeUndefined();
    expect(state.columnWidths).toEqual({ name: 120 });
  });

  it('clamps widths and drops what is not a finite number', () => {
    const state = sanitizeGridState({ columnWidths: { a: 1, b: 99999, c: 'wide', d: null, e: Infinity, f: 150 } });
    expect(state.columnWidths).toEqual({ a: MIN_COLUMN_WIDTH, b: MAX_COLUMN_WIDTH, f: 150 });
  });

  it('refuses prototype keys and over-long or non-string field names', () => {
    const hostile = JSON.parse('{"columnWidths":{"__proto__":100,"constructor":100,"ok":100},"hiddenFields":["__proto__","ok",7,null]}');
    const state = sanitizeGridState(hostile);
    expect(Object.keys(state.columnWidths!)).toEqual(['ok']);
    expect(state.hiddenFields).toEqual(['ok']);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(sanitizeGridState({ hiddenFields: ['x'.repeat(500)] }).hiddenFields).toEqual([]);
  });

  it('keeps only known pin sides and sort directions', () => {
    const state = sanitizeGridState({ pinnedOverrides: { a: 'left', b: 'top' }, sortCriteria: [{ field: 'a', direction: 'up' }, { field: 'b', direction: 'asc' }, 'x'] });
    expect(state.pinnedOverrides).toEqual({ a: 'left' });
    expect(state.sortCriteria).toEqual([{ field: 'b', direction: 'asc' }]);
  });

  it('keeps only the known keys of a filter, with string values', () => {
    const state = sanitizeGridState({ columnFilters: { a: { text: 'x', evil: 'y', min: 0, values: ['a', 1, 'b'] }, b: 'nope', c: [] } });
    expect(state.columnFilters).toEqual({ a: { text: 'x', min: '0', values: ['a', 'b'] } });
  });

  it('caps the lengths', () => {
    const many = Array.from({ length: 5000 }, (_, i) => `f${i}`);
    expect(sanitizeGridState({ reorderedFields: many }).reorderedFields).toHaveLength(500);
    expect(sanitizeGridState({ sortCriteria: Array.from({ length: 50 }, () => ({ field: 'a', direction: 'asc' })) }).sortCriteria).toHaveLength(10);
    expect(sanitizeGridState({ filterQuery: 'q'.repeat(5000) }).filterQuery).toHaveLength(1000);
  });

  it('returns only the parts asked for', () => {
    expect(Object.keys(sanitizeGridState(good, ['sortCriteria', 'columnWidths']))).toEqual(['columnWidths', 'sortCriteria']);
    expect(ALL_GRID_STATE_PARTS).toHaveLength(7);
  });
});
