import { escapeMarkup } from './markup';

/**
 * The print-styled HTML page of a table: `headers` as the header cells, each `rows` entry as a body row. Every text is
 * escaped. The page asks the browser to print itself once it has loaded, because a window opened with `noopener` (see
 * `printHtmlDocument`) cannot be driven from the page that opened it.
 */
export function buildPrintHtml(title: string, headers: readonly string[], rows: ReadonlyArray<readonly string[]>): string {
  const headerCells = headers.map(header => `<th>${escapeMarkup(header)}</th>`).join('');
  const bodyRows = rows.map(row => `<tr>${row.map(cell => `<td>${escapeMarkup(cell)}</td>`).join('')}</tr>`).join('');
  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    `<title>${escapeMarkup(title)}</title>` +
    '<style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:4px 8px;text-align:left}th{background:#eee}</style>' +
    `</head><body><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>` +
    // Prints when the page has laid out. Under a strict CSP this script is blocked and the page just opens, ready to print by hand.
    '<script>addEventListener("load",function(){setTimeout(function(){print()},0)})</script>' +
    '</body></html>'
  );
}

/**
 * Opens `html` in a new tab through a `Blob` URL with `noopener`, so the page has no `window.opener` back to the app
 * (writing into `window.open('')` with `document.write` shared the app's origin and handed the page a reference to it).
 * The URL is released after a minute. (`window.open` answers `null` under `noopener`, so a blocked tab cannot be told apart.)
 */
export function printHtmlDocument(html: string): void {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
