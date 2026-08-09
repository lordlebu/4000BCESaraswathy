// Browser tests.
//
// The unit suite proves the world generator and the journal, both of which run under plain Node.
// What it cannot prove is that Phaser boots, draws, and talks back to React — and that is exactly
// the risky part, because Phaser 4's renderer was rewritten and most of what is written about
// Phaser still describes v3. One real browser catches "the canvas is blank" before a playtester
// does.

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --no-open',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
});
