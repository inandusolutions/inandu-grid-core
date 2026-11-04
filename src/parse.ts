import { InanduColumnType } from './types';

/**
 * Parses a row-edit draft's raw control value (a string for text/number/date, a boolean for the
 * checkbox — see `InanduGridComponent.onRowFieldChange`) per the column's `type`. Returns `undefined` for
 * an unparseable `'number'`/`'date'`, the signal `saveRow()` uses to omit that field from `values`
 * rather than committing garbage.
 */
export function parseDraftValue(raw: unknown, type: InanduColumnType): unknown {
  switch (type) {
    case 'number': {
      // An empty string is what a native <input type="number"> actually reports for non-numeric
      // input (the browser silently rejects it and resets `.value` to '' — it never holds invalid
      // text like "abc" the way a plain text input would), so this is the realistic "unparseable" case.
      if (raw === '' || raw === undefined) {
        return undefined;
      }
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    case 'date': {
      // A native `<input type="date">` value is a bare `yyyy-mm-dd`, which `new Date(str)` parses as
      // **UTC** midnight — but the string was produced from *local* date parts (`dateEditValue()`), so
      // round-tripping through UTC shifts the day for anyone west of UTC. Reconstruct it as a local date.
      const match = typeof raw === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw) : null;
      const parsed = match
        ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
        : new Date(raw as string);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }
    case 'boolean':
      return !!raw;
    default:
      return raw;
  }
}

/** Options for reading pasted text; every field is optional and the defaults keep the plain, locale-free reading. */
export interface InanduPasteOptions {
  /**
   * BCP 47 locale the text was written in (the grid's locale). It decides the decimal and group separators of a number
   * (`1.234,56` in `es`, `1,234.56` in `en`) and the order of a numeric date (`05/01/2024` is 5 January in `es`, 1 May
   * in `en-US`). Without it a number is read with `.` as the decimal point and no grouping, and only ISO dates are read.
   */
  locale?: string;
  /** Extra words read as `true`/`false` for a boolean column, on top of the built-in dictionary (case-insensitive). */
  booleanLabels?: { truthy?: readonly string[]; falsy?: readonly string[] };
}

const TRUTHY = ['true', '1', 'yes', 'y', 'sí', 'si', 'verdadero', 'oui', 'vrai', 'vero', '是', '真'];
const FALSY = ['false', '0', 'no', 'n', 'falso', 'non', 'faux', '否', '假'];

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function numberSeparators(locale: string | undefined): { group: string; decimal: string } {
  if (!locale) return { group: '', decimal: '.' };
  try {
    const parts = new Intl.NumberFormat(locale).formatToParts(-12345.6);
    return {
      group: parts.find(p => p.type === 'group')?.value ?? '',
      decimal: parts.find(p => p.type === 'decimal')?.value ?? '.',
    };
  } catch {
    return { group: '', decimal: '.' };
  }
}

/**
 * Reads text as a finite number in the given locale; `undefined` when it is not one. Strict on purpose: `Number()`
 * accepts `Infinity`, `0x10`, `0b1` and a blank as `0`, none of which anybody means by pasting.
 */
export function parseLocaleNumber(raw: string, locale?: string): number | undefined {
  const text = raw.trim().replace(/−/g, '-');
  if (!text) return undefined;
  const { group, decimal } = numberSeparators(locale);
  const d = escapeRegExp(decimal);
  const spaceGroup = group !== '' && /^\s$/.test(group);
  const g = group === '' ? '' : spaceGroup ? '[\\s\\u00A0\\u202F]' : escapeRegExp(group);
  const int = g ? `(?:\\d{1,3}(?:${g}\\d{3})+|\\d+)` : '\\d+';
  const pattern = new RegExp(`^[+-]?(?:${int}(?:${d}\\d*)?|${d}\\d+)(?:[eE][+-]?\\d+)?$`);
  if (!pattern.test(text)) return undefined;
  let normalized = text;
  if (g) normalized = normalized.replace(new RegExp(g, 'g'), '');
  normalized = normalized.replace(decimal, '.');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
}

function datePartOrder(locale: string | undefined): Array<'day' | 'month' | 'year'> | undefined {
  if (!locale) return undefined;
  try {
    const order = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric', year: 'numeric' })
      .formatToParts(new Date(2001, 10, 23))
      .map(p => p.type)
      .filter((t): t is 'day' | 'month' | 'year' => t === 'day' || t === 'month' || t === 'year');
    return order.length === 3 ? order : undefined;
  } catch {
    return undefined;
  }
}

function localDate(year: number, month: number, day: number): Date | undefined {
  const date = new Date(year, month - 1, day);
  // `new Date(2024, 1, 31)` is 2 March: only a date that comes back as asked is a real one.
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}

/**
 * Reads pasted text as a date; `undefined` when it is not one or when it is ambiguous. ISO text (`2024-01-05`, with an
 * optional time) is always read. A numeric `a/b/yyyy` is read in the order the locale writes it, and only then.
 */
export function parsePastedDate(raw: string, locale?: string): Date | undefined {
  const text = raw.trim();
  if (!text) return undefined;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) return localDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(text)) {
    const parsed = new Date(text.replace(' ', 'T'));
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  const numeric = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  if (numeric) {
    const order = datePartOrder(locale);
    if (!order) return undefined; // 05/01/2024 with no locale to say which is the month
    const values: Record<string, number> = { [order[0]]: Number(numeric[1]), [order[1]]: Number(numeric[2]), [order[2]]: Number(numeric[3]) };
    return localDate(values['year'], values['month'], values['day']);
  }
  if (/[A-Za-z]/.test(text)) {
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  return undefined;
}

/**
 * Reads pasted text as a boolean through a dictionary (`true`/`yes`/`sí`/`1`..., `false`/`no`/`0`...); `undefined` for
 * anything else, so a cell that says something else is skipped instead of being turned into `false`.
 */
export function parsePastedBoolean(raw: string, options: InanduPasteOptions = {}): boolean | undefined {
  const word = raw.trim().toLowerCase();
  if (!word) return undefined;
  if (TRUTHY.includes(word) || options.booleanLabels?.truthy?.some(l => l.toLowerCase() === word)) return true;
  if (FALSY.includes(word) || options.booleanLabels?.falsy?.some(l => l.toLowerCase() === word)) return false;
  return undefined;
}

/**
 * Parses one pasted TSV cell's raw text per `type`. A pasted cell is always plain text, so unlike `parseDraftValue()`
 * it is read strictly: a number that is not a finite number in the locale, a date that is not a real or unambiguous
 * date and a boolean that is not in the dictionary all come back `undefined` (the cell is skipped, never cleared).
 */
export function parsePastedCellValue(raw: string, type: InanduColumnType, options: InanduPasteOptions = {}): unknown {
  switch (type) {
    case 'number':
      return parseLocaleNumber(raw, options.locale);
    case 'date':
      return parsePastedDate(raw, options.locale);
    case 'boolean':
      return parsePastedBoolean(raw, options);
    default:
      return raw;
  }
}

/**
 * A pasted cell ready to apply, or `undefined` when it should be skipped. `parsePastedCellValue` answers `undefined`
 * for text a column cannot hold (a blank or invalid number or date); applying that as an update would clear the
 * cell, which a paste never meant to do. Callers push `{ row, field, value }` only when this returns a result.
 */
export function parsePastedCell(raw: string, type: InanduColumnType, options: InanduPasteOptions = {}): { value: unknown } | undefined {
  const value = parsePastedCellValue(raw, type, options);
  return value === undefined ? undefined : { value };
}
