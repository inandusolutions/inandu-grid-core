# Changelog

All notable changes to **@inandu-solutions/grid-core** are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

Three pieces of logic that grid-angular, grid-react and grid-vue each wrote on their own, now written once here (additive: nothing existing changes):

- `readSavedGridState(key, parts, storage?)`, `writeSavedGridState(key, state, parts, storage?)` and `clearSavedGridState(key, storage?)`: where and how the state a grid saves under its `stateKey` is kept. `localStorage` by default (any object with `getItem`/`setItem`/`removeItem` fits), a versioned blob, only the chosen parts, and what is read goes through `sanitizeGridState`. None of them throws: with no key, no storage (server rendering), a full or blocked storage, or a corrupt blob, a read gives `{}` and a write or clear does nothing.
- `createDeleteConfirmation()`: the confirmation step of a row or bulk delete. `run({ confirmDelete, message, ask }, rows, proceed)` goes ahead by the app's own answer (`confirmDelete`, sync or a promise), else by asking `message` (`window.confirm` by default), else at once. A rejection or a throw counts as not confirmed (and is logged); a second call while a promise is pending is ignored; without a window nothing is deleted when only a message could ask.
- `parseServerResponse(body)`: checks a server reply for the grids' server-side data layers. `data` must be an array and `total`, when present, a finite number of 0 or more; a missing `total` is the number of rows received. Anything else throws an error that says what was wrong.

## [0.1.5] - 2026-11-19

### Fixed

- `truncatePdfText` no longer cuts a character made of two UTF-16 units (an emoji, for one) in half. The search counted code units, so the
  cut could land between the halves and leave a lone surrogate in the cell text, which a PDF shows as a replacement mark or a gap. The cut
  now backs off to the character boundary.

## [0.1.4] - 2026-11-19

### Fixed

- The published declarations no longer import from `jspdf`. `truncatePdfText` now takes a `PdfTextMeasurer` (anything with
  `getTextWidth(text): number`, which a `jsPDF` instance satisfies), so a consumer with `skipLibCheck: false` that has not installed
  `jspdf` no longer gets `TS2307` from `dist/export/pdf.d.ts`.

### Changed

- `jspdf` is no longer a peer (or dev) dependency of this package: nothing here uses it any more. The grids keep their own optional
  `jspdf` peer for PDF export. `PdfTextMeasurer` is exported as a type.

### Added

- `npm run check:dts` (CI step): fails when a built `.d.ts` imports a package that is not a dependency or peer of this one.
- Release checks in CI, with no effect on the published code: `npm run api:check` (the exported API against the committed `api/public-api.txt`),
  `npm run check:package` (no imports, size budgets, tarball contents) and `npm run smoke:package` (installs the packed tarball in an empty
  project and compiles a consumer).

## [0.1.3] - 2026-11-05

### Fixed

- `defaultNumberFormatter` no longer throws a `RangeError` for a locale that is not well formed (`en_US`, a typo): it falls back to the
  runtime default locale, so a wrong `locale` prop cannot take a grid down.

### Changed

- **`jspdf` is an optional peer dependency** instead of a dependency (`peerDependenciesMeta.jspdf.optional`). Only the type of
  `truncatePdfText` uses it, so nothing in this package needs it installed. A grid that never exports PDF no longer pulls
  `jspdf` (and its `core-js` postinstall script) into the project; the grids ask for it only when their PDF export is used.

### Added

- `sanitizeGridState(value, parts?)`, `GRID_STATE_VERSION`, `ALL_GRID_STATE_PARTS`: reads a saved grid state (widths, order,
  hidden columns, pins, sort, filters) from whatever `JSON.parse` returned and keeps only what has the right shape, types
  and limits, so a stale, hand-edited or hostile blob in storage cannot reach the grid. `parts` limits it to what the grid
  persists.

- `buildPrintHtml(title, headers, rows)` and `printHtmlDocument(html)`: the print page of a table, with every text escaped,
  opened through a `Blob` URL with `noopener` instead of `document.write` into a same-origin window (the page has no
  `window.opener` and shares nothing with the app). The grids use them for `printTable`.

## [0.1.2] - 2026-11-04

Everything is additive: a caller that passes nothing new gets the same results as before, except where a result was wrong.

### Fixed

- **Pasting is strict.** `parsePastedCellValue` / `parsePastedCell` no longer read `Infinity` as a value (it used to clear the
  cell), `0x10` as 16, or a blank as `0`; a boolean that is not in the dictionary is skipped instead of becoming `false`
  (`'1'`, `'yes'`, `'sí'` now read as `true`).
- A numeric column shows an empty or blank cell as empty and a boolean as itself, not `0` / `1`; such cells no longer match a
  numeric range.
- A filter bound of `0` (`min`, `max`, `from`, `to`) is a bound. `hasMeaningfulFilterValue` counts `0` as entered.
- `formatDateValue`: `YYYY` pads years under 1000 to four digits.

### Added

- `InanduPasteOptions` (`locale`, `booleanLabels`) as the third argument of `parsePastedCell` / `parsePastedCellValue`. With a
  locale, `1.234,56` reads in `es` and `1,234.56` in `en`, and `05/01/2024` reads as 5 January in `es` and 1 May in
  `en-US`; without one a numeric non-ISO date is refused as ambiguous. New helpers `parseLocaleNumber`, `parsePastedDate`,
  `parsePastedBoolean`.
- `compareCellValues(a, b, { locale, type })`: with the column type, text that stands for a number or a date is compared as
  one (`'9'` before `'10'`). The old `compareCellValues(a, b, locale)` form still works. Text is compared with a cached
  `Intl.Collator`.
- **`timeZone`** (`'local'` default, `'utc'`, or an IANA name) on `ColumnConfig` (optional `timeZone()`), on
  `formatDateValue(date, format, { locale, timeZone })` and as the last argument of `formatCellValue`. A column filter on a
  date compares the calendar day the column shows. `zonedDateParts` is exported.
- `formatDateValue` tokens `MMM` / `MMMM` (month name through `Intl`, in the locale) and `[text]` for literal text, so
  `DD [de] MMMM [de] YYYY` gives `05 de enero de 2024` instead of `05 de 0101 de 2024`.
- `invalidFilterBounds(column, filterValue)`: the `min`/`max`/`from`/`to` keys that are not a number or a date. They are
  still ignored when filtering (as the server does); this lets a grid say so.

## [0.1.1] - 2026-11-04

### Documentation

- An architecture figure (`docs/architecture.svg`) in the README and on the Pages site: one core under the Angular,
  React and Vue grids, and the contract shared with Inandu.Grid.Extensions.

## [0.1.0] - 2026-11-04

First release. The code is the `core/` that `@inandu-solutions/grid-angular`, `grid-react` and `grid-vue` each
carried a copy of, now in one package, with these fixes applied on the way in.

### Fixed

- A bare `yyyy-mm-dd` is read as a local calendar date. `new Date('2024-01-05')` is UTC midnight, which west of UTC is
  the previous evening in local time, while the filter and the formatter work in local time: in UTC-5 a date range
  filter with a `to` of Jan 5 excluded every Jan 5 row, and a cell holding `2024-01-05` was shown as Jan 4.
- `escapeCsvValue` neutralizes spreadsheet formulas: a cell starting with `=`, `+`, `-`, `@`, a tab or a carriage
  return is prefixed with a single quote (plain numbers are left alone), so `=HYPERLINK(...)` is not executed when the
  CSV is opened. Pass `{ neutralizeFormulas: false }` to opt out.
- `downloadBlob` attaches the link while it is clicked and revokes the object URL one second later; revoking it
  synchronously cancelled the download in some browsers.
- `escapeMarkup` drops the characters XML 1.0 cannot carry (C0 controls except tab, LF and CR, U+FFFE, U+FFFF); one of
  them made Excel reject the whole `.xls` file.
- `truncatePdfText` finds the cut with a binary search instead of re-measuring after each removed character.
- A boolean format without a `|` (`"Yes"`) no longer renders `undefined` for the falsy side; it renders empty.
- `defaultNumberFormatter` clamps a `digitsInfo` that `Intl` would reject (min greater than max, counts past the limits)
  instead of throwing a `RangeError`.
- `compareCellValues` sorts an invalid `Date` or `NaN` with the empty values instead of returning `NaN`.
- `flattenTree` and `collectTreeRows` terminate on cyclic data.

### Added

- `parsePastedCell(raw, type)`: the pasted cell ready to apply, or `undefined` when it should be skipped (a blank or
  invalid number or date), so a paste does not clear a cell.
- `neutralizeCsvFormula` and the `CsvEscapeOptions` type.

[Unreleased]: https://github.com/inandusolutions/inandu-grid-core/compare/v0.1.4...HEAD
[0.1.4]: https://github.com/inandusolutions/inandu-grid-core/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/inandusolutions/inandu-grid-core/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/inandusolutions/inandu-grid-core/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/inandusolutions/inandu-grid-core/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/inandusolutions/inandu-grid-core/releases/tag/v0.1.0
