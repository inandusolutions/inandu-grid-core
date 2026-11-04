import { ColumnConfig, InanduGridColumnFilterValue, InanduGridRow } from './types';
import { coerceToDate, formatCellValue, NumberFormatter, zonedDateParts } from './format';

/**
 * Whether `value` has at least one non-empty key — an entry can exist (e.g. after typing then
 * clearing) without actually narrowing anything. `values` is the one exception: unlike every other
 * key, an *empty* array is still meaningful (see `matchesColumnFilter`) — the presence of the key
 * at all is what counts, not its length. Only an entirely absent/`undefined` `values` reads as "no
 * set-filter constraint".
 */
export function hasMeaningfulFilterValue(value: InanduGridColumnFilterValue | undefined): boolean {
  if (!value) return false;
  return Object.values(value).some(v => (Array.isArray(v) ? true : isSet(v)));
}

/** A bound or a text is entered when it is anything but absent or blank: `0` and `'0'` count, `''`, `null` and `undefined` do not. */
function isSet(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '' && value !== false;
}

/**
 * The filter keys that hold something the column cannot use: a `min`/`max` that is not a number or a `from`/`to` that is
 * not a date. Such a bound is ignored by `matchesColumnFilter` (the server ignores it too), which is silent; a grid can
 * call this to tell the user instead.
 */
export function invalidFilterBounds(column: ColumnConfig, filterValue: InanduGridColumnFilterValue): string[] {
  const keys = column.type() === 'number' ? (['min', 'max'] as const) : column.type() === 'date' ? (['from', 'to'] as const) : [];
  return keys.filter(key => {
    const bound = filterValue[key];
    if (!isSet(bound)) return false;
    return column.type() === 'number' ? !Number.isFinite(Number(bound)) : Number.isNaN(coerceToDate(bound).getTime());
  });
}

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Whether `row` satisfies `column`'s own filter control. An empty/absent `filterValue` (no
 * constraint entered for this column yet) always matches. Range checks (`'number'`/`'date'`) are
 * inclusive on both ends; a cell that can't be parsed as that column's type never matches once at
 * least one bound is set.
 *
 * `filterValue.values` (the set filter) is the one key that's *present-vs-absent*, not
 * *non-empty-vs-empty*: an `undefined` `values` falls through to the type-specific checks below,
 * same as omitting it; a *defined* `values` — even `[]` — takes over matching for the column
 * entirely, checked against the formatted display value. This is deliberate: `[]` is how "every
 * checkbox is unchecked" (match nothing) is told apart from "the set filter was never touched"
 * (match everything, i.e. don't constrain) — collapsing them to the same "no constraint" meaning,
 * like every other filter key's blank state does, would make unchecking every box a no-op instead
 * of the empty result a consumer building a set-filter checklist actually needs.
 */
export function matchesColumnFilter(
  column: ColumnConfig,
  row: InanduGridRow,
  filterValue: InanduGridColumnFilterValue,
  locale: string,
  numberFormatter?: NumberFormatter,
): boolean {
  const raw = row[column.field()];
  const timeZone = column.timeZone?.();
  if (filterValue.values !== undefined) {
    return filterValue.values.includes(formatCellValue(raw, column.type(), column.format(), locale, numberFormatter, timeZone));
  }
  switch (column.type()) {
    case 'number': {
      const hasMin = isSet(filterValue.min);
      const hasMax = isSet(filterValue.max);
      if (!hasMin && !hasMax) {
        return true;
      }
      const num = typeof raw === 'number' ? raw : Number(raw);
      // A blank or a boolean is not a number (`Number('')` is 0, `Number(true)` is 1).
      if (raw == null || typeof raw === 'boolean' || (typeof raw === 'string' && raw.trim() === '') || Number.isNaN(num)) {
        return false;
      }
      if (hasMin && num < Number(filterValue.min)) return false;
      if (hasMax && num > Number(filterValue.max)) return false;
      return true;
    }
    case 'date': {
      const hasFrom = isSet(filterValue.from);
      const hasTo = isSet(filterValue.to);
      if (!hasFrom && !hasTo) {
        return true;
      }
      if (raw == null) {
        return false;
      }
      const date = coerceToDate(raw);
      if (Number.isNaN(date.getTime())) {
        return false;
      }
      if (timeZone) {
        // A column shown in a zone filters by the calendar day it shows there: compare `yyyy-mm-dd` with `yyyy-mm-dd`.
        const parts = zonedDateParts(date, timeZone);
        const pad = (n: number, len = 2) => String(n).padStart(len, '0');
        const day = `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}`;
        const dayOf = (bound: string | undefined) => {
          const text = String(bound);
          if (DAY.test(text)) return text;
          const d = coerceToDate(text);
          return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        };
        if (hasFrom && day < dayOf(filterValue.from)) return false;
        if (hasTo && day > dayOf(filterValue.to)) return false;
        return true;
      }
      // Both bounds go through coerceToDate, so a bare yyyy-mm-dd means that calendar day in local time on both sides of
      // the comparison (the cell and the bound), whatever the time zone.
      if (hasFrom && date < coerceToDate(filterValue.from)) return false;
      if (hasTo) {
        const to = new Date(coerceToDate(filterValue.to));
        to.setHours(23, 59, 59, 999);
        if (date > to) return false;
      }
      return true;
    }
    case 'boolean': {
      if (!filterValue.bool) {
        return true;
      }
      return Boolean(raw) === (filterValue.bool === 'true');
    }
    default: {
      const text = (filterValue.text ?? '').trim().toLowerCase();
      if (!text) {
        return true;
      }
      return formatCellValue(raw, column.type(), column.format(), locale, numberFormatter, timeZone).toLowerCase().includes(text);
    }
  }
}
