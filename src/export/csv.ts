export interface CsvEscapeOptions {
  /**
   * Prefix a cell that a spreadsheet would run as a formula (it starts with `=`, `+`, `-`, `@`, a tab or a carriage
   * return) with a single quote, so `=HYPERLINK(...)` opens as text. Default `true`. A plain number such as `-5` or
   * `+34 600 000` is left alone. Turn it off only when the file is never opened in a spreadsheet.
   */
  neutralizeFormulas?: boolean;
}

// What Excel, Sheets and LibreOffice treat as the start of a formula.
const FORMULA_START = /^[=+\-@\t\r]/;
// A number as a person writes it: sign, digits, spaces, separators, optional exponent. Not a formula.
const PLAIN_NUMBER = /^[+-]?\d[\d\s.,]*(?:[eE][+-]?\d+)?$/;

/** The cell text with a leading quote when a spreadsheet would otherwise execute it. */
export function neutralizeCsvFormula(value: string): string {
  return FORMULA_START.test(value) && !PLAIN_NUMBER.test(value) ? `'${value}` : value;
}

/**
 * Quotes `value` for a CSV cell (doubling internal quotes) only if it contains a comma, quote, or newline, after
 * neutralizing a spreadsheet formula (see `CsvEscapeOptions.neutralizeFormulas`).
 */
export function escapeCsvValue(value: string, options: CsvEscapeOptions = {}): string {
  const text = options.neutralizeFormulas === false ? value : neutralizeCsvFormula(value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}
