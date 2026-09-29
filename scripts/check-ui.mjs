#!/usr/bin/env node
// Design-system guard for src/app. Ratchets against scripts/ui-baseline.json so legacy
// violations don't block work, but no file may get worse. See docs/design_system.md.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src/app');
const BASELINE = join(ROOT, 'scripts/ui-baseline.json');
const update = process.argv.includes('--update-baseline');

const SCSS_RULES = [
  ['raw-hex', /#[0-9a-fA-F]{3,8}\b/g, 'Use var(--mat-sys-*) / var(--pd-sys-*) instead of hex'],
  ['raw-rgb', /\b(rgba?|hsla?)\(/g, 'Use theme tokens instead of rgb()/hsl()'],
  ['var-fallback', /var\(\s*--[\w-]+\s*,/g, 'No fallback inside var()'],
  ['raw-media', /@media\b/g, 'Use @include t.up(...) / t.down(...)'],
  ['raw-radius', /border-radius\s*:\s*[^;]*\d+px/g, 'Use t.radius(...)'],
  ['raw-font-family', /font-family\s*:/g, 'Use Material type roles or t.numeric'],
  ['ng-deep', /::ng-deep/g, 'Use mat.<component>-overrides inside the host selector'],
];

const HTML_RULES = [
  // Only a quoted literal, so template refs such as #fab or #add are not mistaken for colours.
  ['raw-hex', /['"]#[0-9a-fA-F]{3,8}\b/g, 'Use var(--mat-sys-*) / var(--pd-sys-*) instead of hex'],
  ['hand-formatted-money', /\}\}\s*₴/g, 'Use <app-amount>'],
  ['m2-color-attr', /\[color\]=|\scolor="(primary|accent|warn)"/g, 'M3 ignores color=; see docs/design_system.md'],
  ['inline-style', /\sstyle="/g, 'Move styles to the component .scss'],
  ['emoji', /\p{Extended_Pictographic}/gu, 'Use <mat-icon> instead of emoji'],
  ['feature-toolbar', /<mat-toolbar/g, 'Use <app-page-header>; the shell owns navigation'],
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

function stripComments(text, ext) {
  if (ext === '.scss') return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  return text.replace(/<!--[\s\S]*?-->/g, '');
}

const counts = {};
const findings = [];
for (const file of walk(SRC)) {
  const ext = extname(file);
  const rules = ext === '.scss' ? SCSS_RULES : ext === '.html' ? HTML_RULES : null;
  if (!rules) continue;
  const rel = relative(ROOT, file).replaceAll('\\', '/');
  const lines = stripComments(readFileSync(file, 'utf8'), ext).split('\n');
  for (const [id, pattern, hint] of rules) {
    lines.forEach((line, i) => {
      const hits = line.match(pattern);
      if (!hits) return;
      const key = `${rel}::${id}`;
      counts[key] = (counts[key] ?? 0) + hits.length;
      findings.push({ key, where: `${rel}:${i + 1}`, id, hint });
    });
  }
}

const hasBaseline = existsSync(BASELINE);
const baseline = hasBaseline ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};
const regressions = Object.entries(counts).filter(([key, n]) => n > (baseline[key] ?? 0));
const improved = Object.entries(baseline).filter(([key, n]) => (counts[key] ?? 0) < n);

// Once a baseline exists it may only shrink, so an update is refused while anything has regressed.
if (update && (!hasBaseline || !regressions.length)) {
  writeFileSync(BASELINE, JSON.stringify(Object.fromEntries(Object.entries(counts).sort()), null, 2) + '\n');
  console.log(`ui-baseline.json written (${Object.keys(counts).length} entries).`);
  process.exit(0);
}

if (regressions.length) {
  console.error('Design-system check failed:\n');
  for (const [key, n] of regressions) {
    const [file, id] = key.split('::');
    console.error(`  ${file}  [${id}]  ${n} (baseline ${baseline[key] ?? 0})`);
    for (const f of findings.filter(f => f.key === key)) console.error(`    ${f.where}  ${f.hint}`);
  }
  console.error(`\nFix the code. ${update ? 'The baseline was not updated: it may only shrink.' : 'Do not edit scripts/ui-baseline.json to pass.'}`);
  process.exit(1);
}

if (improved.length) {
  console.log(`Design-system check passed. ${improved.length} baseline entr${improved.length === 1 ? 'y' : 'ies'} improved: run \`node scripts/check-ui.mjs --update-baseline\` to lock it in.`);
} else {
  console.log('Design-system check passed.');
}
