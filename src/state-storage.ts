import { STATE_STORAGE_PREFIX } from './constants';
import { GRID_STATE_VERSION, sanitizeGridState } from './state';
import type { InanduGridSavedState, InanduGridStatePart } from './state';

/** The part of `Storage` the grids use. `localStorage` fits; so does any object with these three methods. */
export type GridStateStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** `localStorage` when there is one that can be reached, else `undefined` (server rendering, or a browser that blocks it). */
function defaultStorage(): GridStateStorage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/**
 * What is saved under `key`, limited to `parts`, with only the parts that have the right shape, types and sizes
 * (`sanitizeGridState`); never the raw parsed object. `{}` when there is no key, no storage, nothing saved, or it cannot be read
 * or parsed. Never throws.
 */
export function readSavedGridState(
  key: string,
  parts: readonly InanduGridStatePart[],
  storage: GridStateStorage | undefined = defaultStorage(),
): Partial<InanduGridSavedState> {
  if (!key || !storage) return {};
  try {
    const raw = storage.getItem(STATE_STORAGE_PREFIX + key);
    return raw ? sanitizeGridState(JSON.parse(raw), parts) : {};
  } catch {
    return {};
  }
}

/**
 * Saves the `parts` of `state` under `key`, as a versioned blob. A save that cannot happen (no key, no storage, quota, private mode)
 * is skipped: persistence is a convenience, not a guarantee. Never throws.
 */
export function writeSavedGridState(
  key: string,
  state: Partial<InanduGridSavedState>,
  parts: readonly InanduGridStatePart[],
  storage: GridStateStorage | undefined = defaultStorage(),
): void {
  if (!key || !storage) return;
  try {
    const wanted = new Set<string>(parts);
    const saved = Object.fromEntries(Object.entries(state).filter(([part]) => wanted.has(part)));
    storage.setItem(STATE_STORAGE_PREFIX + key, JSON.stringify({ v: GRID_STATE_VERSION, ...saved }));
  } catch {
    // The next change tries again.
  }
}

/** Removes what is saved under `key`. Never throws. */
export function clearSavedGridState(key: string, storage: GridStateStorage | undefined = defaultStorage()): void {
  if (!key || !storage) return;
  try {
    storage.removeItem(STATE_STORAGE_PREFIX + key);
  } catch {
    // Nothing saved that could be cleared.
  }
}
