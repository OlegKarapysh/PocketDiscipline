import { createHash } from 'node:crypto';
import { lstatSync } from 'node:fs';
import { join } from 'node:path';

// Both configs reuse a server that is already listening, so two checkouts on one port would test
// whichever started first. A linked worktree (an agent session beside the main checkout) therefore
// gets its own pair of ports, derived from its path; the main checkout keeps 4200 and 4300.
const DEV_SERVER_BASE_PORT = 4200;
const SMOKE_SERVER_BASE_PORT = 4300;
// Offsets 1 to 99 keep a worktree's dev server below 4300 and its smoke server below 4400.
const HASHED_OFFSETS = 98;
const SPARE_OFFSET = 99;
// 4317 is the OTLP port, held exclusively on some machines: `ng serve` fails there with EACCES.
const RESERVED_OFFSET = 17;

export interface E2ePorts {
  readonly devServer: number;
  readonly smokeServer: number;
}

// A linked worktree has a `.git` file where the main checkout has a folder.
function isLinkedWorktree(root: string): boolean {
  try {
    return lstatSync(join(root, '.git')).isFile();
  } catch {
    return false;
  }
}

function worktreeOffset(root: string): number {
  if (!isLinkedWorktree(root)) {
    return 0;
  }
  // Lower case and forward slashes: Windows shells disagree on both for the same folder.
  const key = root.replaceAll('\\', '/').toLowerCase();
  const offset = (createHash('sha1').update(key).digest().readUInt16BE(0) % HASHED_OFFSETS) + 1;
  return offset === RESERVED_OFFSET ? SPARE_OFFSET : offset;
}

function portFromEnv(name: string): number | undefined {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`${name} must be a port number, got "${value}".`);
  }
  return port;
}

// `E2E_PORT` and `E2E_SMOKE_PORT` override the derived ports, for a port that is taken.
export function e2ePorts(root: string): E2ePorts {
  const offset = worktreeOffset(root);
  return {
    devServer: portFromEnv('E2E_PORT') ?? DEV_SERVER_BASE_PORT + offset,
    smokeServer: portFromEnv('E2E_SMOKE_PORT') ?? SMOKE_SERVER_BASE_PORT + offset,
  };
}
