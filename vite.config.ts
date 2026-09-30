/// <reference types="vitest/config" />
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this repo from /<repo>/, so assets must resolve against that subpath.
// Local dev and any plain static host (Hostinger) want '/', so the subpath is opt-in via env.
// CI sets DEPLOY_BASE=/4000BCESaraswathy/ for the Pages build.
//
// The release build sets DEPLOY_BASE=./ instead. itch.io serves a game from inside an iframe at a
// path nobody chooses, so every asset has to resolve against the page rather than the site root;
// a relative base is the one value that works there, in a zip opened anywhere, and on Pages too.
const base = process.env.DEPLOY_BASE ?? '/';

/**
 * Writes `dist/sw.js` from `tools/service-worker.js`, stamped with this build.
 *
 * The stamp is a hash of every file name in the bundle. Those names carry content hashes already,
 * so it changes exactly when something the player downloads has changed -- and a service worker
 * whose bytes change is what tells a browser there is a new release and the old cache can go.
 * Build only: in development there is no `sw.js`, and `src/main.tsx` does not ask for one.
 */
function serviceWorker(): Plugin {
  return {
    name: 'south-of-tethys:service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const names = Object.keys(bundle).sort().join(' ');
      const build = createHash('sha256').update(names).digest('hex').slice(0, 12);
      const template = readFileSync(new URL('./tools/service-worker.js', import.meta.url), 'utf8');
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: template.replace('__BUILD__', build) });
    }
  };
}

export default defineConfig({
  base,
  plugins: [react(), serviceWorker()],
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
          // Canon's data on the same footing, and for the same reason turned round: content
          // changes on its own schedule, so a canon release should not re-download the app and an
          // app fix should not re-download canon. It also gives the data a file of its own to
          // weigh -- `tools/check-bundle-size.js` budgets it as what the player downloads.
          if (id.replace(/\\/g, '/').includes('/data/canon/')) return 'canon';
          return undefined;
        }
      }
    }
  }
});
