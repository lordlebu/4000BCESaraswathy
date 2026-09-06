// Walking as somebody other than Varuna.
//
// The unit suite covers the cast list and the fallback. What it cannot see is the thing that
// actually went wrong for a month: **a sheet that is built, shipped and never loaded.** Mithra's
// texture existed since August and `WorldScene` named `CHARACTERS.varuna` in four places, so
// nothing ever asked for it. Only a browser can tell the difference between "the map has a second
// character in it" and "the second character can be drawn".
//
// `?as=` is what makes this testable at all, and is there for the same reason as `?seed=`, `?at=`
// and `?hour=`: seeing something should not require playing to it.

import { expect, test, type Page } from '@playwright/test';
import { step } from './walk';

const SEED = 'poi-1621';

/** Boot as somebody, and fail on the warnings that mean a texture is missing. */
async function bootAs(page: Page, as: string): Promise<string[]> {
  const problems: string[] = [];
  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'error') problems.push(`console.error: ${text}`);
    // Phaser answers a missing frame or texture with a warning and carries on drawing, which is
    // how a half-built character would look almost right. See `e2e/game.spec.ts`.
    if (/has no frame|Texture .* not found|__MISSING/i.test(text)) problems.push(`console.warn: ${text}`);
  });
  page.on('pageerror', (error) => problems.push(`uncaught: ${error.message}`));

  await page.goto(`/?seed=${SEED}&hour=12&at=10,8&as=${as}`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
  return problems;
}

// Every one of them, because the failure this guards against is per-character: a sheet that is
// short, misnamed, or never imported shows up for that traveller alone.
for (const who of ['varuna', 'guyuk', 'mithra', 'malacite', 'mehtar']) {
  test(`${who} can be walked`, async ({ page }) => {
    const problems = await bootAs(page, who);

    // Walking is the proof. A sprite that exists but has no walk animation still stands there.
    const before = (await page.locator('.journal h2').textContent()) ?? '';
    await step(page, 'KeyD');
    expect(
      (await page.locator('.journal h2').textContent()) ?? '',
      `${who} would not walk`
    ).not.toBe(before);

    expect(problems, `${who}: ${problems.join('\n')}`).toEqual([]);
  });
}

test('an unknown traveller falls back rather than breaking', async ({ page }) => {
  // `?as=` is a link somebody can mistype, and a stale save can name a character since retired.
  // Neither may produce a blank page.
  const problems = await bootAs(page, 'nobody-at-all');
  await expect(page.locator('.map-surface canvas')).toBeVisible();
  expect(problems, problems.join('\n')).toEqual([]);
});

test('the picker changes who is walking, without restarting the journey', async ({ page }) => {
  const problems = await bootAs(page, 'varuna');

  // Walk first, so there is a journey to lose if switching restarts one.
  await step(page, 'KeyD');
  const walked = (await page.locator('.journal h2').textContent()) ?? '';

  await page.getByRole('button', { name: /Map/ }).click();
  const picker = page.getByRole('radiogroup', { name: /walking as/i });
  await expect(picker).toBeVisible();

  // **What the scene says it is drawing**, which is the assertion that matters.
  //
  // Two earlier versions of this check guarded nothing. Asserting on the button's own state and
  // the URL passed with the texture swap deliberately removed -- the picker looked right and drew
  // the same person. Comparing canvas pixels passed too, because the map animates on its own and
  // any two screenshots of it differ.
  //
  // `data-traveller` is reported by `WorldScene` after it swaps the sprite, so it cannot be true
  // unless the swap happened. `docs/testing.md` calls this seam "the cheapest real change
  // available" and it is: one attribute, and the test stops being decorative.
  const stage = page.locator('.stage');
  await expect(stage).toHaveAttribute('data-traveller', 'varuna');

  await picker.getByRole('radio', { name: /Guyuk/ }).click();
  await expect(picker.getByRole('radio', { name: /Guyuk/ })).toHaveAttribute('aria-checked', 'true');
  await expect(stage, 'the scene is still drawing somebody else').toHaveAttribute(
    'data-traveller',
    'guyuk'
  );

  // The URL says who, so the link keeps describing what is on screen.
  await expect(page).toHaveURL(/as=guyuk/);

  // And the journey is still where it was -- a swap, not a restart.
  expect(await page.locator('.journal h2').textContent()).toBe(walked);
  expect(problems, problems.join('\n')).toEqual([]);
});

test('who is walking survives travelling to another map', async ({ page }) => {
  /**
   * **Reported from play: pick somebody, change map, and Varuna arrives.**
   *
   * `create` reads the character out of the scene's data and `characterFor` falls back to Varuna
   * for anything it does not recognise, `undefined` included -- so a `scene.restart` that omits
   * it is not a missing prop but a silent recast. Both restarts omitted it.
   *
   * This asserts on `data-traveller`, which `WorldScene` reports *after* it has swapped the
   * sprite, for the reason the picker test gives: the two earlier versions of that check guarded
   * nothing because they asked the button and the URL rather than the scene.
   */
  const problems = await bootAs(page, 'mithra');
  const stage = page.locator('.stage');
  await expect(stage).toHaveAttribute('data-traveller', 'mithra');

  // The control's accessible name is "Where to go", the same as the dialog it opens -- so this
  // has to ask for the button by role rather than by a /Travel/ name match.
  await page.getByRole('button', { name: 'Where to go' }).click();
  const where = page.getByRole('dialog', { name: /Where to go/ });
  await expect(where).toBeVisible();

  const travel = where.locator('.look button', { hasText: 'Travel' }).first();
  test.skip((await travel.count()) === 0, 'nowhere else is reachable from this map yet');
  await travel.click();

  // The map changed -- otherwise this proves nothing about travel.
  await expect(where).toBeHidden();
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });

  await expect(stage, 'travelling recast the traveller as Varuna').toHaveAttribute(
    'data-traveller',
    'mithra',
    { timeout: 20_000 }
  );
  expect(problems, problems.join('\n')).toEqual([]);
});
