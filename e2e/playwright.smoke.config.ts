import { join } from 'node:path';
import { defineConfig } from '@playwright/test';
import base from '../playwright.config';

// The smoke run: the tests tagged @smoke (one happy path per feature, and the whole layout audit),
// against the exact Pages artifact instead of the dev server. Locally, `npm run e2e:smoke` builds
// with the same base href as the deployed app.
//
// Paths in a config resolve against its own folder, so everything outside e2e/ is spelled out.
const ROOT = join(__dirname, '..');
const PORT = 4300;
const BASE_PATH = '/PocketDiscipline/';
const BASE_URL = `http://localhost:${String(PORT)}${BASE_PATH}`;
const isCI = Boolean(process.env['CI']);

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
