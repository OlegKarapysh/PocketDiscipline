import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = join(root, '.agents/skills');
const targetRoot = join(root, '.claude/skills');
const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--check')) {
  throw new Error('Usage: node scripts/sync-agent-skills.mjs [--check]');
}
const check = args.includes('--check');
const names = readdirSync(sourceRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const differences = [];
let updated = 0;
const argumentHints = {
  'speckit-analyze': 'Optional focus areas for analysis',
  'speckit-checklist': 'Domain or focus area for the checklist',
  'speckit-clarify': 'Optional areas to clarify in the spec',
  'speckit-constitution': 'Principles or values for the project constitution',
  'speckit-implement': 'Optional implementation guidance or task filter',
  'speckit-plan': 'Optional guidance for the planning phase',
  'speckit-specify': 'Describe the feature you want to specify',
  'speckit-tasks': 'Optional task generation constraints',
  'speckit-taskstoissues': 'Optional filter or label for GitHub issues',
};

for (const name of names) {
  const sourcePath = join(sourceRoot, name, 'SKILL.md');
  const source = readFileSync(sourcePath, 'utf8').replaceAll('\r\n', '\n');
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(source);
  if (!match || !/^name: /m.test(match[1]) || !/^description: /m.test(match[1])) {
    throw new Error(`Missing skill frontmatter: ${sourcePath}`);
  }
  const frontmatter = match[1];
  const adapterFields = [
    ...(!/^argument-hint:/m.test(frontmatter) && argumentHints[name]
      ? [`argument-hint: ${JSON.stringify(argumentHints[name])}`]
      : []),
    ...(!/^user-invocable:/m.test(frontmatter) ? ['user-invocable: true'] : []),
    ...(!/^disable-model-invocation:/m.test(frontmatter) ? ['disable-model-invocation: false'] : []),
  ];
  const body = source.slice(match[0].length);
  const notice = `<!-- Generated from .agents/skills/${name}/SKILL.md by npm run skills:sync. Do not edit here. -->`;
  const expected = `---\n${[frontmatter, ...adapterFields].join('\n')}\n---\n\n${notice}\n${body}`;
  const targetPath = join(targetRoot, name, 'SKILL.md');
  const actual = existsSync(targetPath) ? readFileSync(targetPath, 'utf8').replaceAll('\r\n', '\n') : null;
  if (actual === expected) continue;
  if (check) {
    differences.push(`Missing or outdated: .claude/skills/${name}/SKILL.md`);
  } else {
    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, expected);
    updated++;
  }
}

if (existsSync(targetRoot)) {
  for (const entry of readdirSync(targetRoot, { withFileTypes: true })) {
    if (entry.isDirectory() && !names.includes(entry.name)) {
      differences.push(
        `Unexpected Claude skill: .claude/skills/${entry.name}; move its source to .agents/skills or remove it.`,
      );
    }
  }
}

if (differences.length) {
  console.error(differences.join('\n'));
  console.error('Edit canonical skills in .agents/skills, then run npm run skills:sync.');
  process.exitCode = 1;
} else {
  console.log(
    check
      ? `All ${names.length} Claude skills match their sources.`
      : `Updated ${updated} of ${names.length} Claude skills.`,
  );
}
