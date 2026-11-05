import { MAX_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from './constants';
import type { InanduColumnStickySide, InanduGridColumnFilterValue } from './types';

/** Version written with a saved grid state. A blob from a newer version is ignored, one without a version is read as version 1. */
export const GRID_STATE_VERSION = 1;

/** The parts of a grid's runtime state that can be saved and restored. */
export type InanduGridStatePart = 'columnWidths' | 'reorderedFields' | 'hiddenFields' | 'pinnedOverrides' | 'sortCriteria' | 'filterQuery' | 'columnFilters';

export const ALL_GRID_STATE_PARTS: readonly InanduGridStatePart[] = [
  'columnWidths',
  'reorderedFields',
  'hiddenFields',
  'pinnedOverrides',
  'sortCriteria',
  'filterQuery',
  'columnFilters',
];

export interface InanduGridSavedState {
  columnWidths: Record<string, number>;
  reorderedFields: string[];
  hiddenFields: string[];
  pinnedOverrides: Record<string, InanduColumnStickySide | 'none'>;
  sortCriteria: Array<{ field: string; direction: 'asc' | 'desc' }>;
  filterQuery: string;
  columnFilters: Record<string, InanduGridColumnFilterValue>;
}

const MAX_FIELD_LENGTH = 200;
const MAX_FIELDS = 500;
const MAX_SORT_CRITERIA = 10;
const MAX_TEXT_LENGTH = 1000;
const MAX_SET_VALUES = 1000;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const FILTER_TEXT_KEYS = ['text', 'min', 'max', 'from', 'to', 'bool'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isFieldName = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= MAX_FIELD_LENGTH && !FORBIDDEN_KEYS.has(value);

function fieldList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return [...new Set(value.filter(isFieldName))].slice(0, MAX_FIELDS);
}

function sanitizeFilter(value: unknown): InanduGridColumnFilterValue | undefined {
  if (!isRecord(value)) return undefined;
  const out: InanduGridColumnFilterValue = {};
  for (const key of FILTER_TEXT_KEYS) {
    const entry = value[key];
    if (typeof entry === 'string' && entry.length <= MAX_TEXT_LENGTH) out[key] = entry;
    // A number saved by a programmatic filter (a bound of 0) is kept as the text the UI would have produced.
    else if (typeof entry === 'number' && Number.isFinite(entry)) out[key] = String(entry);
  }
  if (Array.isArray(value['values'])) {
    out.values = value['values'].filter((v): v is string => typeof v === 'string' && v.length <= MAX_TEXT_LENGTH).slice(0, MAX_SET_VALUES);
  }
  return out;
}

/**
 * Reads whatever came out of storage (`JSON.parse` of a blob that may be old, hand-edited, from another version or
 * hostile) and returns only the parts that have the right shape, with the right types and inside sane limits. A part
 * that is wrong is left out; it is never half-applied. `parts` limits the answer to the parts the grid persists.
 */
export function sanitizeGridState(value: unknown, parts: readonly InanduGridStatePart[] = ALL_GRID_STATE_PARTS): Partial<InanduGridSavedState> {
  if (!isRecord(value)) return {};
  const version = value['v'];
  if (version !== undefined && (typeof version !== 'number' || version > GRID_STATE_VERSION)) return {};
  const wanted = new Set(parts);
  const out: Partial<InanduGridSavedState> = {};

  if (wanted.has('columnWidths') && isRecord(value['columnWidths'])) {
    const widths: Record<string, number> = {};
    for (const [field, width] of Object.entries(value['columnWidths'])) {
      if (isFieldName(field) && typeof width === 'number' && Number.isFinite(width)) {
        widths[field] = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, width));
      }
    }
    out.columnWidths = widths;
  }
  if (wanted.has('reorderedFields')) {
    const list = fieldList(value['reorderedFields']);
    if (list) out.reorderedFields = list;
  }
  if (wanted.has('hiddenFields')) {
    const list = fieldList(value['hiddenFields']);
    if (list) out.hiddenFields = list;
  }
  if (wanted.has('pinnedOverrides') && isRecord(value['pinnedOverrides'])) {
    const pins: Record<string, InanduColumnStickySide | 'none'> = {};
    for (const [field, side] of Object.entries(value['pinnedOverrides'])) {
      if (isFieldName(field) && (side === 'left' || side === 'right' || side === 'none')) pins[field] = side;
    }
    out.pinnedOverrides = pins;
  }
  if (wanted.has('sortCriteria') && Array.isArray(value['sortCriteria'])) {
    out.sortCriteria = value['sortCriteria']
      .filter((c): c is { field: string; direction: 'asc' | 'desc' } => isRecord(c) && isFieldName(c['field']) && (c['direction'] === 'asc' || c['direction'] === 'desc'))
      .map(c => ({ field: c.field, direction: c.direction }))
      .slice(0, MAX_SORT_CRITERIA);
  }
  if (wanted.has('filterQuery') && typeof value['filterQuery'] === 'string') {
    out.filterQuery = value['filterQuery'].slice(0, MAX_TEXT_LENGTH);
  }
  if (wanted.has('columnFilters') && isRecord(value['columnFilters'])) {
    const filters: Record<string, InanduGridColumnFilterValue> = {};
    for (const [field, filter] of Object.entries(value['columnFilters'])) {
      const clean = isFieldName(field) ? sanitizeFilter(filter) : undefined;
      if (clean) filters[field] = clean;
    }
    out.columnFilters = filters;
  }
  return out;
}
