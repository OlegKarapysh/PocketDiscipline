#!/usr/bin/env node
// Claude Code hook, wired in .claude/settings.json. After an edit under src/app it runs
// scripts/check-ui.mjs on that file; when Claude tries to end its turn it runs the whole check.
// A regression exits 2, which feeds the report back to Claude so it is fixed in the same turn.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8'));

// Claude may be working in a worktree, so find the checkout from cwd rather than from this file.
let root = resolve(input.cwd ?? process.cwd());
while (!existsSync(join(root, 'scripts/check-ui.mjs'))) {
  if (dirname(root) === root) process.exit(0);
  root = dirname(root);
}

const files = [];
if (input.hook_event_name === 'PostToolUse') {
  const file = input.tool_input?.file_path;
  const rel = file ? relative(root, resolve(root, file)).replaceAll('\\', '/') : '';
  if (!/^src\/app\/.+\.(html|scss|ts)$/.test(rel) || rel.endsWith('.spec.ts')) process.exit(0);
  files.push(rel);
} else if (input.hook_event_name === 'Stop' && input.stop_hook_active) {
  // Claude is already continuing because of this hook; let it stop rather than loop.
  process.exit(0);
}

const result = spawnSync(process.execPath, ['scripts/check-ui.mjs', ...files], { cwd: root, encoding: 'utf8' });
if (result.status === 0) process.exit(0);
process.stderr.write(`${result.stdout}${result.stderr}`);
process.stderr.write('\nFollow .agents/skills/pocketdiscipline-ui/SKILL.md and docs/design_system.md.\n');
process.exit(2);
