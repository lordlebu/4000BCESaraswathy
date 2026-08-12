// What the world is doing right now, in the words canon uses for it.
//
// `journey.ts` asks whether a rung is reachable and takes a `WorldMoment` to answer with. This
// is the only thing that builds one, and it exists because the two halves come from different
// places: the hour from `dayNight.ts`, the sky from `world/weather.ts`.
//
// It sits in `game/` rather than `world/` because `dayNight.ts` owns the clock and lives here.
// The dependency runs game -> world, which is the right way round; nothing in `world/` imports
// this. Neither file touches Phaser, so this is testable under plain Node like the rest.

import { DAY_MS, phaseAt, skyAt } from './dayNight';
import { type Climate, DELTA_CLIMATE, weatherAt } from '../world/weather';
import type { WorldMoment } from '../journey';

/**
 * Engine sky labels to canon's `time_of_day` vocabulary.
 *
 * These are two different vocabularies and the mismatch is silent, which is why the mapping is
 * written out rather than inferred. `dayNight.ts` labels the sky for the journal, so it says
 * `first light` and `noon`; canon's schema enumerates `dawn | morning | afternoon | evening |
 * night` and has never heard of either. Passing a raw sky label into a condition check matches
 * nothing, fails quietly, and looks exactly like a content bug.
 *
 * `noon` folds into `afternoon` because canon has no midday: the enum jumps morning to
 * afternoon, so the middle of the day has to land on one of them, and the salt-crust readings
 * that want dry light want it high rather than early.
 */
const CANON_TIME_OF_DAY: Record<string, string> = {
  'first light': 'dawn',
  morning: 'morning',
  noon: 'afternoon',
  afternoon: 'afternoon',
  evening: 'evening',
  night: 'night'
};

/**
 * The absolute in-game hour, counting up from the start of the journey.
 *
 * Monotonic rather than wrapped at 24, so weather spells continue across days instead of
 * repeating every morning. `startPhase` is the `?hour=` offset, so two players who set the same
 * hour get the same sky.
 */
export function inGameHour(elapsedMs: number, startPhase = 0): number {
  return (startPhase + elapsedMs / DAY_MS) * 24;
}

/**
 * The moment to hand `canAdvance`, `blockedBy` and `advance`.
 *
 * Always returns canon vocabulary. If a sky label ever appears that the map above does not
 * cover, it passes through unmapped -- a condition that silently never fires is worse than one
 * that visibly never fires, and an unmapped label will show up the first time anyone looks.
 */
export function momentAt(
  seed: string,
  elapsedMs: number,
  startPhase = 0,
  climate: Climate = DELTA_CLIMATE
): WorldMoment {
  const label = skyAt(phaseAt(elapsedMs, startPhase)).label;
  return {
    timeOfDay: CANON_TIME_OF_DAY[label] ?? label,
    weather: weatherAt(seed, inGameHour(elapsedMs, startPhase), climate)
  };
}

export { CANON_TIME_OF_DAY };
