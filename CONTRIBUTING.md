# Contributing to inandu-grid-core

## Ground rules

- Search existing [issues](https://github.com/inandusolutions/inandu-grid-core/issues) and
  [discussions](https://github.com/inandusolutions/inandu-grid-core/discussions) before opening a new one.
- Questions and usage help go in Discussions, not issues. See [SUPPORT.md](.github/SUPPORT.md).
- Security issues: **do not** open a public issue. See [SECURITY.md](.github/SECURITY.md).
- Be kind. See the [Code of Conduct](.github/CODE_OF_CONDUCT.md).

## Project layout

| Path | What it is |
| --- | --- |
| `src/` | The library, published to npm as `@inandu-solutions/grid-core`. `*.spec.ts` files sit next to the code they test. |

This package is the single source of the grid core. A fix to filtering, parsing, formatting or the export helpers
belongs here, not in the Angular, React or Vue repositories.

## Commands

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run build       # dist/ (ES + CJS + types)
```

A change that depends on the time zone should be tested with `TZ` set (see `src/timezone.spec.ts`).

## Pull requests

- Add a test for the behaviour you change, and a line under `## [Unreleased]` in `CHANGELOG.md`.
- Keep the package free of framework imports and of anything that needs a DOM, except `downloadBlob`.

## Testing across implementations and environments

**The differential corpus.** The same rows and the same requests are run through every implementation of the grid semantics
(filters, free-text search, multi-column sort, nulls, whole-day dates, set filters): this core, `grid-angular`, `grid-react`,
`grid-vue` (client side) and `Inandu.Grid.Extensions` (an in-memory `ToInanduGrid`, server side). Each must return the same
ids in the same order. The canonical file is `inandu-grid-extensions/tests/Inandu.Grid.Extensions.Tests/Contract/diff-corpus.json`;
this repo and the three grids keep an identical copy, and the `corpus-sync` job compares it with the Extensions copy pinned by
`EXT_REF`.

To add a case: edit `contract/diff-corpus.src.json` (each case has a `client` form and a `server` query string), run
`WRITE_CORPUS=1 npm test -- diff-corpus` to compute `expectedIds`, **read the ids and check them by hand**, then copy
`contract/diff-corpus.json` to the Extensions test project and to the grids. All five test suites must pass before merging.
When one of them disagrees, that is a bug in one of the implementations, not a reason to edit `expectedIds`.

**The CI matrix.** `build-test` is the required check. The `matrix` job runs the suite on Node 24 and, on Node 22,
under machine time zones east and west of UTC (Tokyo, Kolkata, Auckland, Kiritimati, Madrid, Bogota, São Paulo)). The test runner (vitest 5) needs Node >= 22.12, so Node 20 is covered by the `node20` job instead: it builds the package and runs the differential corpus against `dist` (`scripts/smoke-dist.mjs`). Reproduce one
locally with `TZ=Pacific/Auckland npm test`. A runtime with small-icu cannot be reproduced in CI: the code falls back to
numeric months and the runtime default locale when `Intl` rejects a locale (see `src/dst-icu.spec.ts`).
