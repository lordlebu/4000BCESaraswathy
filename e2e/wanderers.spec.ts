// Is the whale actually on the map?
//
// **The only check that can answer it.** `test/wanderers.test.ts` proves every rule -- where the
// circuit goes, how wide its range is, where the hour puts the animal -- and all fifteen of those
// assertions would still pass if `WorldScene` never called any of it. That is this codebase's
// signature fault, with five recorded instances: a thing built, tested, believed, and wired to
// nothing. A Node test cannot see a Phaser sprite, so the scene exposes `window.__wanderers`.
//
// Three things are asserted and the third is the one that matters: that the sprite exists, that it
// is drawn from a real texture rather than a missing one, and that it is **somewhere different at
// noon than at dawn**. An animal parked on one tile all day would satisfy the first two, and is
// exactly the failure worth catching.

import { expect, test, type Page } from '@playwright/test';

type Seen = {
  id: string;
  name: string;
  stops: number;
  texture: string;
  visible: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
};

const read = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __wanderers?: () => Seen[] }).__wanderers?.() ?? null
  ) as Promise<Seen[] | null>;

// The whale is authored on the Narmada and nowhere else, so the map is named rather than defaulted.
// `?hour=` is a clock hour, not a phase -- phase zero is first light at six in the morning rather
// than midnight, which is the confusion that put the travellers' walking window at noon-to-midnight.
async function bootAt(page: Page, hour: string): Promise<Seen[]> {
  await page.goto(`/?seed=whale-watch&map=field_map_narmada&hour=${hour}`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  // The scene moves them on its half-second gate, so they arrive a beat after the canvas.
  await page.waitForTimeout(1500);
  const seen = await read(page);
  expect(seen, 'the scene exposes no wanderers at all -- is createWanderers still called?')
    .not.toBeNull();
  return seen!;
}

test('the Narmada carries a walking whale, and it is drawn', async ({ page }) => {
  const warnings: string[] = [];
  page.on('console', (m) => {
    const text = m.text();
    if (/has no frame|Texture .* not found|__MISSING/i.test(text)) warnings.push(text);
  });

  const seen = await bootAt(page, '12');

  expect(seen.length, 'no animal wanders the Narmada').toBeGreaterThan(0);
  const whale = seen.find((w) => w.id === 'narmada-walking-whale');
  expect(whale, 'the walking whale is not among the wanderers').toBeTruthy();
  expect(whale!.name).toContain('Walking');
  // A circuit of one tile is not a circuit, and `wanderers.ts` drops it rather than drawing a
  // stationary animal -- so anything that arrives here has at least two stops.
  expect(whale!.stops, 'the whale has no circuit to walk').toBeGreaterThanOrEqual(2);

  // Drawn from the built stand-in, not from a texture Phaser could not find. The key is asserted
  // by prefix rather than in full: the facing half changes as it turns, and naming the whole key
  // would make this fail the first time the animal walked west.
  expect(whale!.texture).toContain('wanderer:narmada-walking-whale');
  expect(whale!.visible, 'the whale exists but is not being drawn').toBe(true);
  expect(whale!.w, 'the whale is drawn at no width').toBeGreaterThan(0);
  expect(whale!.h, 'the whale is drawn at no height').toBeGreaterThan(0);

  expect(warnings, `Phaser could not draw something: ${warnings.join(' | ')}`).toEqual([]);
});

test('it is somewhere different at noon than at first light', async ({ page }) => {
  // The assertion the whole feature rests on. An animal that is a property of a tile -- which is
  // every other creature in this game -- would be in the same place at both hours.
  const dawn = await bootAt(page, '5');
  const noon = await bootAt(page, '12');

  const at = (seen: Seen[]) => {
    const w = seen.find((s) => s.id === 'narmada-walking-whale')!;
    return `${w.x},${w.y}`;
  };

  expect(at(dawn), 'the whale stands on one tile all day').not.toBe(at(noon));
});
