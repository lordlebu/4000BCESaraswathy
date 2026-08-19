// Night, and what to do about it.
//
// The rule the whole thing rests on: **setting out at dawn always leaves you able to reach
// shelter.** A day buys about eighty steps of ordinary walking and the furthest tile from a roof
// on any map measured seventy-two, so the promise is arithmetic rather than hope -- and
// `test/night.test.ts` asserts it against the real maps.
//
// What happens when you ignore that is deliberately mild. Being caught out costs the night: no
// discoveries, no observations, a diary entry saying as much, and **the traveller wakes exactly
// where he stopped**. An earlier draft had him waking somewhere he did not choose, which is a
// teleport -- the game moving the player's character while they were not looking -- and it is
// neither clear nor true to what happens to somebody caught out at dusk. They stop. In the
// morning they are where they stopped.
//
// So the cost of a bad night is the night itself: hours gone, nothing recorded, and no closer to
// anywhere. That is enough to make you watch the sky without ever taking control away, which is
// the line this game has held everywhere else.

import { carries } from '../content/kit';
import { hoursToPhase, phaseAt, skyAt } from './dayNight';

/** Where the traveller can spend a night, best first. */
export type Shelter = 'roof' | 'camp' | 'bedroll' | 'none';

/**
 * How the night is spent.
 *
 * `rested` is what the morning is worth; `writes` is whether the diary records anything at all.
 * A roof is a real night's sleep, a camp nearly so, a bedroll on open ground is a poor one, and
 * nothing at all is a night sat up.
 */
export interface NightOutcome {
  shelter: Shelter;
  rested: boolean;
  writes: boolean;
  entry: string;
}

/** Roughly how much of the day is left, 1 at first light and 0 at full dark. */
export function lightLeft(travelledMs: number, startPhase: number, nowMs = 0): number {
  const phase = phaseAt(nowMs + travelledMs, startPhase);
  const dawn = hoursToPhase(6);
  const dusk = hoursToPhase(21);
  // Phase runs 0..1 from first light, so daylight is simply everything before dusk's phase.
  const span = ((dusk - dawn) % 1 + 1) % 1;
  const since = ((phase - dawn) % 1 + 1) % 1;
  if (since >= span) return 0;
  return 1 - since / span;
}

/** Whether it is dark, asked of the sky rather than worked out again here. */
export function isDark(travelledMs: number, startPhase: number, nowMs = 0): boolean {
  return skyAt(phaseAt(nowMs + travelledMs, startPhase)).label === 'night';
}

/**
 * The best shelter available where the traveller is standing.
 *
 * A roof beats a camp beats a bedroll, and the bedroll is always there -- which is the point of
 * carrying one. `none` is reachable only if the kit is somehow empty, and is kept so the outcome
 * for having nothing is written down rather than assumed impossible.
 */
export function shelterAt(underRoof: boolean, atCamp: boolean): Shelter {
  if (underRoof) return 'roof';
  if (atCamp) return 'camp';
  return carries('bedroll') ? 'bedroll' : 'none';
}

/**
 * What a night in that shelter comes to.
 *
 * The entries are Varuna's, and none of them is a warning: nothing bad is going to happen, so a
 * line implying otherwise would be a lie. The worst outcome available is a wasted night described
 * plainly.
 */
export function spendNight(shelter: Shelter): NightOutcome {
  switch (shelter) {
    case 'roof':
      return {
        shelter,
        rested: true,
        writes: true,
        entry: 'A roof, and dry. I wrote up the day properly for once.'
      };
    case 'camp':
      return {
        shelter,
        rested: true,
        writes: true,
        entry: 'Slept at the camp. Somebody had banked the fire before I got there.'
      };
    case 'bedroll':
      return {
        shelter,
        rested: false,
        writes: true,
        entry:
          'Out in the open, on the bedroll. Slept badly and wrote little, and the lamp did not '
          + 'last. It counts as a night, which is the most that can be said for it.'
      };
    default:
      return {
        shelter,
        rested: false,
        writes: false,
        entry: 'Sat it out. Nothing to see and nothing worth writing down.'
      };
  }
}

/**
 * The dusk line for the journal, or null while there is plenty of light.
 *
 * Three bands, and the middle one is the useful one: it names where to go. `whereNext` in
 * `content/journal.ts` already finds the nearest shelter and gives it a bearing, so this says when
 * to care rather than duplicating the search.
 */
export function duskNote(light: number): string | null {
  if (light > 0.3) return null;
  if (light > 0.12) return 'The light is going.';
  if (light > 0) return 'It is nearly dark.';
  return 'It is dark.';
}
