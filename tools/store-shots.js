// Take the screenshots a store listing asks for, from the built game.
//
// Every listing wants the same handful of pictures, and a picture taken by hand is taken once and
// then shows a game that no longer looks like that. These are cut from `dist/` at fixed seeds and
// hours, so they can be retaken after any release and come out framed the same way.
//
// JPEG at 1280x720, because a listing is a web page: the five come to well under a megabyte, where
// the same frames as PNG are several each.
//
//   npm run build && node tools/store-shots.js
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'docs', 'store-kit');
const PORT = 4195;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

/**
 * What each picture is of.
 *
 * **Every one is walked first.** A journey opens under fog with an empty diary, which is right for
 * a player and useless for a listing: the first version of these showed a lit cross on a dark
 * field and a page reading "Nothing written yet". `walk` is keys pressed one step at a time, so the
 * fog is lifted and the collection has something in it before the picture is taken. `open` then
 * presses a button by its visible label, and then tabs inside the panel it opened.
 */
// Thirty-four steps. Walking spends the day -- about eighty steps of easy ground is dawn to dusk --
// so a longer loop ends every picture in the dark, which the first attempt at this did.
const LOOP = 'd'.repeat(8) + 's'.repeat(5) + 'a'.repeat(10) + 'w'.repeat(6) + 'd'.repeat(5);
const SHOTS = [
  { file: '01-lothal-morning.jpg', query: 'seed=play-test&hour=6&map=field_map_lothal', walk: LOOP },
  { file: '02-narmada-noon.jpg', query: 'seed=play-test&hour=8&map=field_map_narmada', walk: LOOP },
  { file: '03-dwarka-evening.jpg', query: 'seed=play-test&hour=12&map=field_map_dwarka', walk: LOOP },
  { file: '04-collection.jpg', query: 'seed=play-test&hour=6&map=field_map_lothal', walk: LOOP, open: ['Records', 'Met'] },
  { file: '05-map-and-travellers.jpg', query: 'seed=play-test&hour=6&map=field_map_lothal', walk: LOOP, open: ['Map'] }
];

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

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise((resolve) => server.listen(PORT, resolve));
  const browser = await chromium.launch();
  for (const shot of SHOTS) {
    // A fresh context each time, so no picture inherits the last one's save or open panel.
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    await page.goto(`http://localhost:${PORT}/?${shot.query}`);
    await page.locator('canvas').first().waitFor({ timeout: 90_000 });
    await page.waitForTimeout(3000);
    for (const key of shot.walk ?? '') {
      await page.keyboard.press(key);
      // A step is a tween, and a key pressed during one is dropped.
      await page.waitForTimeout(380);
    }
    await page.waitForTimeout(1200);
    const [first, ...inside] = shot.open ?? [];
    if (first) {
      await page.getByRole('button', { name: first }).first().click();
      await page.waitForTimeout(1200);
    }
    // Anything after the first is a tab inside the panel that opened. Looked for there and not on
    // the page: the Records button's own label reads "31 met", so "Met" on the page finds it again.
    for (const label of inside) {
      await page.getByRole('dialog').getByText(new RegExp(`^${label}`)).first().click();
      await page.waitForTimeout(1200);
    }
    await page.screenshot({ path: path.join(OUT, shot.file), type: 'jpeg', quality: 90 });
    console.log(`  ${shot.file}`);
    await context.close();
  }
  await browser.close();
  server.close();
})().catch((error) => {
  console.error(error);
  server.close();
  process.exit(1);
});
