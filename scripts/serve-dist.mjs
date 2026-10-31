#!/usr/bin/env node
// Serves the production build for the e2e smoke run (e2e/playwright.smoke.config.ts), the way a static
// host would: real files as they are, and index.html for every other path, so a deep link like /goals
// reaches the Angular router. Not for deployment; it exists so the smoke run needs no extra package.
//
//   node scripts/serve-dist.mjs [root=dist/pocket-discipline/browser] [port=4300]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';

const ROOT = resolve(process.argv[2] ?? 'dist/pocket-discipline/browser');
const PORT = Number(process.argv[3] ?? 4300);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function fileAt(path) {
  try {
    return (await stat(path)).isFile() ? path : undefined;
  } catch {
    return undefined;
  }
}

async function resolveFile(urlPath) {
  const requested = resolve(join(ROOT, decodeURIComponent(urlPath)));
  // Never outside the build, whatever the path says.
  const inside = requested === ROOT || requested.startsWith(ROOT + sep);
  const file = inside ? await fileAt(requested) : undefined;
  if (file) return file;
  // A missing asset is a real 404; only a route falls back to the app shell.
  return extname(urlPath) ? undefined : join(ROOT, 'index.html');
}

if (!(await fileAt(join(ROOT, 'index.html')))) {
  console.error(`No build in ${ROOT}: run \`npx ng build\` first.`);
  process.exit(1);
}

const server = createServer(async (request, response) => {
  try {
    const file = await resolveFile(new URL(request.url ?? '/', 'http://localhost').pathname);
    if (!file) {
      response.writeHead(404).end();
      return;
    }
    const body = await readFile(file);
    response.writeHead(200, {
      'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
      // Each run must see the build on disk now, not one a browser kept from an earlier run.
      'Cache-Control': 'no-store',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(500).end();
  }
});

server.listen(PORT, () => {
  console.log(`Serving ${ROOT} at http://localhost:${String(PORT)}`);
});
