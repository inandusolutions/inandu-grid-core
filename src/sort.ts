function isEmptyForSort(value: unknown): boolean {
  return value == null || (value instanceof Date && Number.isNaN(value.getTime())) || (typeof value === 'number' && Number.isNaN(value));
}

export function compareCellValues(a: unknown, b: unknown, locale?: string): number {
  // An invalid Date or a NaN has no position: it sorts with the empty values (first), never as a NaN comparison result.
  const aEmpty = isEmptyForSort(a);
  const bEmpty = isEmptyForSort(b);
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return -1;
  if (bEmpty) return 1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  // String comparison follows the grid's LOCALE_ID (so e.g. accented letters sort where that
  // locale expects), matching how formatCellValue() already respects it.
  return String(a).localeCompare(String(b), locale || undefined);
}
