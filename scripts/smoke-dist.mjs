// Runs the differential corpus against the BUILT package (dist), the way a consumer loads it. Used on Node 20, where the test
// runner (vitest 5, Node >= 22.12) cannot run but the library, and the build, are supported.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const esm = await import('../dist/inandu-grid-core.js');
const cjs = createRequire(import.meta.url)('../dist/inandu-grid-core.cjs');
assert.deepEqual(Object.keys(esm).sort(), Object.keys(cjs).sort(), 'ESM and CJS builds export the same names');

const { compareCellValues, formatCellValue, hasMeaningfulFilterValue, matchesColumnFilter } = esm;
const corpus = JSON.parse(readFileSync(new URL('../contract/diff-corpus.json', import.meta.url), 'utf8'));
const cols = Object.fromEntries(
  Object.entries(corpus.columns).map(([f, type]) => [f, { field: () => f, type: () => type, format: () => '', order: () => undefined, aggregate: () => '' }]),
);

let failed = 0;
for (const c of corpus.cases) {
  const query = (c.client.query ?? '').trim().toLowerCase();
  let rows = corpus.rows;
  if (query) rows = rows.filter(r => Object.values(cols).some(col => formatCellValue(r[col.field()], col.type(), '', 'en').toLowerCase().includes(query)));
  const active = Object.entries(c.client.filters ?? {}).filter(([, v]) => hasMeaningfulFilterValue(v));
  rows = rows.filter(r => active.every(([f, v]) => matchesColumnFilter(cols[f], r, v, 'en')));
  const sort = c.client.sort ?? [];
  const ids = [...rows]
    .sort((a, b) => {
      for (const [f, d] of sort) {
        const cmp = compareCellValues(a[f], b[f], { locale: 'en', type: corpus.columns[f] }) * (d === 'asc' ? 1 : -1);
        if (cmp !== 0) return cmp;
      }
      return 0;
    })
    .map(r => r.id);
  try {
    assert.deepEqual(ids, c.expectedIds);
  } catch {
    failed++;
    console.error(`FAIL ${c.name}: got ${JSON.stringify(ids)}, expected ${JSON.stringify(c.expectedIds)}`);
  }
}
if (failed) process.exit(1);
console.log(`dist smoke: ${corpus.cases.length} corpus cases pass on Node ${process.versions.node}`);
