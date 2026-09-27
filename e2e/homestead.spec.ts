// Settling Lothal, in a browser.
//
// `test/homestead.test.ts` walks the whole loop under Node against canon's Lothal homestead. This is
// the half only a page can prove: that the Eastern Field's place panel offers it, that the holder
// can be talked round on the card, that a stage spends what it needs and draws on the map, and that
// the settled page is headed by its painting.
//
// A journey is seeded rather than played to this point -- the playthrough spec already walks a map,
// and earning a settlement by hand would be minutes of tweens proving nothing new. What is seeded is
// the save's what-you-know half: four finished discoveries (the rung counts are canon's, last rung
// index, checked when this was written), a Kia word, what the satchel holds, and the journey's flags.

import { expect, test, type Page } from '@playwright/test';

const SEED = 'homestead';
const MAP = 'field_map_lothal';

/** Canon's last rung, per discovery. A discovery is finished at its last rung. */
const FINISHED = {
  discovery_poisoned_ground: 4,
  discovery_red_rice_survival: 6,
  discovery_granary_fall: 6,
  discovery_winter_line: 6
};

const AGREED = [
  `homestead:${MAP}:ground:ground_eastern_field`,
  `homestead:${MAP}:eased:poisoned`,
  `homestead:${MAP}:eased:moving`,
  `homestead:${MAP}:eased:stranger`
];

async function seeded(page: Page, save: { flags?: string[]; satchel?: Record<string, number> }) {
  await page.addInitScript(
    ({ key, journey }) => {
      try {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(journey));
      } catch {
        // Storage refused: the spec fails on what it looks for, which is the honest outcome.
      }
    },
    {
      key: `south-of-tethys:${SEED}`,
      journey: {
        knowledgeVersion: 1,
        progress: { rungs: FINISHED, words: ['word_kia_uvai'], recipes: [], made: [], answered: {}, questions: [] },
        satchel: save.satchel ?? {},
        flags: save.flags ?? [],
        met: []
      }
    }
  );
  await page.goto(`/?seed=${SEED}&map=${MAP}&hour=12&at=poi_eastern_field`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });
}

const building = (page: Page) => page.locator('.place .settling');
const drawn = (page: Page) =>
  page.evaluate(() => (window as unknown as { __homestead?: () => string[] }).__homestead?.() ?? []);

test('Hasme is talked round, worry by worry, and agrees', async ({ page }) => {
  await seeded(page, {});
  await building(page).getByRole('button', { name: 'Ask Hasme about building here' }).click();
  const card = page.locator('.negotiation');
  await expect(card).toBeVisible();
  await expect(card).toContainText('It is poisoned.');

  // Listening draws out the hint and eases nothing.
  await card.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect(card).toContainText('She is not frightened of the field.');
  await expect(card).toContainText('It is poisoned.');

  await card.getByRole('button', { name: /What Came Up in the Eastern Field/ }).click();
  await expect(card).toContainText('Salt. Coming up from underneath.');
  await expect(card).toContainText('And then the camp moves.');

  await card.getByRole('button', { name: /The Camp Can Winter Here/ }).click();
  await expect(card).toContainText('And you are not of the delta.');

  await card.getByRole('button', { name: 'Answer in Kia' }).click();
  await expect(card).toContainText('Build it, then.');
  await card.getByRole('button', { name: 'Go and build' }).click();
  await expect(card).toBeHidden();

  // Agreed: the place now offers the first stage, and says what it is short of.
  await expect(building(page)).toContainText('0 of 3 stages stand.');
  await expect(building(page).getByRole('button', { name: 'Lay the foundation' })).toBeDisabled();
  await expect(building(page)).toContainText('Needs 4 river clay');
});

test('the foundation spends what it needs, has its card, and stands on the map', async ({ page }) => {
  await seeded(page, { flags: AGREED, satchel: { material_river_clay: 4, material_reed_fibre: 3 } });
  const lay = building(page).getByRole('button', { name: 'Lay the foundation' });
  await expect(lay).toBeEnabled();
  await lay.click();

  const card = page.locator('.activity-card');
  await expect(card.locator('h2')).toHaveText('Lay the foundation');
  await expect(card.locator('img.activity-scene')).toHaveAttribute('src', /settle-ground/);
  await card.getByRole('button', { name: 'Stand back and look at it' }).click();
  await card.getByRole('button', { name: 'Go on' }).click();
  await expect(card).toBeHidden();

  await expect.poll(() => drawn(page), { timeout: 10_000 }).toEqual(['homestead:homestead-stage-1']);
  await expect(building(page)).toContainText('1 of 3 stages stand.');
});

test('settled, the mill turns beside its greenhouse and the page is headed by the people moving in', async ({ page }) => {
  const built = ['foundation', 'tower', 'sails'].map((s) => `homestead:${MAP}:built:${s}`);
  await seeded(page, { flags: [...AGREED, ...built, `homestead:${MAP}:settled`] });

  await expect
    .poll(() => drawn(page), { timeout: 10_000 })
    .toEqual(['homestead:windmill', 'homestead:blades', 'homestead:homestead-greenhouse']);

  await building(page).getByRole('button', { name: 'Read the settlement page' }).click();
  const ending = page.locator('.ending');
  await expect(ending.locator('h2').first()).toHaveText('The mill among the trees');
  await expect(ending.locator('img.ending-picture')).toHaveAttribute('src', /settle-home/);
  await expect(ending).toContainText('a place people lived');
});
