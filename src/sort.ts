import { InanduColumnType } from './types';
import { coerceToDate } from './format';

/** Options for `compareCellValues`. */
export interface CompareCellOptions {
  /** BCP 47 locale for comparing text (accented letters sort where that locale expects them). */
  locale?: string;
  /**
   * The column's type. A value that arrives as text (`'10'`, `'2024-01-05'`) is compared as the number or the date it
   * stands for instead of letter by letter, so `'9'` sorts before `'10'`. Without it the values are compared as they are.
   */
  type?: InanduColumnType;
}

function isEmptyForSort(value: unknown): boolean {
  return value == null || (value instanceof Date && Number.isNaN(value.getTime())) || (typeof value === 'number' && Number.isNaN(value));
}

const collators = new Map<string, Intl.Collator>();

function collatorFor(locale: string | undefined): Intl.Collator {
  const key = locale || '';
  let collator = collators.get(key);
  if (!collator) {
    try {
      collator = new Intl.Collator(locale || undefined);
    } catch {
      collator = new Intl.Collator(undefined);
    }
    collators.set(key, collator);
  }
  return collator;
}

/** Brings a value to the representation its column type compares by; a text that is not that type becomes `null` (empty). */
function coerceForType(value: unknown, type: InanduColumnType | undefined): unknown {
  if (type === 'number' && typeof value === 'string') {
    return value.trim() === '' ? null : Number(value);
  }
  if (type === 'date' && (typeof value === 'string' || typeof value === 'number')) {
    return typeof value === 'string' && value.trim() === '' ? null : coerceToDate(value);
  }
  return value;
}

export function compareCellValues(a: unknown, b: unknown, localeOrOptions?: string | CompareCellOptions): number {
  const options: CompareCellOptions = typeof localeOrOptions === 'string' ? { locale: localeOrOptions } : (localeOrOptions ?? {});
  a = coerceForType(a, options.type);
  b = coerceForType(b, options.type);
  // An invalid Date or a NaN has no position: it sorts with the empty values (first), never as a NaN comparison result.
  const aEmpty = isEmptyForSort(a);
  const bEmpty = isEmptyForSort(b);
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return -1;
  if (bEmpty) return 1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  // String comparison follows the grid's LOCALE_ID (so e.g. accented letters sort where that
  // locale expects), matching how formatCellValue() already respects it.
  return collatorFor(options.locale).compare(String(a), String(b));
}
