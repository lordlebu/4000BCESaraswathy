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
import { NIGHT_RESTORES } from '../content/tiers';
import { hoursToPhase, phaseAt, skyAt } from './dayNight';

/**
 * Where the traveller can spend a night, best first.
 *
 * **Five rungs, and the top one is not a palace.** The obvious ladder ends at one, and it is the
 * wrong word twice over. Canon holds no palace -- the grandest roofed places in the game are a
 * university, a market and a rail-head -- and the setting is the reason: the Indus cities are
 * distinguished from their Mesopotamian and Egyptian contemporaries precisely by what excavation
 * has *not* turned up, with no structure clearly identifiable as a royal palace at any major site.
 * What they have instead is communal: baths, granaries, warehouses, assembly halls.
 *
 * So the best night is a **hall** -- a roof somebody built for everybody -- rather than a room
 * somebody built for himself. That is truer to the ground this game is standing on, and it is
 * where the endgame is going: the ending is settling into a settlement and building for it.
 *
 * **Every rung is reachable, and that was the constraint that shaped the order.** The obvious
 * reading puts a hall above a roof by making it a roofed settlement -- and no settlement in canon
 * has sub-locations, so that rung would have been unreachable on every map. This repository has
 * shipped that fault before: `lava_field` had a painted tile, 31 species and a `renderable: true`,
 * and the generator produced zero tiles of it on every seed.
 *
 * So the ladder is cut where canon already cuts: six settlements, three travel nodes, four roofed
 * places. A settlement outranks a roofed ruin because it has **people** in it, and somebody there
 * has a roof and will share it. A ruin you can get inside outranks a fire ring, because a roof is
 * a roof. `test/night.test.ts` asserts every rung is produced by some real place.
 */
export type Shelter = 'hall' | 'roof' | 'camp' | 'tent' | 'bedroll' | 'none';

/** Best first, which is the order `shelterAt` resolves in and the order a panel should list. */
export const SHELTER_ORDER: readonly Shelter[] = ['hall', 'roof', 'camp', 'tent', 'bedroll', 'none'];

/**
 * How the night is spent.
 *
 * `rested` is what the morning is worth; `writes` is whether the diary records anything at all.
 * A roof is a real night's sleep, a camp nearly so, a bedroll on open ground is a poor one, and
 * nothing at all is a night sat up.
 */
export interface NightOutcome {
  shelter: Shelter;
  /**
   * How much of the tiredness the night clears, from 0 to 1.
   *
   * The scale that replaced the boolean below. Handed to the same easing the scene uses for a
   * physic, so there is one way tiredness comes off and not two.
   */
  restores: number;
  /**
   * Whether the night counts as a real sleep.
   *
   * **Kept alongside `restores`, and it is not redundant.** It is the *diary's* question rather
   * than the body's -- `night-passed` carries it and the journal words itself differently -- and a
   * bedroll answers it no while still clearing a third of the walking. Derived here rather than
   * from a threshold on `restores`, so nobody has to guess where the line is.
   */
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
export interface Ground {
  /** Standing in a settlement: people, walls, and somebody who will share a roof. */
  inSettlement?: boolean;
  /** A place canon gave sub-locations to -- somewhere you can get inside. */
  underRoof?: boolean;
  /** A travel node: a fire ring, and nobody. */
  atCamp?: boolean;
  /** What the traveller has pitched, from `using.shelterBuilt`. */
  built?: 'tent' | null;
}

/**
 * The best night available where the traveller is standing.
 *
 * Ranked rather than chosen: the caller says what the ground *is* and this file decides what that
 * is worth, so the ordering lives in one place and a panel cannot disagree with the diary about
 * which night somebody had.
 *
 * **An options object rather than four positional booleans**, which is what this was growing into.
 * Four bare `true`s at a call site is unreadable and the kind of thing that gets transposed
 * silently -- and a transposition here would swap a village for a ruin without failing anything.
 *
 * The tent ranks **below a camp** on purpose. A hide tent is a good night in the open, not a
 * village -- if it matched the best available nobody would walk to a settlement at dusk, and the
 * night mechanic is older and better than this one. What it buys is that open ground stops being a
 * bad night, which is the whole complaint it answers.
 */
export function shelterAt(ground: Ground = {}): Shelter {
  if (ground.inSettlement) return 'hall';
  if (ground.underRoof) return 'roof';
  if (ground.atCamp) return 'camp';
  if (ground.built === 'tent') return 'tent';
  return carries('bedroll') ? 'bedroll' : 'none';
}

/**
 * How much of the walking this night takes back, from 0 to 1.
 *
 * A fraction rather than the old `rested` boolean, because five rungs cannot be said with two
 * values. The numbers live in `tiers.ts` with every other pacing judgement; this is the lookup, and
 * an unknown shelter is worth nothing rather than everything -- the safe direction for a value
 * that has come from somewhere unexpected.
 */
export function nightRestores(shelter: Shelter): number {
  return NIGHT_RESTORES[shelter] ?? 0;
}

/**
 * What a night in that shelter comes to.
 *
 * The entries are Varuna's, and none of them is a warning: nothing bad is going to happen, so a
 * line implying otherwise would be a lie. The worst outcome available is a wasted night described
 * plainly.
 */
export function spendNight(shelter: Shelter): NightOutcome {
  const restores = nightRestores(shelter);
  switch (shelter) {
    case 'hall':
      return {
        shelter,
        restores,
        rested: true,
        writes: true,
        entry:
          'Slept in the town, and somebody fed me before I could refuse. I wrote up three days '
          + 'properly and slept after, which is the wrong way round and the best night I have had.'
      };
    case 'roof':
      return {
        shelter,
        restores,
        rested: true,
        writes: true,
        // A roofed ruin rather than a house: this rung is the four places canon gave sub-locations
      // to, and nobody lives in any of them.
      entry: 'Got in out of it, under somebody else\u2019s stonework. Dry, and I wrote the day up properly for once.'
      };
    case 'camp':
      return {
        shelter,
        restores,
        rested: true,
        writes: true,
        entry: 'Slept at the camp. Somebody had banked the fire before I got there.'
      };
    case 'tent':
      return {
        shelter,
        restores,
        rested: true,
        writes: true,
        // The one night in this list the player made rather than found, and the entry says so --
        // this is the only place the crafting tree shows up in the diary as something felt.
        entry:
          'Pitched the tent while there was still light, and it held. Not a roof, but the rain '
          + 'stayed outside it and I slept through.'
      };
    case 'bedroll':
      return {
        shelter,
        restores,
        rested: false,
        writes: true,
        entry:
          'Out in the open, on the bedroll. Slept badly and wrote little, and the lamp did not '
          + 'last. It counts as a night, which is the most that can be said for it.'
      };
    default:
      return {
        shelter,
        restores,
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
