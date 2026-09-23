// A letter typed on a phone must not walk the traveller.
//
// Reported from play: on mobile, typing a seed containing W, A, S or D moved the character. A
// phone's soft keyboard often sends a key with no `code` and no matching key-up, so the guard that
// swallows step keys while typing (it reads `event.code`) let it through, Phaser recorded W as held,
// and the moment the field lost focus `update` walked on the held key.
//
// Recreated here the way the phone does it: a key-down with the letter's keyCode and an empty code,
// no key-up, then the field closes.

import { expect, test } from '@playwright/test';

type Walker = { x: number; y: number; moving: boolean; queued: number };

test('a soft-keyboard W in a text field does not walk the traveller', async ({ page }) => {
  await page.goto('/?seed=soft-keyboard&map=field_map_dwarka&door=open');
  await page.waitForFunction(() => Boolean((window as unknown as { __walker?: unknown }).__walker), null, {
    timeout: 60_000
  });
  await page.waitForTimeout(1500);
  const before = await page.evaluate(
    () => (window as unknown as { __walker: () => Walker }).__walker()
  );

  await page.evaluate(() => {
    // Any text field will do -- the seed box lives in a sheet that is closed here.
    const field = document.createElement('input');
    field.id = 'soft-keyboard-field';
    document.body.appendChild(field);
    field.focus();
    for (const key of ['w', 'a', 's', 'd']) {
      const keyCode = key.toUpperCase().charCodeAt(0);
      // `keyCode` and `which` are what Phaser reads; `code` is empty, as a soft keyboard leaves it.
      const down = new KeyboardEvent('keydown', { key, code: '', bubbles: true, cancelable: true });
      Object.defineProperty(down, 'keyCode', { get: () => keyCode });
      Object.defineProperty(down, 'which', { get: () => keyCode });
      field.dispatchEvent(down);
    }
  });
  await page.waitForTimeout(300);
  // The soft keyboard closes: the field loses focus, and no key-up ever arrived.
  await page.evaluate(() => (document.getElementById('soft-keyboard-field') as HTMLInputElement).blur());
  await page.waitForTimeout(2500);

  const after = await page.evaluate(() => (window as unknown as { __walker: () => Walker }).__walker());
  expect(
    { x: after.x, y: after.y, moving: after.moving },
    'the traveller walked on a key typed into a text field'
  ).toEqual({ x: before.x, y: before.y, moving: false });
});
