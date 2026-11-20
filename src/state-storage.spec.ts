import { afterEach, describe, expect, it, vi } from 'vitest';
import { ALL_GRID_STATE_PARTS, GRID_STATE_VERSION, STATE_STORAGE_PREFIX, clearSavedGridState, readSavedGridState, writeSavedGridState } from './index';
import type { GridStateStorage, InanduGridSavedState } from './index';

const KEY = 'state-storage-spec';
const STORAGE_KEY = STATE_STORAGE_PREFIX + KEY;
const state: InanduGridSavedState = {
  columnWidths: { name: 150 },
  reorderedFields: ['score', 'name'],
  hiddenFields: ['id'],
  pinnedOverrides: {},
  sortCriteria: [{ field: 'name', direction: 'asc' }],
  filterQuery: 'amy',
  columnFilters: {},
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.removeItem(STORAGE_KEY);
});

describe('saved grid state', () => {
  it('writes a versioned blob and reads the same state back', () => {
    writeSavedGridState(KEY, state, ALL_GRID_STATE_PARTS);

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) as string).v).toBe(GRID_STATE_VERSION);
    expect(readSavedGridState(KEY, ALL_GRID_STATE_PARTS)).toEqual(state);
  });

  it('saves and restores only the parts it is asked for', () => {
    writeSavedGridState(KEY, state, ['sortCriteria', 'columnWidths']);

    expect(Object.keys(JSON.parse(localStorage.getItem(STORAGE_KEY) as string)).sort()).toEqual(['columnWidths', 'sortCriteria', 'v']);
    expect(readSavedGridState(KEY, ['sortCriteria'])).toEqual({ sortCriteria: state.sortCriteria });
  });

  it('reads {} when there is nothing, when the blob is not JSON, or when it comes from a newer version', () => {
    expect(readSavedGridState(KEY, ALL_GRID_STATE_PARTS)).toEqual({});

    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(readSavedGridState(KEY, ALL_GRID_STATE_PARTS)).toEqual({});

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: GRID_STATE_VERSION + 1, filterQuery: 'x' }));
    expect(readSavedGridState(KEY, ALL_GRID_STATE_PARTS)).toEqual({});
  });

  it('keeps only the parts with the right shape', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, filterQuery: 42, columnWidths: { name: 120 } }));
    expect(readSavedGridState(KEY, ALL_GRID_STATE_PARTS)).toEqual({ columnWidths: { name: 120 } });
  });

  it('clear removes the blob', () => {
    writeSavedGridState(KEY, state, ALL_GRID_STATE_PARTS);
    clearSavedGridState(KEY);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('does nothing without a key', () => {
    const setSpy = vi.spyOn(Storage.prototype, 'setItem');
    writeSavedGridState('', state, ALL_GRID_STATE_PARTS);
    clearSavedGridState('');
    expect(setSpy).not.toHaveBeenCalled();
    expect(readSavedGridState('', ALL_GRID_STATE_PARTS)).toEqual({});
  });

  it('never throws when storage fails', () => {
    const broken: GridStateStorage = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('quota'); },
      removeItem: () => { throw new Error('denied'); },
    };
    expect(readSavedGridState(KEY, ALL_GRID_STATE_PARTS, broken)).toEqual({});
    expect(() => writeSavedGridState(KEY, state, ALL_GRID_STATE_PARTS, broken)).not.toThrow();
    expect(() => clearSavedGridState(KEY, broken)).not.toThrow();
  });

  it('works on any storage-shaped object', () => {
    const data = new Map<string, string>();
    const memory: GridStateStorage = {
      getItem: k => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: k => void data.delete(k),
    };
    writeSavedGridState(KEY, state, ALL_GRID_STATE_PARTS, memory);
    expect(readSavedGridState(KEY, ALL_GRID_STATE_PARTS, memory)).toEqual(state);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('without localStorage (server rendering) it reads {} and writes nothing', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(readSavedGridState(KEY, ALL_GRID_STATE_PARTS)).toEqual({});
    expect(() => writeSavedGridState(KEY, state, ALL_GRID_STATE_PARTS)).not.toThrow();
    expect(() => clearSavedGridState(KEY)).not.toThrow();
  });
});
