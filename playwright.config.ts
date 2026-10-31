import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env['CI']);

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
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:4200',
    reuseExistingServer: !isCI,
  },
});
