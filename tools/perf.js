// How expensive is a frame, on the renderer CI actually has?
//
// Three times a change has been free on the GPU it was built on and expensive on CI's software
// rasteriser. Each time it passed `npm run typecheck`, the whole unit suite and a local browser run
// -- because the local browser run has a GPU -- and then failed four walk-heavy specs on
// ninety-second timeouts about twenty minutes later. The failure never names its cause: it says
// `Test timeout of 90000ms exceeded`, which reads as a flaky test rather than as a frame that got
// a quarter more expensive.
//
// This is the check that should have caught all three, in half a minute rather than twenty.
//
// **It measures headless on purpose.** Playwright's headless Chromium renders WebGL through
// SwiftShader, a CPU rasteriser roughly ten times slower than a real GPU, and that is precisely
// what a CI runner does. The number here is not what a player sees -- players get about 7ms -- it
// is what the browser suite has to live inside. See `docs/rendering.md`.
//
//   npm run perf -- --save    # record where you are before a change
//   npm run perf              # measure again after it, and see the delta
//   npm run perf -- --json    # the numbers, for a script
//
// CommonJS, like everything in tools/ -- see tools/package.json.

const fs = require('node:fs');
const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

/**
 * There is no threshold, and that is a measured decision rather than a missing feature.
 *
 * Two designs were tried and both failed against this machine.
 *
 * **A fixed millisecond budget.** The same commit measured 67ms in the morning and 283ms in the
 * evening -- a fourfold swing with no code change, after hours of browser suites had presumably
 * warmed the laptop. Any number tight enough to catch a real regression would have failed all
 * evening.
 *
 * **A ratio against a reference workload measured in the same run**, on the theory that when the
 * machine slows both slow together. It does not hold: over four runs on identical code the raw
 * frame time stayed within 300-383ms while the *ratio* swung 0.89 to 2.16. Dividing by a second
 * noisy measurement amplifies noise rather than cancelling it. That was worth finding out and is
 * worth not repeating.
 *
 * What *is* reliable is the thing that caught every regression this session by hand: **measure,
 * change one thing, measure again, in the same sitting.** Within minutes the number is steady to
 * about 15%; across hours it is worthless. So this tool compares against a baseline you record
 * yourself, and says so loudly when that baseline is stale.
 */

/** Where the recorded baseline lives. Git-ignored: it describes a machine, not the code. */
const BASELINE_FILE = path.join(ROOT, '.perf-baseline.json');

/** Past this, a baseline is from a different thermal world and comparing to it means nothing. */
const BASELINE_STALE_MS = 90 * 60 * 1000;

/**
 * A change smaller than this is inside the noise floor.
 *
 * Twenty per cent, measured rather than picked, and the measurement is not flattering. Adding a
 * full-screen pass -- the regression this exists to catch -- moved the number +43%. Taking that
 * pass straight back out and measuring again still read +33%, because ten heavy runs back to back
 * had warmed the machine and it was drifting upward the whole time.
 *
 * So this is an aid, not an oracle. It will catch a real regression; it will also cry wolf if the
 * baseline is minutes and several runs old. Record the baseline **immediately** before the change,
 * and if a result surprises you, re-record and repeat rather than believing it.
 */
const NOISE_FLOOR = 0.2;

/** Where the dev server is put. Deliberately not 4173, so this never fights a server you are using. */
const PORT = 4188;

/**
 * The map measured, and why it is the default one rather than the biggest.
 *
 * The field map is not selectable from the URL -- the game opens on Lothal and the Narmada Plateau
 * is reached by travelling -- so measuring the 64x64 map would mean driving the travel panel, which
 * is a lot of brittleness for a check meant to be run casually. Lothal is 48x48 and carries around
 * 9,600 objects, which is enough to show any regression that matters: a full-screen pass costs the
 * same everywhere, and a per-tile layer shows here at about half the strength it would there.
 *
 * The hour is fixed at noon so the sky tint is constant, and the seed is fixed so the terrain is.
 */
const URL_PATH = '/?seed=perf-guard&hour=12';

/** Frames sampled, and how many are thrown away while the scene settles. */
const FRAMES = 110;
const WARMUP = 20;

/** What to do about a failure, in the order worth trying. Mirrors `docs/rendering.md`. */
const LEVERS = [
  'Shrink the cell of any layer whose art does not fill it. Fill rate is what scales.',
  'Cull anything static the camera cannot see.',
  'Avoid full-screen passes -- each costs a whole canvas of blending every frame.',
  'Bake combinations into one texture rather than compositing per sprite.'
];

function startServer() {
  return new Promise((resolve, reject) => {
    // Vite's own JS entry under the current node, rather than `npx`. The npm shim on Windows is a
    // `.cmd` file, and spawning one without a shell fails with EINVAL -- while spawning *with* a
    // shell makes killing the child unreliable, which would leave a server on the port.
    const child = spawn(
      process.execPath,
      [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(PORT), '--strictPort'],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    let settled = false;
    const done = (fn, arg) => {
      if (settled) return;
      settled = true;
      fn(arg);
    };
    const timer = setTimeout(() => {
      child.kill();
      done(reject, new Error('the dev server did not start within 60s'));
    }, 60_000);

    child.stdout.on('data', (chunk) => {
      if (/ready in|Local:/i.test(String(chunk))) {
        clearTimeout(timer);
        done(resolve, child);
      }
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      done(reject, new Error(`the dev server exited with code ${code} before it was ready`));
    });
  });
}

async function measure() {
  // Required lazily: this is a dev dependency and the file should still parse without it.
  const { chromium } = require('@playwright/test');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto(`http://localhost:${PORT}${URL_PATH}`, { waitUntil: 'domcontentloaded' });
    // The journal heading is the last thing written when the scene is up, so it is the signal that
    // the world is built rather than merely that the bundle loaded.
    await page.locator('.journal h2').first().waitFor({ timeout: 120_000 });
    await page.waitForTimeout(2500);

    // Which renderer actually answered. A machine that gives headless Chromium hardware
    // acceleration would report a fast frame that means nothing for CI, so this is printed rather
    // than assumed -- the exact mistake that started this whole line of work.
    const renderer = await page.evaluate(() => {
      const canvas = document.querySelector('.map-surface canvas');
      const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
      const info = gl && gl.getExtension('WEBGL_debug_renderer_info');
      return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'unknown';
    });

    const samples = await page.evaluate(
      ({ frames, warmup }) =>
        new Promise((resolve) => {
          const times = [];
          let last = performance.now();
          let seen = 0;
          const tick = (now) => {
            times.push(now - last);
            last = now;
            seen += 1;
            if (seen < frames) requestAnimationFrame(tick);
            else resolve(times.slice(warmup));
          };
          requestAnimationFrame(tick);
        }),
      { frames: FRAMES, warmup: WARMUP }
    );

    samples.sort((a, b) => a - b);
    return {
      renderer,
      errors,
      median: samples[Math.floor(samples.length / 2)],
      p90: samples[Math.floor(samples.length * 0.9)],
      best: samples[0]
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  const asJson = process.argv.includes('--json');
  let server;
  try {
    server = await startServer();
    const result = await measure();

    const software = /swiftshader|llvmpipe|software/i.test(result.renderer);

    if (asJson) {
      process.stdout.write(JSON.stringify({ ...result, software }, null, 2));
      return 0;
    }

    console.log(`renderer    ${result.renderer}`);
    console.log(`            ${software ? 'software — the same class CI uses' : '** NOT software: this tells you nothing about CI **'}`);
    console.log('');
    // The fastest frame, not the middle one, is what gets compared. A throttle spike or a
    // background process can only ever make a frame slower, so the minimum is the closest thing to
    // "what this machine can do with this scene" and drifts least between runs.
    console.log(`frame       best ${result.best.toFixed(1)} ms   median ${result.median.toFixed(1)} ms   p90 ${result.p90.toFixed(1)} ms`);

    if (result.errors.length) {
      console.log('');
      console.log('page errors:');
      for (const e of result.errors.slice(0, 5)) console.log(`  ${e}`);
    }

    if (!software) {
      console.log('');
      console.log('This machine gave headless Chromium a real GPU, so this is a player-side number');
      console.log('and says nothing about whether the browser suite will finish on CI.');
      return 0;
    }

    if (process.argv.includes('--save')) {
      fs.writeFileSync(
        BASELINE_FILE,
        JSON.stringify({ median: result.median, best: result.best, at: Date.now() }, null, 2)
      );
      console.log('');
      console.log('Saved as the baseline. Make your change, then run `npm run perf` again.');
      return 0;
    }

    let baseline = null;
    try {
      baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
    } catch {
      // No baseline yet, which is the normal first run.
    }

    if (!baseline) {
      console.log('');
      console.log('No baseline recorded. This number is only meaningful next to another one taken');
      console.log('in the same sitting — across hours it drifts by a factor of four on this machine.');
      console.log('');
      console.log('  npm run perf -- --save     before your change');
      console.log('  npm run perf               after it');
      return 0;
    }

    const age = Date.now() - baseline.at;
    const was = baseline.best ?? baseline.median;
    const delta = (result.best - was) / was;
    const minutes = Math.round(age / 60000);

    console.log(`baseline    best ${was.toFixed(1)} ms   recorded ${minutes} min ago`);
    console.log(`change      ${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(0)}%`);

    if (age > BASELINE_STALE_MS) {
      console.log('');
      console.log(`That baseline is ${minutes} minutes old, which is too old to compare against —`);
      console.log('this machine measured the same commit at 67 ms and 283 ms hours apart. Re-record');
      console.log('it against the code you want to compare with, then measure again.');
      return 0;
    }

    if (Math.abs(delta) <= NOISE_FLOOR) {
      console.log('');
      console.log(`Within the noise floor (±${Math.round(NOISE_FLOOR * 100)}%). No measurable change.`);
      return 0;
    }

    if (delta < 0) {
      console.log('');
      console.log(`Faster by ${Math.abs(delta * 100).toFixed(0)}%.`);
      return 0;
    }

    console.log('');
    console.log(`SLOWER by ${(delta * 100).toFixed(0)}%, which is past the noise floor.`);
    console.log('');
    console.log('This is what makes the browser suite time out on CI: the walk-heavy specs get');
    console.log('ninety seconds each and most of it goes on drawing. A quarter more per frame was');
    console.log('enough to fail four of them. Things to try, in order:');
    for (const [i, lever] of LEVERS.entries()) console.log(`  ${i + 1}. ${lever}`);
    console.log('');
    console.log('Repeat both measurements before believing this — the noise floor is about 15%.');
    return 1;
  } finally {
    if (server) server.kill();
  }
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(String(error && error.message ? error.message : error));
    process.exit(2);
  }
);
