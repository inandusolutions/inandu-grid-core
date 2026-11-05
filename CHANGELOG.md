# Changelog

All notable changes to **@inandu-solutions/grid-core** are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **`jspdf` is an optional peer dependency** instead of a dependency (`peerDependenciesMeta.jspdf.optional`). Only the type of
  `truncatePdfText` uses it, so nothing in this package needs it installed. A grid that never exports PDF no longer pulls
  `jspdf` (and its `core-js` postinstall script) into the project; the grids ask for it only when their PDF export is used.

### Added

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

[Unreleased]: https://github.com/inandusolutions/inandu-grid-core/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/inandusolutions/inandu-grid-core/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/inandusolutions/inandu-grid-core/releases/tag/v0.1.0
