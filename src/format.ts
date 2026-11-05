import { InanduColumnType } from './types';

/**
 * Turns a raw numeric value into its display string. `digitsInfo` is a `DecimalPipe`-style
 * `'{minInt}.{minFrac}-{maxFrac}'` string (e.g. `"1.2-2"`), or empty for the default.
 *
 * Injected into `formatCellValue()` so the framework layer can choose the implementation: the
 * Angular component passes one backed by `@angular/common`'s `formatNumber` (honouring whatever
 * locale data the host app registered), keeping its output byte-identical to before this folder
 * existed. `defaultNumberFormatter` below is the standalone fallback for a non-Angular consumer.
 */
export type NumberFormatter = (value: number, locale: string, digitsInfo?: string) => string;

const DIGITS_INFO_PATTERN = /^(\d+)?\.(\d+)-(\d+)$/;

/** `Intl.NumberFormat`-based `NumberFormatter`. Parses the `digitsInfo` mini-syntax; falls back to Angular's own default of up to 3 fraction digits (`'1.0-3'`) when it's absent. */
export function defaultNumberFormatter(value: number, locale: string, digitsInfo?: string): string {
  const options: Intl.NumberFormatOptions = {};
  const match = digitsInfo ? DIGITS_INFO_PATTERN.exec(digitsInfo) : null;
  if (match) {
    // Intl throws a RangeError for min > max or a count past its limits, so clamp what a bad digitsInfo asks for.
    if (match[1]) {
      options.minimumIntegerDigits = Math.min(21, Math.max(1, Number(match[1])));
    }
    const minFraction = Math.min(100, Number(match[2]));
    options.minimumFractionDigits = minFraction;
    options.maximumFractionDigits = Math.max(minFraction, Math.min(100, Number(match[3])));
  } else {
    options.maximumFractionDigits = 3;
  }
  try {
    return new Intl.NumberFormat(locale || undefined, options).format(value);
  } catch (error) {
    // A locale that is not well formed ('en_US', a typo) makes Intl throw a RangeError; that must not take the grid down.
    if (error instanceof RangeError) return new Intl.NumberFormat(undefined, options).format(value);
    throw error;
  }
}

/**
 * Coerces a raw cell value to a `Date` for `type="date"` columns — accepts a `Date`, a timestamp,
 * or a string. Safari's `Date` string parser is stricter than Chrome's; notably it returns an
 * Invalid Date for a space-separated `"yyyy-mm-dd hh:mm[:ss]"` that Chrome happily parses. That one
 * common case is normalised to the ISO `T` form before parsing, so a `type="date"` column renders
 * and filters identically in both. Anything still unparseable comes back as an Invalid Date — every
 * caller already guards with `Number.isNaN(date.getTime())`.
 */
export function coerceToDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    // A bare `yyyy-mm-dd` is a calendar date. `new Date('2025-06-15')` reads it as UTC midnight, which west of UTC is
    // the evening of the 14th in local time (and the formatter and the filter both work in local time), so build it
    // as local midnight, the way a `type="date"` input means it.
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (dateOnly) {
      return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    }
    return new Date(value.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/, '$1T$2'));
  }
  return new Date(value as number);
}

// Field names from the ECMA-262 Date Time String Format (case-sensitive: MM = month, mm = minutes), plus MMM/MMMM for
// the month name and `[text]` for literal text. Longer tokens come first so that 'sss' is not read as 'ss' + 's'
// and 'MMMM' as 'MM' + 'MM'.
const DATE_TOKEN_PATTERN = /\[([^\][]*)\]|YYYY|sss|MMMM|MMM|MM|DD|HH|mm|ss/g;

/** Where the wall-clock parts of an instant are read: the browser's zone (default), `'utc'`, or an IANA name such as `'America/Bogota'`. */
export type InanduTimeZone = 'local' | 'utc' | (string & {});

export interface DateFormatOptions {
  /** Locale for `MMM`/`MMMM`. */
  locale?: string;
  /** Zone the date is shown in; an unknown name falls back to the browser's zone. */
  timeZone?: string;
}

export interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  ms: number;
}

const zoneFormatters = new Map<string, Intl.DateTimeFormat | null>();

function zoneFormatter(timeZone: string): Intl.DateTimeFormat | null {
  let formatter = zoneFormatters.get(timeZone);
  if (formatter === undefined) {
    try {
      formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      });
    } catch {
      formatter = null; // RangeError: not a time zone
    }
    zoneFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** The year, month, day and time of `date` as a wall clock in `timeZone` (`'local'`/empty = the browser's). */
export function zonedDateParts(date: Date, timeZone?: string): DateParts {
  const zone = timeZone?.trim();
  if (zone && zone.toLowerCase() === 'utc') {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
      ms: date.getUTCMilliseconds(),
    };
  }
  const formatter = zone && zone.toLowerCase() !== 'local' ? zoneFormatter(zone) : null;
  if (formatter) {
    const parts = formatter.formatToParts(date);
    const pick = (type: string) => Number(parts.find(p => p.type === type)?.value);
    return {
      year: pick('year'),
      month: pick('month'),
      day: pick('day'),
      hour: pick('hour') % 24,
      minute: pick('minute'),
      second: pick('second'),
      ms: date.getUTCMilliseconds(),
    };
  }
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
    ms: date.getMilliseconds(),
  };
}

function monthName(month: number, style: 'short' | 'long', locale: string | undefined): string {
  try {
    return new Intl.DateTimeFormat(locale || undefined, { month: style, timeZone: 'UTC' }).format(new Date(Date.UTC(2000, month - 1, 1)));
  } catch {
    return String(month).padStart(2, '0');
  }
}

export function formatDateValue(date: Date, format: string, options: DateFormatOptions = {}): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  const parts = zonedDateParts(date, options.timeZone);
  return format.replace(DATE_TOKEN_PATTERN, (token, literal?: string) => {
    if (token.startsWith('[')) return literal ?? '';
    switch (token) {
      case 'YYYY': return pad(parts.year, 4);
      case 'MMMM': return monthName(parts.month, 'long', options.locale);
      case 'MMM': return monthName(parts.month, 'short', options.locale);
      case 'MM': return pad(parts.month);
      case 'DD': return pad(parts.day);
      case 'HH': return pad(parts.hour);
      case 'mm': return pad(parts.minute);
      case 'ss': return pad(parts.second);
      case 'sss': return pad(parts.ms, 3);
      default: return token;
    }
  });
}

export function formatCellValue(
  value: unknown,
  type: InanduColumnType,
  format: string,
  locale: string,
  numberFormatter: NumberFormatter = defaultNumberFormatter,
  timeZone?: string,
): string {
  if (value === null || value === undefined) {
    return '';
  }
  switch (type) {
    case 'number': {
      // A blank is not a zero and a boolean is not a one: `Number('')` and `Number(true)` would show them as such.
      if (typeof value === 'boolean' || (typeof value === 'string' && value.trim() === '')) {
        return String(value).trim();
      }
      const num = typeof value === 'number' ? value : Number(value);
      return Number.isNaN(num) ? String(value) : numberFormatter(num, locale, format || undefined);
    }
    case 'date': {
      const date = coerceToDate(value);
      return Number.isNaN(date.getTime()) ? String(value) : formatDateValue(date, format || 'YYYY-MM-DD', { locale, timeZone });
    }
    case 'boolean': {
      // `format` is "truthy|falsy". A format without a `|` ("Yes") labels only the truthy side; the falsy side is empty.
      const [truthyLabel, falsyLabel = ''] = (format || 'true|false').split('|');
      return value ? truthyLabel : falsyLabel;
    }
    default:
      return String(value);
  }
}
