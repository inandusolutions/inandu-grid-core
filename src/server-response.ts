import type { InanduGridRow } from './types';

/**
 * Checks a server reply and returns its rows and total. `data` must be an array, and `total`, when present, a finite number of
 * 0 or more; a missing `total` (or `null`) is taken to be the number of rows received. Anything else throws an error that says what
 * was wrong, so that a reply of the wrong shape shows up as an error instead of quietly as an empty grid.
 *
 * Meant for the grids' server-side data layers, which call it on the parsed JSON body (after their own `mapResponse`, when the
 * backend answers with another shape).
 */
export function parseServerResponse(body: unknown): { data: InanduGridRow[]; total: number } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    const got = Array.isArray(body) ? 'an array' : body === null ? 'null' : typeof body;
    throw new Error(`Unexpected server response: expected an object like { data, total }, got ${got}.`);
  }
  const { data, total } = body as { data?: unknown; total?: unknown };
  if (!Array.isArray(data)) {
    throw new Error(`Unexpected server response: expected \`data\` to be an array, got ${data === undefined ? 'nothing' : typeof data}.`);
  }
  if (total === undefined || total === null) return { data: data as InanduGridRow[], total: data.length };
  if (typeof total !== 'number' || !Number.isFinite(total) || total < 0) {
    throw new Error(`Unexpected server response: expected \`total\` to be a number of 0 or more, got ${JSON.stringify(total)}.`);
  }
  return { data: data as InanduGridRow[], total };
}
