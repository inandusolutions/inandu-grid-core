import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compareCellValues, formatCellValue, hasMeaningfulFilterValue, matchesColumnFilter } from './index';
import type { ColumnConfig, InanduColumnType, InanduGridColumnFilterValue, InanduGridRow } from './index';

/**
 * Differential corpus: the same rows and requests are run through every implementation of the grid semantics (this core,
 * the Angular, React and Vue grids, and Inandu.Grid.Extensions on the server). `contract/diff-corpus.json` is a copy of
 * the canonical file in inandu-grid-extensions; `contract/diff-corpus.src.json` is the same without `expectedIds`.
 *
 * To add or change a case: edit the .src.json, run `WRITE_CORPUS=1 npm test -- diff-corpus`, read the ids it computed,
 * and copy the result to inandu-grid-extensions (whose test must agree) and to the other grids.
 */
interface CorpusCase {
  name: string;
  client: { filters?: Record<string, InanduGridColumnFilterValue>; query?: string; sort?: Array<[string, 'asc' | 'desc']> };
  server: string;
  expectedIds?: number[];
}
interface Corpus {
  columns: Record<string, InanduColumnType>;
  rows: InanduGridRow[];
  cases: CorpusCase[];
}

const SRC = 'contract/diff-corpus.src.json';
const OUT = 'contract/diff-corpus.json';

const configs = (columns: Corpus['columns']): Record<string, ColumnConfig> =>
  Object.fromEntries(
    Object.entries(columns).map(([field, type]) => [
      field,
      { field: () => field, type: () => type, format: () => '', order: () => undefined, aggregate: () => '' } satisfies ColumnConfig,
    ]),
  );

/** What a grid does with a request: free-text search, then the column filters, then the multi-column sort. */
function run(corpus: Corpus, c: CorpusCase): number[] {
  const cols = configs(corpus.columns);
  const query = (c.client.query ?? '').trim().toLowerCase();
  let rows = corpus.rows;
  if (query) {
    rows = rows.filter(row => Object.values(cols).some(col => formatCellValue(row[col.field()], col.type(), '', 'en').toLowerCase().includes(query)));
  }
  const active = Object.entries(c.client.filters ?? {}).filter(([, value]) => hasMeaningfulFilterValue(value));
  rows = rows.filter(row => active.every(([field, value]) => matchesColumnFilter(cols[field], row, value, 'en')));
  const sort = c.client.sort ?? [];
  return [...rows]
    .sort((a, b) => {
      for (const [field, direction] of sort) {
        const cmp = compareCellValues(a[field], b[field], { locale: 'en', type: corpus.columns[field] }) * (direction === 'asc' ? 1 : -1);
        if (cmp !== 0) return cmp;
      }
      return 0;
    })
    .map(row => row['id'] as number);
}

const read = (path: string): Corpus => JSON.parse(readFileSync(path, 'utf8')) as Corpus;

describe('differential corpus', () => {
  if (process.env['WRITE_CORPUS']) {
    it('writes the expected ids', () => {
      const corpus = read(SRC);
      const written = { ...JSON.parse(readFileSync(SRC, 'utf8')), cases: corpus.cases.map(c => ({ ...c, expectedIds: run(corpus, c) })) };
      writeFileSync(OUT, JSON.stringify(written, null, 2) + '\n');
      for (const c of written.cases) console.log(c.name.padEnd(60), JSON.stringify(c.expectedIds));
    });
    return;
  }

  const corpus = read(OUT);
  it.each(corpus.cases.map(c => [c.name, c] as const))('%s', (_name, c) => {
    expect(run(corpus, c)).toEqual(c.expectedIds);
  });
});
