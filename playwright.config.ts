import { defineConfig, devices } from '@playwright/test';
import { e2ePorts } from './e2e/ports';

const isCI = Boolean(process.env['CI']);
// 4200 in the main checkout; a linked worktree gets a port derived from its path, so parallel sessions
// rarely share a server. Two worktrees can still hash to one port: set E2E_PORT in one of them.
const PORT = e2ePorts(__dirname).devServer;
const BASE_URL = `http://localhost:${String(PORT)}`;

export default defineConfig({
  testDir: './e2e/src',
  fullyParallel: true,
  forbidOnly: isCI,
  // One retry on CI shows a flake as "flaky" in the report instead of failing the run; none locally,
  // so a flake is seen where it can be fixed.
  retries: isCI ? 1 : 0,
  // ubuntu-latest has 4 cores and each worker drives its own Chromium: 2 leaves room for the browser
  // processes and the server. Locally, 6: the layout audit times out from about 14 workers.
  workers: isCI ? 2 : 6,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run start -- --port ${String(PORT)}`,
    url: BASE_URL,
    reuseExistingServer: !isCI,
  },
});
