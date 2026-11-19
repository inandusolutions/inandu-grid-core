#!/usr/bin/env node
// Checks the built package the way `npm publish` would ship it (run after `npm run build`):
//   1. No runtime dependencies, and the bundles import nothing but their own files: grid-core is the framework-free engine
//      behind the Angular, React and Vue grids, so an import of anything else (a framework, rxjs, jspdf) is a leak.
//   2. Size budgets: both bundles and the packed tarball stay under a ceiling, so growth is a decision, not an accident.
//   3. The tarball has what consumers need (package.json, README, LICENSE, both bundles, declarations) and no sources or specs.
//   4. Every target in package.json `exports`/`main`/`module`/`types` exists, and `sideEffects` is false (tree-shaking).
//
// Raise a budget in CONFIG when growth is intended; the number in the diff is the review.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Budgets in KB, about 25% above today's sizes (ESM 25, CJS 21, tarball 25: small numbers, so the margin is wider than in the
 * grids). `allowedPeers` are peers the manifest may declare; none is required and no bundle may import them.
 */
const CONFIG = { name: '@inandu-solutions/grid-core', allowedPeers: ['jspdf'], budgetKB: { esm: 32, cjs: 27, tarball: 32 } };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const fail = (msg) => errors.push(msg);
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const types = pkg.types ?? pkg.typings;
for (const target of [pkg.module, pkg.main, types]) {
  if (!target || !existsSync(join(root, target))) {
    console.error(`error: ${target} not found, run \`npm run build\` first.`);
    process.exit(2);
  }
}
if (pkg.name !== CONFIG.name) fail(`unexpected package name ${pkg.name}`);

// 1. no dependencies, no foreign imports
if (Object.keys(pkg.dependencies ?? {}).length) fail(`grid-core has no dependencies, found ${Object.keys(pkg.dependencies).join(', ')}`);
for (const peer of Object.keys(pkg.peerDependencies ?? {})) {
  if (!CONFIG.allowedPeers.includes(peer)) fail(`unexpected peer dependency ${peer}`);
}
// Only real import sites: `import`/`export ... from "x"` and `import "x"` statements at the start of a line, `import("x")` and `require("x")`.
const importPattern = /(?:^\s*(?:import|export)\b[^;'"`]*?\bfrom\s*|^\s*import\s*|\bimport\s*\(\s*|\brequire\(\s*)["']([^"']+)["']/gm;
for (const [label, rel] of [['ESM', pkg.module], ['CJS', pkg.main]]) {
  const text = readFileSync(join(root, rel), 'utf8');
  const foreign = [...new Set([...text.matchAll(importPattern)].map((m) => m[1]).filter((s) => !s.startsWith('.') && !s.startsWith('node:')))];
  if (foreign.length) fail(`the ${label} bundle imports ${foreign.join(', ')}; grid-core must not import anything`);
}

// 2. size budgets + 3. tarball contents
const npmArgs = ['pack', '--dry-run', '--json'];
const packOutput = process.env.npm_execpath
  ? execFileSync(process.execPath, [process.env.npm_execpath, ...npmArgs], { cwd: root, encoding: 'utf8' })
  : execFileSync('npm', npmArgs, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
const packed = JSON.parse(packOutput)[0];
const sizes = { esm: statSync(join(root, pkg.module)).size, cjs: statSync(join(root, pkg.main)).size, tarball: packed.size };
for (const [what, size] of Object.entries(sizes)) {
  const budget = CONFIG.budgetKB[what] * 1024;
  if (size > budget) fail(`${what} is ${kb(size)}, budget ${kb(budget)}`);
}

const files = packed.files.map((f) => f.path);
const norm = (p) => p.replace(/^\.\//, '');
for (const required of ['package.json', 'README.md', 'LICENSE', norm(pkg.module), norm(pkg.main), norm(types)]) {
  if (!files.includes(required)) fail(`tarball is missing ${required}`);
}
const stray = files.filter((f) => /\.(spec|test)\.|(^|\/)(src|e2e|tests?|node_modules|scripts|api)\//.test(f) || (f.endsWith('.ts') && !f.endsWith('.d.ts')) || f.endsWith('.map'));
if (stray.length) fail(`tarball ships files that are not part of the package: ${stray.join(', ')}`);

// 4. every entry point exists; no side effects
const targets = (value) => (typeof value === 'string' ? [value] : Object.values(value ?? {}).flatMap(targets));
for (const t of [...targets(pkg.exports), pkg.main, pkg.module, types]) {
  if (!existsSync(join(root, t))) fail(`package.json points at ${t}, which does not exist`);
}
if (pkg.sideEffects !== false) fail('package.json sideEffects must be false so unused exports tree-shake');

console.log(`esm ${kb(sizes.esm)} / ${CONFIG.budgetKB.esm} KB, cjs ${kb(sizes.cjs)} / ${CONFIG.budgetKB.cjs} KB, tarball ${kb(sizes.tarball)} / ${CONFIG.budgetKB.tarball} KB, ${files.length} files`);
if (errors.length) {
  errors.forEach((e) => console.error(`error: ${e}`));
  process.exit(1);
}
console.log('package checks passed');
