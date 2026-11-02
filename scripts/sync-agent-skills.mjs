#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = join(root, '.agents/skills');
const targetRoot = join(root, '.claude/skills');
const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--check')) {
  console.error('Usage: node scripts/sync-agent-skills.mjs [--check]');
  process.exit(1);
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

for (const hinted of Object.keys(argumentHints)) {
  if (!names.includes(hinted)) {
    differences.push(`Argument hint for a skill that does not exist: ${hinted}`);
  }
}

// A top-level `key: value` from frontmatter, unquoted; empty when the key is missing or blank.
function frontmatterValue(frontmatter, key) {
  const line = new RegExp(`^${key}:[ \\t]*(.*)$`, 'm').exec(frontmatter);
  return line
    ? line[1]
        .trim()
        .replace(/^(["'])(.*)\1$/, '$2')
        .trim()
    : '';
}

for (const name of names) {
  if (!/^[a-z0-9-]+$/.test(name)) {
    differences.push(`Invalid skill directory name: .agents/skills/${name}`);
    continue;
  }
  const sourcePath = join(sourceRoot, name, 'SKILL.md');
  if (!existsSync(sourcePath)) {
    differences.push(`Missing canonical skill file: .agents/skills/${name}/SKILL.md`);
    continue;
  }
  const source = readFileSync(sourcePath, 'utf8').replaceAll('\r\n', '\n');
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(source);
  if (!match || !frontmatterValue(match[1], 'name') || !frontmatterValue(match[1], 'description')) {
    differences.push(`Missing skill frontmatter: .agents/skills/${name}/SKILL.md`);
    continue;
  }
  const frontmatter = match[1];
  // Every harness must invoke the skill by the same name, and Agent Skills requires it to match the folder.
  if (frontmatterValue(frontmatter, 'name') !== name) {
    differences.push(`Skill name does not match its folder: .agents/skills/${name}/SKILL.md`);
    continue;
  }
  const adapterFields =
    !/^argument-hint:/m.test(frontmatter) && Object.hasOwn(argumentHints, name)
      ? [`argument-hint: ${JSON.stringify(argumentHints[name])}`]
      : [];
  const body = source.slice(match[0].length).replace(/^\n+/, '');
  const notice = `<!-- Generated from .agents/skills/${name}/SKILL.md by npm run skills:sync. Do not edit here. -->`;
  const separator = body.length === 0 ? '\n' : '\n\n';
  const expected = `---\n${[frontmatter, ...adapterFields].join('\n')}\n---\n\n${notice}${separator}${body}`;
  const targetDir = join(targetRoot, name);
  const targetPath = join(targetDir, 'SKILL.md');
  const actual = existsSync(targetPath) ? readFileSync(targetPath, 'utf8') : null;
  if (actual !== expected) {
    if (check) {
      differences.push(`Missing or outdated: .claude/skills/${name}/SKILL.md`);
    } else {
      mkdirSync(targetDir, { recursive: true });
      writeFileSync(targetPath, expected);
      updated++;
    }
  }
  if (existsSync(targetDir)) {
    for (const child of readdirSync(targetDir)) {
      if (child !== 'SKILL.md') {
        differences.push(
          `Unexpected entry in generated skill folder: .claude/skills/${name}/${child}; keep supporting resources in .agents/skills/${name}/`,
        );
      }
    }
  }
}

if (existsSync(targetRoot)) {
  for (const entry of readdirSync(targetRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !names.includes(entry.name)) {
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
