// Characters XML 1.0 forbids: C0 controls except tab, line feed and carriage return, and U+FFFE / U+FFFF. One of them in a
// cell makes Excel reject the whole .xls file.
// eslint-disable-next-line no-control-regex
const XML_FORBIDDEN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

/** Escapes `&`/`</>` for safe use as XML/HTML element text content, and drops characters XML cannot carry — shared by `exportExcel()` and `printTable()`. */
export function escapeMarkup(value: string): string {
  return value.replace(XML_FORBIDDEN, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
