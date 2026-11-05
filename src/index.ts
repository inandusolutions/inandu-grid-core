/*
 * Framework-agnostic core of the Inandu grid: pure logic with no framework dependency, shared by
 * @inandu-solutions/grid-angular, grid-react and grid-vue.
 *
 * Nothing here touches a component, a hook or a template; the grids import from this package and
 * re-export what is part of their own public API.
 */
export type {
  InanduColumnType,
  InanduColumnStickySide,
  InanduColumnAggregate,
  InanduGridRow,
  InanduGridColumnFilterValue,
  ColumnConfig,
} from './types';

export {
  MIN_COLUMN_WIDTH,
  MAX_COLUMN_WIDTH,
  SELECT_COLUMN_WIDTH,
  ROW_DRAG_COLUMN_WIDTH,
  DETAIL_TOGGLE_COLUMN_WIDTH,
  STATE_STORAGE_PREFIX,
} from './constants';

export {
  coerceToDate,
  formatDateValue,
  formatCellValue,
  defaultNumberFormatter,
  zonedDateParts,
} from './format';
export type { NumberFormatter, InanduTimeZone, DateFormatOptions, DateParts } from './format';

export { compareCellValues } from './sort';
export type { CompareCellOptions } from './sort';
export { flattenTree, collectTreeRows } from './tree';
export type { TreeVisibleRow, FlattenTreeOptions } from './tree';
export { hasMeaningfulFilterValue, matchesColumnFilter, invalidFilterBounds } from './filter';
export { AGGREGATE_SYMBOLS, computeGroupAggregates } from './aggregate';
export { placeColumnsByOrder } from './columns';
export {
  parseDraftValue,
  parsePastedCell,
  parsePastedCellValue,
  parseLocaleNumber,
  parsePastedDate,
  parsePastedBoolean,
} from './parse';
export type { InanduPasteOptions } from './parse';
export { escapeAttributeSelectorValue } from './dom';

export { escapeCsvValue, neutralizeCsvFormula } from './export/csv';
export type { CsvEscapeOptions } from './export/csv';
export { escapeMarkup } from './export/markup';
export { buildPrintHtml, printHtmlDocument } from './export/print';
export { truncatePdfText } from './export/pdf';
export { downloadBlob } from './export/download';

export { en, es, fr, it, zh, INANDU_GRID_TRANSLATIONS } from './i18n';
