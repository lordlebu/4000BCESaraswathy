// Browser tests.
//
// The unit suite proves the world generator and the journal, both of which run under plain Node.
// What it cannot prove is that Phaser boots, draws, and talks back to React — and that is exactly
// the risky part, because Phaser 4's renderer was rewritten and most of what is written about
// Phaser still describes v3. One real browser catches "the canvas is blank" before a playtester
// does.

import { defineConfig, devices } from '@playwright/test';

// Point the suite at something already running — a `vite preview` of the production build, or the
// deployed Pages URL — instead of starting a dev server. The subpath build is a genuinely
// different code path from dev, and a wrong `base` is the classic way a Pages deploy goes blank.
//
//   $env:PLAYWRIGHT_BASE_URL = 'http://localhost:4180/4000BCESaraswathy/'; npm run test:e2e
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Only manage a dev server when we are not aimed at an external target.
  ...(process.env.PLAYWRIGHT_BASE_URL
    ? {}
    : {
        webServer: {
          command: 'npm run dev -- --no-open',
          url: 'http://localhost:4173',
          reuseExistingServer: !process.env.CI,
          timeout: 60_000
        }
      })
});
