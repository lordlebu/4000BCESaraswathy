// Being talked to, in a browser.
//
// The unit tests cover the splitting and the component. This covers the thing neither can see:
// that a real person, in a real place, says more than one thing, and says it a piece at a time.
//
// It uses the dockyard seed for the same reason `questions.spec.ts` does -- Thrali stands two
// steps south of the start, and his first line is ungated, so a meeting happens without having to
// play the game first.

import { expect, test, type Page } from '@playwright/test';
import { step } from './walk';

const SEED = 'dock-5226';
const AT_NIGHT = `/?seed=${SEED}&hour=0&at=35,39`;

async function walkToThrali(page: Page) {
  await page.goto(AT_NIGHT);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
  await step(page, 'ArrowDown');
  await step(page, 'ArrowDown');
  await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });
}

test('a person says one thing at a time, not a paragraph', async ({ page }) => {
  await walkToThrali(page);

  const person = page.locator('.person').first();
  await expect(person).toBeVisible();

  // The whole point of the phase: there is a control to go on, so the exchange is paced by the
  // player rather than delivered complete. Before this, meeting somebody was a finished block of
  // text that was simply already there.
  const goOn = person.getByRole('button', { name: /Go on/ });
  await expect(goOn).toBeVisible({ timeout: 10_000 });
});

test('the second thing arrives only when asked for', async ({ page }) => {
  await walkToThrali(page);

  const person = page.locator('.person').first();
  const beats = person.locator('.dialogue-beat');

  // One beat on screen: the current one. Everything else is still held back.
  await expect(beats).toHaveCount(1);

  // A click completes the sentence being typed; only a click on a finished one advances. Which of
  // those the first click does depends on how fast the typing got here, so the test clicks until a
  // second beat exists rather than assuming a count.
  //
  // **This is the test that caught the reveal bug on CI.** Clicking used to complete the sentence
  // and then have the still-running interval overwrite it a frame later, so no number of clicks
  // ever advanced the exchange. It passed locally, where the typing finishes in about a second,
  // and failed on a runner with no GPU, where it does not.
  const goOn = person.getByRole('button', { name: /Go on/ });
  await expect(async () => {
    // If the control has gone, the exchange has run out of beats and clicking will never help --
    // surface that rather than spinning to the outer timeout.
    await expect(goOn, 'expected another beat to be offered').toBeVisible({ timeout: 2_000 });
    await goOn.click();
    await expect(beats).toHaveCount(2, { timeout: 2_000 });
  }).toPass({ timeout: 30_000 });

  // And the first is still there -- half these lines are the only place a word is explained.
  await expect(beats.first()).toBeVisible();
});

test('walking out does not lose what you were told', async ({ page }) => {
  await walkToThrali(page);
  await expect(page.locator('.person .dialogue-beat')).not.toHaveCount(0);

  // Leave immediately, without clicking through the exchange. Thrali's first line gives the
  // silver-water question, and a player who stood there while he spoke has been given it --
  // recording only on completion once meant the question was silently dropped on the way out.
  await page.getByRole('button', { name: 'Leave' }).click();

  await page.getByRole('button', { name: /Records/ }).click();
  await expect(page.locator('.diary')).toBeVisible();
  await expect(page.locator('.question')).not.toHaveCount(0);
});

test('the person you are talking to has a face beside the words', async ({ page }) => {
  await walkToThrali(page);

  const person = page.locator('.person').first();
  const portrait = person.locator('.person-portrait').first();
  await expect(portrait).toBeVisible();

  // Large enough to read as somebody rather than as punctuation beside a name -- the mark this
  // replaced was 26px. Painted or drawn, it is the same box.
  const face = await portrait.boundingBox();
  expect(face, 'the portrait should have a box').not.toBeNull();
  expect(face!.width).toBeGreaterThanOrEqual(56);

  // And it sits beside what is being said, not above it.
  const said = await person.locator('.dialogue-beat').first().boundingBox();
  expect(said, 'a beat should have a box').not.toBeNull();
  expect(said!.x).toBeGreaterThan(face!.x + face!.width - 1);
});

test('the People tab keeps a record of who you have met', async ({ page }) => {
  await walkToThrali(page);
  await expect(page.locator('.person .dialogue-beat')).not.toHaveCount(0);
  await page.getByRole('button', { name: 'Leave' }).click();

  await page.getByRole('button', { name: /Records/ }).click();
  await page.getByRole('tab', { name: /People/ }).click();

  // He is in it, with his trade and what he handed over -- and none of it as a canon id.
  const row = page.locator('.people-row').first();
  await expect(row).toContainText('Thrali');
  await expect(row).toContainText('fisher');
  await expect(page.locator('.people')).not.toContainText('question_');
});

test('the People tab is empty before anybody has been spoken to', async ({ page }) => {
  await page.goto(AT_NIGHT);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: /Records/ }).click();
  await page.getByRole('tab', { name: /People/ }).click();
  await expect(page.getByText(/have not talked to anybody/i)).toBeVisible();
});
