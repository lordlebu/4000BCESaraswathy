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
  // Every spec renders WebGL, and one machine has one GPU. Playwright's default of one worker per
  // core put eight Chromium instances on it at once, which on a developer machine already running
  // an editor and a browser starved them all — the scene would not finish booting inside twenty
  // seconds and every spec failed at the same assertion, looking exactly like a broken build. CI
  // runners are quieter, so they keep the default.
  // Two locally, not three. CI lets Playwright choose and gets one or two on a runner of
  // half the cores; three was picked when this suite was eighteen specs and became the reason
  // the zoom test failed at home while passing on CI -- three parallel Phaser games do not
  // settle inside its waits. Matching CI is more useful than being fast and differently wrong.
  workers: process.env.CI ? undefined : 2,
  // Playwright's 30-second default is sized for DOM tests. Every spec here boots a WebGL renderer,
  // generates a world, and waits on tweened fog and a camera fade; screenshotting the canvas stalls
  // the GPU on top of that. On a machine also running an editor and a browser they overrun 30s and
  // fail at whatever assertion they happened to reach, which reads as a broken build and is not.
  timeout: 90_000,
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
