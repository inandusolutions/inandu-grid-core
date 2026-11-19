#!/usr/bin/env node
// The published declarations must stand on their own: no import of a package this one does not depend on.
// grid-core has no runtime dependencies and no peers, so any `from '<package>'` in dist/**/*.d.ts is a leak: a consumer with
// `skipLibCheck: false` would get TS2307 (this is how `jspdf` types once escaped through `truncatePdfText`).
// Run after `npm run build`.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
if (!existsSync(dist)) {
  console.error(`error: ${dist} not found, run \`npm run build\` first.`);
  process.exit(2);
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const allowed = new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {})]);

function* declarationFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* declarationFiles(path);
    else if (entry.name.endsWith('.d.ts')) yield path;
  }
}

const packageName = (specifier) => (specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0]);
const importPattern = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/g;
const problems = [];
let files = 0;
for (const file of declarationFiles(dist)) {
  files += 1;
  // Comments are prose (a JSDoc line can say `from "x"`): only code counts.
  const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const [, specifier] of text.matchAll(importPattern)) {
    if (specifier.startsWith('.') || specifier.startsWith('node:')) continue;
    if (!allowed.has(packageName(specifier))) problems.push(`${file.replace(`${root}${'\\'}`, '').replace(`${root}/`, '')}: imports "${specifier}"`);
  }
}

if (problems.length) {
  problems.forEach((p) => console.error(`error: ${p}, which is not a dependency or peer of ${pkg.name}`));
  process.exit(1);
}
console.log(`declarations are self-contained (${files} .d.ts files, no foreign imports)`);
