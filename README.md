# @inandu-solutions/grid-core

The framework-agnostic core of the Inandu data grid: the sorting, filtering, parsing, formatting,
aggregation, tree-flattening, export helpers and translated messages that
[`@inandu-solutions/grid-angular`](https://github.com/inandusolutions/inandu-grid),
[`@inandu-solutions/grid-react`](https://github.com/inandusolutions/inandu-grid-react) and
[`@inandu-solutions/grid-vue`](https://github.com/inandusolutions/inandu-grid-vue) share.

<p align="center"><img src="docs/architecture.svg" alt="Angular, React and Vue grids on top of one shared core package, which shares its query contract with Inandu.Grid.Extensions on .NET" width="820"></p>

**One core, three interfaces.** A fix to filtering, dates, parsing or export is made once and reaches the three grids
together; the grids keep only their UI layer, and the query contract they speak with the .NET server is checked
against one shared fixture.

Pure TypeScript, no framework, no DOM except in `downloadBlob`. If you use one of the grids above you
already get this package; install it directly only to build your own grid or to reuse the helpers.

```bash
npm install @inandu-solutions/grid-core
```

## What is inside

| Area | Exports |
| --- | --- |
| Types | `InanduColumnType`, `InanduGridRow`, `InanduGridColumnFilterValue`, `ColumnConfig`, ... |
| Formatting | `formatCellValue`, `formatDateValue`, `coerceToDate`, `defaultNumberFormatter` |
| Filtering | `matchesColumnFilter`, `hasMeaningfulFilterValue` |
| Sorting | `compareCellValues` |
| Trees | `flattenTree`, `collectTreeRows` |
| Aggregates | `computeGroupAggregates`, `AGGREGATE_SYMBOLS` |
| Parsing | `parseDraftValue`, `parsePastedCellValue`, `parsePastedCell` |
| Export helpers | `escapeCsvValue`, `neutralizeCsvFormula`, `escapeMarkup`, `truncatePdfText`, `downloadBlob` |
| i18n | `en`, `es`, `fr`, `it`, `zh`, `INANDU_GRID_TRANSLATIONS` |

```ts
import { compareCellValues, escapeCsvValue, formatCellValue, matchesColumnFilter } from '@inandu-solutions/grid-core';

formatCellValue(1234.5, 'number', '1.0-2', 'en-US'); // "1,234.50"
formatCellValue('2024-01-05', 'date', 'YYYY-MM-DD', 'en-US'); // "2024-01-05", in every time zone
escapeCsvValue('=HYPERLINK("http://example.com","x")'); // a quote is prefixed, so a spreadsheet opens it as text
```

## Behaviours worth knowing

- **Dates are calendar dates.** A bare `yyyy-mm-dd` (a `type="date"` value) is local midnight of that day, so it
  formats, filters and compares as that day west and east of UTC alike. A date range filter includes the whole
  of its `to` day.
- **CSV cells are neutralized.** `escapeCsvValue` prefixes a cell that starts with `=`, `+`, `-`, `@`, a tab or a
  carriage return with a single quote, so a spreadsheet does not run it as a formula; plain numbers such as `-5`
  are left alone. Pass `{ neutralizeFormulas: false }` if the file is never opened in a spreadsheet.
- **Excel markup drops what XML cannot carry.** `escapeMarkup` removes C0 control characters (except tab, LF and
  CR), which would otherwise make Excel reject the whole file.
- **PDF export and non-Latin text.** jsPDF's built-in fonts have no CJK glyphs; the grids' PDF export renders
  Chinese, Japanese or Korean text as garbage unless you embed a font that has them.
- **Pasting.** `parsePastedCell` returns `undefined` for text a column cannot hold (a blank or invalid number or
  date), so a paste never clears a cell by accident.
- **Trees tolerate cycles.** `flattenTree` and `collectTreeRows` terminate on data where a node is its own
  descendant.

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # vitest run (jsdom)
npm run build       # dist/ (ES + CJS + types)
```

The date tests change `TZ` themselves; CI also runs the whole suite once in `America/Bogota`.

## License

MIT, Inandu SAS.
