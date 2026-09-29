#!/usr/bin/env node
// Design-system guard for src/app. Ratchets against scripts/ui-baseline.json so legacy
// violations don't block work, but no file may get worse. See docs/design_system.md#enforcement.
//
//   node scripts/check-ui.mjs [file...]             check src/app; with files, report only those
//   node scripts/check-ui.mjs --update-baseline     lock in improvements; refused while anything regressed,
//     [--accept-new-rule=<id>]                      except for a rule that has no baseline entries yet
//   node scripts/check-ui.mjs --baseline-against=<git-ref>
//                                                   fail if the baseline grew for a rule that existed at <ref>
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname, dirname, resolve } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src/app');
const BASELINE = join(ROOT, 'scripts/ui-baseline.json');
const args = process.argv.slice(2);
const option = (name) => args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const update = args.includes('--update-baseline');
const acceptedNewRules = args.filter((arg) => arg.startsWith('--accept-new-rule=')).map((arg) => arg.slice(18));
const against = option('baseline-against');
const toKeyPath = (path) => relative(ROOT, resolve(ROOT, path)).replaceAll('\\', '/');
const only = new Set(args.filter((arg) => !arg.startsWith('--')).map(toKeyPath));

// [id, pattern, hint, exempt path prefixes]. An exemption is the one wrapper that owns a primitive.
const SCSS_RULES = [
  ['raw-hex', /#[0-9a-fA-F]{3,8}\b/g, 'Use var(--mat-sys-*) / var(--pd-sys-*) instead of hex'],
  ['raw-rgb', /\b(rgba?|hsla?)\(/g, 'Use theme tokens instead of rgb()/hsl()'],
  [
    'raw-named-color',
    /\b(?:color|background|border|outline|fill|stroke|box-shadow)[\w-]*\s*:[^;{]*\b(?:white|black|red|green|blue|gr[ae]y|orange|yellow|purple|pink|silver|gold)\b/g,
    'Use theme tokens instead of named colours',
  ],
  ['var-fallback', /var\(\s*--[\w-]+\s*,/g, 'No fallback inside var()'],
  ['raw-media', /@media\b/g, 'Use @include t.up(...) / t.down(...)'],
  ['raw-radius', /border-radius\s*:\s*[^;]*\d+px/g, 'Use t.radius(...)'],
  [
    'raw-spacing',
    /(?:^|[\s;{])(?:padding|margin|gap|row-gap|column-gap)(?:-[a-z-]+)?\s*:[^;{]*?\b[1-9]\d*(?:\.\d+)?(?:px|rem|em)\b/g,
    'Use t.space(n)',
  ],
  [
    'raw-shadow',
    /box-shadow\s*:(?!\s*(?:none\b|var\(--pd-sys-elevation-\d\)\s*(?:[;}]|$)))/g,
    'Use var(--pd-sys-elevation-1) or var(--pd-sys-elevation-2)',
  ],
  ['raw-font-family', /font-family\s*:/g, 'Use Material type roles or t.numeric'],
  [
    'raw-font-size',
    /(?:^|[\s;{])font(?:-size)?\s*:[^;{]*?\b\d+(?:\.\d+)?(?:px|rem)\b/g,
    'Use a Material type role, t.numeric-size(...) or t.icon-size(...)',
  ],
  [
    'local-token',
    /^\s*(?:\$|--)[\w-]+\s*:/g,
    'Component styles do not define their own tokens; ask, then add it to styles.scss or _tokens.scss',
  ],
  ['ng-deep', /::ng-deep/g, 'Use mat.<component>-overrides inside the host selector'],
];

const HTML_RULES = [
  // Only a quoted literal, so template refs such as #fab or #add are not mistaken for colours.
  ['raw-hex', /['"]#[0-9a-fA-F]{3,8}\b/g, 'Use var(--mat-sys-*) / var(--pd-sys-*) instead of hex'],
  ['hand-formatted-money', /\}\}\s*₴|₴\s*\{\{|\|\s*currency\b/g, 'Use <app-amount>'],
  ['m2-color-attr', /\[color\]=|\scolor="(primary|accent|warn)"/g, 'M3 ignores color=; see docs/design_system.md'],
  ['m2-button', /\bmat-raised-button\b/g, 'Use mat-flat-button or matButton="tonal"'],
  ['inline-style', /\sstyle="/g, 'Move styles to the component .scss'],
  ['emoji', /\p{Extended_Pictographic}/gu, 'Use <mat-icon> instead of emoji'],
  ['feature-toolbar', /<mat-toolbar/g, 'Use <app-page-header>; the shell owns navigation'],
  [
    'raw-toggle-group',
    /<mat-button-toggle-group\b/g,
    'Use <app-segmented-control>',
    ['src/app/shared/components/segmented-control/'],
  ],
  [
    'mascot',
    /icons\/icon-192x192\.png/g,
    'The mascot appears only in app-empty-state and the celebration dialog',
    ['src/app/shared/components/empty-state/', 'src/app/shared/components/celebration-dialog/'],
  ],
];

const TS_RULES = [
  [
    'inline-template',
    /^\s*(?:template|styles)\s*:/g,
    'Use templateUrl / styleUrl, so this check can see the markup and styles',
  ],
  [
    'raw-snackbar',
    /\binject\(\s*MatSnackBar\b/g,
    'Use SnackBarService',
    ['src/app/shared/services/snack-bar.service.ts'],
  ],
  [
    'raw-dialog',
    /\.open\s*(?:<[^>]*>)?\(\s*(?:ConfirmDialog|CelebrationDialog)\b/g,
    'Use ConfirmService.ask() or CelebrationService.show()',
    ['src/app/shared/services/'],
  ],
];

const PAGE_HEADER = ['page-header', 'A routed page renders exactly one <app-page-header>'];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

function rulesFor(file) {
  const ext = extname(file);
  if (ext === '.scss') return SCSS_RULES;
  if (ext === '.html') return HTML_RULES;
  if (ext === '.ts' && !file.endsWith('.spec.ts')) return TS_RULES;
  return null;
}

// Comments are blanked rather than removed, so reported line numbers stay right.
function stripComments(text, ext) {
  const blank = (comment) => comment.replace(/[^\n]/g, '');
  if (ext === '.html') return text.replace(/<!--[\s\S]*?-->/g, blank);
  return text.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// Templates of the components that routes load, found through loadComponent imports and component: references.
function routedTemplates(files) {
  const templates = new Set();
  for (const file of files.filter((path) => path.endsWith('.routes.ts'))) {
    const source = readFileSync(file, 'utf8');
    const modules = [...source.matchAll(/loadComponent:\s*\(\)\s*=>\s*import\(\s*'([^']+)'/g)].map((match) => match[1]);
    for (const [, name] of source.matchAll(/\bcomponent:\s*(\w+)/g)) {
      const from = source.match(new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*'([^']+)'`));
      if (from) modules.push(from[1]);
    }
    for (const module of modules) {
      const component = join(dirname(file), `${module}.ts`);
      const templateUrl =
        existsSync(component) && readFileSync(component, 'utf8').match(/templateUrl:\s*'([^']+)'/)?.[1];
      if (templateUrl) templates.add(join(dirname(component), templateUrl));
    }
  }
  return templates;
}

const fileOf = (key) => key.split('::')[0];
const ruleOf = (key) => key.split('::')[1];
const inScope = (key) => !only.size || only.has(fileOf(key));

const counts = {};
const findings = [];
const files = walk(SRC);
for (const file of files) {
  const rules = rulesFor(file);
  const rel = toKeyPath(file);
  if (!rules || (only.size && !only.has(rel))) continue;
  const lines = stripComments(readFileSync(file, 'utf8'), extname(file)).split('\n');
  for (const [id, pattern, hint, exempt = []] of rules) {
    if (exempt.some((prefix) => rel.startsWith(prefix))) continue;
    lines.forEach((line, i) => {
      const hits = line.match(pattern);
      if (!hits) return;
      const key = `${rel}::${id}`;
      counts[key] = (counts[key] ?? 0) + hits.length;
      findings.push({ key, where: `${rel}:${i + 1}`, hint });
    });
  }
}
for (const template of routedTemplates(files)) {
  const rel = toKeyPath(template);
  const headers = stripComments(readFileSync(template, 'utf8'), '.html').match(/<app-page-header\b/g)?.length ?? 0;
  if (headers === 1) continue;
  const [id, hint] = PAGE_HEADER;
  counts[`${rel}::${id}`] = 1;
  findings.push({ key: `${rel}::${id}`, where: `${rel}:1`, hint: `${hint} (found ${headers})` });
}

const hasBaseline = existsSync(BASELINE);
const baseline = hasBaseline ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};

if (against) {
  const git = (...gitArgs) =>
    execFileSync('git', gitArgs, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  try {
    git('rev-parse', '--verify', '--quiet', `${against}^{commit}`);
  } catch {
    console.error(`Unknown git ref: ${against}`);
    process.exit(1);
  }
  const atRef = (path) => {
    try {
      return git('show', `${against}:${path}`);
    } catch {
      return '';
    }
  };
  const before = JSON.parse(atRef('scripts/ui-baseline.json') || '{}');
  // A rule added since <ref> brings its own legacy entries; every older rule may only shrink.
  const rulesBefore = new Set(
    [...atRef('scripts/check-ui.mjs').matchAll(/\['([a-z][\w-]*)',\s*[/']/g)].map((match) => match[1]),
  );
  const grown = Object.entries(baseline).filter(([key, n]) => rulesBefore.has(ruleOf(key)) && n > (before[key] ?? 0));
  if (grown.length) {
    console.error(`scripts/ui-baseline.json grew against ${against}:\n`);
    for (const [key, n] of grown) console.error(`  ${fileOf(key)}  [${ruleOf(key)}]  ${before[key] ?? 0} -> ${n}`);
    console.error('\nThe baseline may only shrink. Fix the code and regenerate it with --update-baseline.');
    process.exit(1);
  }
  console.log(`ui-baseline.json did not grow against ${against}.`);
  process.exit(0);
}

const regressions = Object.entries(counts).filter(([key, n]) => inScope(key) && n > (baseline[key] ?? 0));
const improved = Object.entries(baseline).filter(([key, n]) => inScope(key) && (counts[key] ?? 0) < n);

// Once a baseline exists it may only shrink, so an update is refused while anything has regressed,
// unless the regression belongs to a rule being introduced (one with no baseline entries yet).
if (update) {
  if (only.size) {
    console.error('--update-baseline needs the whole of src/app; drop the file arguments.');
    process.exit(1);
  }
  const baselinedRules = new Set(Object.keys(baseline).map(ruleOf));
  const blocking = regressions.filter(
    ([key]) => !acceptedNewRules.includes(ruleOf(key)) || baselinedRules.has(ruleOf(key)),
  );
  if (!hasBaseline || !blocking.length) {
    writeFileSync(BASELINE, JSON.stringify(Object.fromEntries(Object.entries(counts).sort()), null, 2) + '\n');
    console.log(`ui-baseline.json written (${Object.keys(counts).length} entries).`);
    process.exit(0);
  }
}

if (regressions.length) {
  console.error('Design-system check failed:\n');
  for (const [key, n] of regressions) {
    console.error(`  ${fileOf(key)}  [${ruleOf(key)}]  ${n} (baseline ${baseline[key] ?? 0})`);
    for (const f of findings.filter((f) => f.key === key)) console.error(`    ${f.where}  ${f.hint}`);
  }
  console.error(
    `\nFix the code. ${update ? 'The baseline was not updated: it may only shrink.' : 'Do not edit scripts/ui-baseline.json to pass.'} Rules: docs/design_system.md#enforcement`,
  );
  process.exit(1);
}

const scope = only.size ? ` for ${only.size} file${only.size === 1 ? '' : 's'}` : '';
if (improved.length) {
  console.log(
    `Design-system check passed${scope}. ${improved.length} baseline entr${improved.length === 1 ? 'y' : 'ies'} improved: run \`node scripts/check-ui.mjs --update-baseline\` to lock it in.`,
  );
} else {
  console.log(`Design-system check passed${scope}.`);
}
