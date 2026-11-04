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
