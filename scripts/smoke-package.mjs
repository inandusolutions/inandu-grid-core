#!/usr/bin/env node
// Release smoke test: installs the *packed tarball* (what `npm publish` would upload, not the source tree) into an empty
// project and checks that a consumer can use it:
//   1. `npm install` resolves it with no peers at all (grid-core has no runtime dependencies).
//   2. A TypeScript file using the helpers compiles under strict settings, once with the usual `skipLibCheck: true` and once with
//      `skipLibCheck: false`, the way a strict consumer sees the published declarations.
//   3. The ESM entry (import) and the CJS entry (require) both load in Node and the helpers return what they should.
// Run after `npm run build`:  npm run smoke:package
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAME = '@inandu-solutions/grid-core';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!existsSync(join(root, 'dist/index.d.ts'))) {
  console.error('error: dist/ not found, run `npm run build` first.');
  process.exit(2);
}

const version = (name) => JSON.parse(readFileSync(join(root, 'node_modules', name, 'package.json'), 'utf8')).version;
const work = mkdtempSync(join(tmpdir(), 'grid-core-smoke-'));
const npmCli = process.env.npm_execpath;
const run = (cmd, args, cwd, shell = false) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], shell });
// Through npm scripts npm_execpath is set and npm's own CLI is called with node; run directly, npm.cmd needs a shell on Windows.
const npm = (args, cwd) => (npmCli ? run(process.execPath, [npmCli, ...args], cwd) : run('npm', args, cwd, process.platform === 'win32'));

try {
  // pack the built package, exactly as published
  const packDir = join(work, 'pack');
  mkdirSync(packDir);
  const packName = JSON.parse(npm(['pack', '--pack-destination', packDir, '--json'], root))[0].filename;
  const tarball = join(packDir, packName);
  console.log(`packed ${packName}`);

  // empty consumer project with TypeScript at the version this repo develops against
  const app = join(work, 'consumer');
  mkdirSync(join(app, 'src'), { recursive: true });
  writeFileSync(
    join(app, 'package.json'),
    JSON.stringify(
      { name: 'grid-core-smoke-consumer', private: true, type: 'module', dependencies: { [NAME]: `file:${tarball.replaceAll('\\', '/')}` }, devDependencies: { typescript: version('typescript') } },
      null,
      2,
    ),
  );
  const tsconfig = (skipLibCheck) =>
    JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ES2022', moduleResolution: 'bundler', strict: true, noEmit: true, skipLibCheck, lib: ['ES2022', 'dom'] }, files: ['src/main.ts'] }, null, 2);
  writeFileSync(join(app, 'tsconfig.json'), tsconfig(true));
  writeFileSync(join(app, 'tsconfig.strict.json'), tsconfig(false));
  writeFileSync(
    join(app, 'src/main.ts'),
    `import { compareCellValues, formatCellValue, type InanduColumnType, type InanduGridRow } from '${NAME}';

const rows: InanduGridRow[] = [{ units: 2 }, { units: 1 }];
const type: InanduColumnType = 'number';

export const sorted: InanduGridRow[] = rows.slice().sort((a, b) => compareCellValues(a['units'], b['units']));
export const text: string = formatCellValue(1234.5, type, '', 'en');
`,
  );

  console.log('npm install (consumer)...');
  npm(['install', '--no-audit', '--no-fund', '--ignore-scripts', '--loglevel=error'], app);

  const tsc = (project) => run(process.execPath, [join(app, 'node_modules/typescript/bin/tsc'), '-p', project], app);
  console.log('tsc (strict, skipLibCheck on)...');
  tsc('tsconfig.json');

  // Until the declarations stop importing the types of jspdf (see the pull request that removes that import), a strict consumer needs it installed.
  console.log('tsc (strict, skipLibCheck off, jspdf installed)...');
  npm(['install', '--no-save', '--no-audit', '--no-fund', '--ignore-scripts', '--loglevel=error', 'jspdf@^4.2.1'], app);
  tsc('tsconfig.strict.json');

  console.log('node import + require...');
  const body = (load) => `${load}; if (m.compareCellValues(1, 2) >= 0) throw new Error('compareCellValues(1, 2) should be negative'); if (typeof m.formatCellValue(1234.5, 'number', '', 'en') !== 'string') throw new Error('formatCellValue should return a string'); console.log('exports: ' + Object.keys(m).length);`;
  process.stdout.write(run(process.execPath, ['--input-type=module', '-e', body(`const m = await import('${NAME}')`)], app));
  process.stdout.write(run(process.execPath, ['--input-type=commonjs', '-e', body(`const m = require('${NAME}')`)], app));

  console.log('smoke test passed');
} finally {
  rmSync(work, { recursive: true, force: true });
}
