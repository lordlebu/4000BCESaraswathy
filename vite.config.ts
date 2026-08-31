/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this repo from /<repo>/, so assets must resolve against that subpath.
// Local dev and any plain static host (Hostinger) want '/', so the subpath is opt-in via env.
// CI sets DEPLOY_BASE=/4000BCESaraswathy/ for the Pages build.
const base = process.env.DEPLOY_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    // Vitest owns test/ only. Without this it would also collect e2e/*.spec.ts and try to run
    // Playwright's browser tests in Node, where they cannot work.
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    // Node by default, because everything under world/ and content/ is meant to run there and
    // a DOM would hide a stray browser dependency rather than catch it. The panel tests opt in
    // per file with `// @vitest-environment jsdom`, which keeps that boundary visible.
    environment: 'node',
    /**
     * Vitest's default is five seconds, which was never a budget anybody chose for this suite.
     *
     * Several tests here generate whole worlds -- `conversation.test.ts` lives six journeys
     * across six seeds, `night.test.ts` checks shelter is reachable from every tile of every
     * map -- and a field map costs about 30ms to build. In isolation each file finishes in
     * two or three seconds; run thirty-five files in parallel on a saturated machine and the
     * same tests intermittently cross five, and the suite goes red for no reason anybody can
     * act on. That happened three times in one afternoon, each time on a different file.
     *
     * Measured before raising: the cost per build is 30ms and was 30ms before the river
     * rewrite, so this is contention rather than a regression to fix. Twenty seconds is far
     * enough above the worst observed run (6.7s) to stop the noise, and far below anything
     * that would let a genuinely hung test pass unnoticed.
     */
    testTimeout: 20_000
  },
  server: {
    port: 4173,
    open: true
  },
  build: {
    outDir: 'dist',
    // Phaser is ~1 MB minified and will always trip the default warning. Raise it so a real
    // regression in our own bundle size is still visible.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Keep the engine in its own long-lived chunk; game code changes far more often, and a
        // returning player should not re-download 1 MB of Phaser because a journal string moved.
        manualChunks(id: string) {
          if (id.includes('node_modules/phaser')) return 'phaser';
          return undefined;
        }
      }
    }
  }
});
