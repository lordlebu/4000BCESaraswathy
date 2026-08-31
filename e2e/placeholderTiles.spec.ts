// Ground the art has not caught up with is still drawn as itself.
//
// `assets/terrain.png` is built from art in `assets/source/`, and `tools/build-terrain.js`
// converts art rather than inventing it -- so a biome with no drawing could not be drawn, and
// canon marked five of them `renderable: false` for that reason alone. That stranded every
// species living only there: `lava_field` alone had 29 encounterable fauna and 7 flora written,
// published in the bestiary, and unreachable in play.
//
// `placeholderTileKey` draws any biome from the `color` and `symbol` that `data/biomes.json`
// already carried. This checks it reaches the screen, and that the ground says what it is.

import { expect, test } from '@playwright/test';

const SEED = 'placeholder-e2e';
const KEY = `south-of-tethys:world:${SEED}:field_map_lothal`;

test('a biome with no sheet art still draws, and says what it is', async ({ page }) => {
  await page.goto(`/?seed=${SEED}&hour=12`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1000);

  // Repaint the stored world as lava field. 'b' is its character in `BIOME_CODES` -- appended
  // after the eleven that have art, which is why the encoding is append-only.
  await page.evaluate((k) => {
    const baked = JSON.parse(localStorage.getItem(k)!) as { biomes: string[] };
    baked.biomes = baked.biomes.map((row) => 'b'.repeat(row.length));
    localStorage.setItem(k, JSON.stringify(baked));
  }, KEY);

  await page.reload();
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });

  // The ground names itself. If the placeholder had not been wired, `tileFrame` would have
  // fallen back to plains and the notes would describe a meadow.
  await expect(page.locator('.journal')).toContainText(/cooled basalt/i, { timeout: 20_000 });

  // And the species that were stranded behind the missing art are now met.
  await expect(page.locator('.journal')).toContainText(/soot-grass|tubeworm/i, {
    timeout: 20_000
  });

  // A real render, not a blank frame.
  const shot = await page.locator('.map-surface canvas').screenshot();
  expect(shot.byteLength).toBeGreaterThan(8_000);
});
