#!/usr/bin/env node
// Serves the production build for the e2e smoke run (e2e/playwright.smoke.config.ts) the way GitHub Pages
// does: real files as they are, a folder's index.html, and 404.html with status 404 for every other path.
// A deep link like /goals reaches the Angular router only because `npm run build:pages` copies index.html
// to 404.html, so the smoke run fails if the deployed build stops doing that. Not for deployment; it
// exists so the smoke run needs no extra package.
//
//   node scripts/serve-dist.mjs [root=dist/pocket-discipline/browser] [port=4300] [base-path=/]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';

const ROOT = resolve(process.argv[2] ?? 'dist/pocket-discipline/browser');
const PORT = Number(process.argv[3] ?? 4300);
const BASE_SEGMENT = (process.argv[4] ?? '').replace(/^\/+|\/+$/g, '');
const BASE_PATH = BASE_SEGMENT ? `/${BASE_SEGMENT}/` : '/';

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
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return undefined;
  }
  const requested = resolve(join(ROOT, decoded));
  // Never outside the build, whatever the path says.
  const inside = requested === ROOT || requested.startsWith(ROOT + sep);
  if (!inside) return undefined;
  return (await fileAt(requested)) ?? (await fileAt(join(requested, 'index.html')));
}

if (!(await fileAt(join(ROOT, 'index.html')))) {
  console.error(`No build in ${ROOT}: run \`npm run build:pages\` first.`);
  process.exit(1);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (BASE_SEGMENT && url.pathname === `/${BASE_SEGMENT}`) {
      response.writeHead(302, { Location: `${BASE_PATH}${url.search}` }).end();
      return;
    }
    // Outside the base path is another site on Pages, so not this build's 404.html either.
    if (!url.pathname.startsWith(BASE_PATH)) {
      response.writeHead(404).end();
      return;
    }
    const file = await resolveFile(url.pathname.slice(BASE_PATH.length));
    const served = file ?? (await fileAt(join(ROOT, '404.html')));
    if (!served) {
      response.writeHead(404).end();
      return;
    }
    const body = await readFile(served);
    response.writeHead(file ? 200 : 404, {
      'Content-Type': TYPES[extname(served)] ?? 'application/octet-stream',
      // Each run must see the build on disk now, not one a browser kept from an earlier run.
      'Cache-Control': 'no-store',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(500).end();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Serving ${ROOT} at http://127.0.0.1:${String(PORT)}${BASE_PATH}`);
});
