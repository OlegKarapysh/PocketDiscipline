import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from '@playwright/test';
import base from '../playwright.config';

// The smoke run: the tests tagged @smoke (one happy path per feature, and the whole layout audit),
// against the GitHub Pages build instead of the dev server. `npm run e2e:smoke` builds it with
// `npm run build:pages`; CI runs this config on the very build it deploys.
//
// Paths in a config resolve against its own folder, so everything outside e2e/ is spelled out.
const ROOT = join(__dirname, '..');
const BUILD = join(ROOT, 'dist/pocket-discipline/browser');
const PORT = 4300;
const BASE_PATH = builtBaseHref();
// The address the server binds, not `localhost`, which may resolve to another server on ::1.
const BASE_URL = `http://127.0.0.1:${String(PORT)}${BASE_PATH}`;
const isCI = Boolean(process.env['CI']);

// The base href the build was made with, so the deploy path is written only in `build:pages`.
function builtBaseHref(): string {
  const indexHtml = join(BUILD, 'index.html');
  if (!existsSync(indexHtml)) {
    throw new Error(`No build in ${BUILD}: run \`npm run build:pages\` first.`);
  }
  const href = /<base href="([^"]+)"/.exec(readFileSync(indexHtml, 'utf8'))?.[1];
  if (!href) {
    throw new Error(`${indexHtml} has no <base href>.`);
  }
  return href;
}

export default defineConfig({
  ...base,
  testDir: './src',
  outputDir: join(ROOT, 'test-results'),
  reporter: isCI
    ? [['list'], ['html', { outputFolder: join(ROOT, 'playwright-report'), open: 'never' }]]
    : [['html', { outputFolder: join(ROOT, 'playwright-report') }]],
  grep: /@smoke/,
  // Read by the layout audit, which skips the screens a production build does not route.
  metadata: { ...base.metadata, production: true },
  use: {
    ...base.use,
    baseURL: BASE_URL,
    // The build registers a service worker. It would answer requests from its cache and hide them from
    // page.route; the offline behaviour it gives is not what these tests check.
    serviceWorkers: 'block',
  },
  webServer: {
    command: `node scripts/serve-dist.mjs dist/pocket-discipline/browser ${String(PORT)} ${BASE_PATH}`,
    cwd: ROOT,
    url: BASE_URL,
    reuseExistingServer: !isCI,
  },
});
