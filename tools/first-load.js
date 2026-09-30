// How much does a player download before they can walk?
//
// **Nobody had measured this, and the number everybody quoted was the wrong one.** `dist/` is 30 MB,
// and that was taken for the cost of opening the game -- it decided which portals the game was
// thought too heavy for. It is the cost of seeing *everything*: the plates, scenes, portraits and
// faces are `<img>` tags, fetched when a panel first shows them. What arrives before the first
// frame was 8.56 MB when this was written, and 4.05 MB of that was every map's painted animals
// loaded on a map that has none. That is the fault this found on its first run.
//
// `check-bundle-size.js` budgets the code, gzipped. This counts the rest: every request the page
// makes from a cold start until the map is drawn and has been left alone for a few seconds, per
// field map. Text is counted gzipped, because every host compresses it; a PNG is counted as it is,
// because it is already compressed and no host makes it smaller.
//
// A report and not a gate. The browser suite is already the slowest thing in CI, and a number that
// moves with the art wants looking at by somebody rather than a threshold guessed in advance.
//
//   npm run build && node tools/first-load.js
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const zlib = require('node:zlib');
const { chromium } = require('@playwright/test');

const DIST = path.join(path.resolve(__dirname, '..'), 'dist');
const PORT = 4193;
const MAPS = ['field_map_lothal', 'field_map_narmada', 'field_map_dwarka', 'field_map_aravali'];
/** Long enough for Phaser's loader to finish after the canvas exists; nothing asks later than this. */
const SETTLE_MS = 5000;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('dist/index.html is missing. Build first: npm run build');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const file = path.join(DIST, url === '/' ? 'index.html' : url);
  fs.readFile(file, (err, body) => {
    if (err) {
      res.statusCode = 404;
      res.end();
      return;
    }
    res.setHeader('content-type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.end(body);
  });
});

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2).padStart(6);

async function measure(browser, map) {
  // A fresh context each time: no cache, no save, which is what a first visit is.
  const context = await browser.newContext({ viewport: { width: 960, height: 600 } });
  const page = await context.newPage();
  const got = [];
  page.on('response', async (response) => {
    // Phaser hands each image to the texture manager through a blob: URL, which the browser also
    // reports as a response. Counting those would count every painting twice.
    if (!response.url().startsWith('http')) return;
    try {
      const body = await response.body();
      const name = new URL(response.url()).pathname;
      const text = !name.endsWith('.png');
      got.push({ name, text, wire: text ? zlib.gzipSync(body).length : body.length });
    } catch {
      // A response with no body -- a redirect, or one the page abandoned. Nothing to weigh.
    }
  });
  await page.goto(`http://localhost:${PORT}/?seed=play-test&map=${map}`);
  await page.locator('canvas').first().waitFor({ timeout: 90_000 });
  await page.waitForTimeout(SETTLE_MS);
  await context.close();
  return got;
}

(async () => {
  await new Promise((resolve) => server.listen(PORT, resolve));
  const browser = await chromium.launch();
  console.log('  map                   requests   code+data    art     total   (MB on the wire)');
  let heaviest = [];
  for (const map of MAPS) {
    const got = await measure(browser, map);
    const sum = (rows) => rows.reduce((total, row) => total + row.wire, 0);
    const text = got.filter((row) => row.text);
    const art = got.filter((row) => !row.text);
    console.log(
      `  ${map.padEnd(20)} ${String(got.length).padStart(8)}     ${mb(sum(text))}  ${mb(sum(art))}    ${mb(sum(got))}`
    );
    if (sum(got) > sum(heaviest)) heaviest = got;
  }
  await browser.close();
  server.close();

  console.log('\n  The ten heaviest files on the heaviest map:');
  for (const row of heaviest.sort((a, b) => b.wire - a.wire).slice(0, 10)) {
    console.log(`    ${(row.wire / 1024).toFixed(0).padStart(6)} KB  ${row.name.replace('/assets/', '')}`);
  }
})().catch((error) => {
  console.error(error);
  server.close();
  process.exit(1);
});
