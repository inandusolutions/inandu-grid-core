# Changelog

All notable changes to **@inandu-solutions/grid-core** are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - Unreleased

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

[Unreleased]: https://github.com/inandusolutions/inandu-grid-core/commits/main
