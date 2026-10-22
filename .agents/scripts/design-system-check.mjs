#!/usr/bin/env node
// Lifecycle hook for Claude Code (.claude/settings.json) and Antigravity (.agents/hooks.json).
// - On PostToolUse: checks the edited file (under src/app, .html/.scss/.ts, non-spec).
// - On Stop: checks the whole UI ratchet before ending the turn.
// - Claude: exits 2 with stderr to feed report back into the turn.
// - Antigravity: outputs { decision: "continue", reason: ... } on Stop to keep turn open, or {} on PostToolUse.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

let input = {};
try {
  if (!process.stdin.isTTY) {
    const raw = readFileSync(0, 'utf8').trim();
    if (raw) input = JSON.parse(raw);
  }
} catch {
  input = {};
}

// Find repository root (supports worktrees and running from subdirectories)
let root = resolve(input.cwd ?? input.workspacePaths?.[0] ?? process.cwd());
while (!existsSync(join(root, 'scripts/check-ui.mjs'))) {
  if (dirname(root) === root) process.exit(0);
  root = dirname(root);
}

const isClaude = Boolean(input.hook_event_name);
const isPostToolUse = input.hook_event_name === 'PostToolUse' || Boolean(input.toolCall);
const isStop = input.hook_event_name === 'Stop' || Boolean(input.terminationReason);

const files = [];
if (isPostToolUse) {
  const file =
    input.tool_input?.file_path ??
    input.toolCall?.args?.Path ??
    input.toolCall?.args?.path ??
    input.toolCall?.args?.filePath ??
    input.toolCall?.args?.file_path;

  const rel = file ? relative(root, resolve(root, file)).replaceAll('\\', '/') : '';
  if (!/^src\/app\/.+\.(html|scss|ts)$/.test(rel) || rel.endsWith('.spec.ts')) {
    if (!isClaude) process.stdout.write('{}\n');
    process.exit(0);
  }
  files.push(rel);
} else if (input.hook_event_name === 'Stop' && input.stop_hook_active) {
  // Claude is already continuing because of this hook; let it stop rather than loop.
  process.exit(0);
} else if (isStop && input.executionNum && input.executionNum > 3) {
  // Prevent infinite continuation loops in Antigravity
  if (!isClaude) process.stdout.write('{}\n');
  process.exit(0);
}

const result = spawnSync(process.execPath, ['scripts/check-ui.mjs', ...files], { cwd: root, encoding: 'utf8' });

if (result.status === 0) {
  if (!isClaude) process.stdout.write('{}\n');
  process.exit(0);
}

// Failure handling
const report = `${result.stdout}${result.stderr}\nFollow .agents/skills/pocketdiscipline-ui/SKILL.md and docs/design_system.md.\n`;

if (isClaude) {
  process.stderr.write(report);
  process.exit(2);
} else if (isStop) {
  process.stdout.write(
    JSON.stringify({
      decision: 'continue',
      reason: report,
    }) + '\n',
  );
  process.exit(0);
} else {
  // Antigravity PostToolUse: log report to stderr and exit 2
  process.stderr.write(report);
  process.exit(2);
}
