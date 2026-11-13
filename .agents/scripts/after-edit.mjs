#!/usr/bin/env node
// PostToolUse hook: runs after an agent edits or writes a file, so two manual steps cannot be forgotten.
// - Formats the file with Prettier (the same config and ignore file as `npm run lint:format`).
// - Regenerates `.claude/skills/` when the file is a canonical skill under `.agents/skills/`.
// Never blocks the edit. A file Prettier cannot parse, or a skill the generator rejects, is reported
// on stderr with exit 2, which Claude Code feeds back into the turn.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const PRETTIER = 'node_modules/prettier/bin/prettier.cjs';
const SKILLS_SYNC = 'scripts/sync-agent-skills.mjs';
const CANONICAL_SKILL = /^\.agents\/skills\/[^/]+\/SKILL\.md$/;

let input = {};
try {
  if (!process.stdin.isTTY) {
    const raw = readFileSync(0, 'utf8').trim();
    if (raw) input = JSON.parse(raw);
  }
} catch {
  input = {};
}

const isClaude = Boolean(input.hook_event_name);

function finish(context) {
  if (isClaude && context) {
    process.stdout.write(
      JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: context } }) + '\n',
    );
  } else if (!isClaude) {
    process.stdout.write('{}\n');
  }
  process.exit(0);
}

function fail(report) {
  process.stderr.write(report);
  process.exit(2);
}

function read(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

// The checkout the session works in: the main one or a worktree.
let root = resolve(input.cwd ?? input.workspacePaths?.[0] ?? process.cwd());
while (!existsSync(join(root, SKILLS_SYNC))) {
  if (dirname(root) === root) finish();
  root = dirname(root);
}

const file =
  input.tool_input?.file_path ??
  input.toolCall?.args?.Path ??
  input.toolCall?.args?.path ??
  input.toolCall?.args?.filePath ??
  input.toolCall?.args?.file_path;
if (!file) finish();

const absolute = resolve(root, file);
const rel = relative(root, absolute).replaceAll('\\', '/');
// Outside this checkout (a scratchpad, another worktree): not this project's to format.
if (rel.startsWith('..') || /^[A-Za-z]:/.test(rel) || !existsSync(absolute)) finish();

const notes = [];

// A worktree without its own `npm ci` has no Prettier; `npm run lint` still checks the format later.
if (existsSync(join(root, PRETTIER))) {
  const before = read(absolute);
  const prettier = spawnSync(process.execPath, [PRETTIER, '--write', '--ignore-unknown', '--log-level', 'warn', rel], {
    cwd: root,
    encoding: 'utf8',
  });
  if (prettier.status !== 0) {
    fail(`Prettier could not format ${rel}:\n${prettier.stdout}${prettier.stderr}\n`);
  }
  if (before !== null && read(absolute) !== before) {
    notes.push(`Prettier reformatted ${rel}; read it again before editing it further.`);
  }
}

if (CANONICAL_SKILL.test(rel)) {
  const sync = spawnSync(process.execPath, [SKILLS_SYNC], { cwd: root, encoding: 'utf8' });
  if (sync.status !== 0) {
    fail(`npm run skills:sync failed after editing ${rel}:\n${sync.stdout}${sync.stderr}\n`);
  }
  notes.push(`Regenerated .claude/skills/ from ${rel}; include the generated copy in the same commit.`);
}

finish(notes.join(' '));
