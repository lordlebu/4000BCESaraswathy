// Weather, derived from the seed like everything else in `world/`.
//
// Canon gates some rungs on the world cooperating: the salt crust on the eastern field only
// reads in dry light, and the silver bloom shows on a still night. Until now the game had no
// weather at all -- the word appeared exactly once in `src/`, inside a comment -- so every
// weather-gated rung was unreachable. That was not a cosmetic gap. `discovery_poisoned_ground`
// stalls at rung 2 without a clear day, which blocks `discovery_red_rice_survival`, which is
// what restores the eastern field and helps Bekh. Two authored rungs stranded an ending.
//
// Deterministic and seed-derived, so the same seed gives the same weather at the same hour for
// every player. Lothal is a documented island; its weather is documented too.
//
// Free of React and Phaser, and free of the clock as well: this takes an hour count rather than
// a timestamp, so it owes nothing to `game/dayNight.ts` and the layering stays one-way.

import { tileHash } from './rng';

/**
 * What the sky can be doing.
 *
 * Canon's schema allows six values. Two of them are not weather and are deliberately not
 * generated here: `full_moon` is a phase of the moon and `flood` is a state of the land. Both
 * would need their own model -- a lunar cycle and a river simulation -- and faking them out of
 * a weather roll would make `question_silver_water`'s moon reading true by coincidence, which
 * is precisely the thing that question is about.
 */
export type Weather = 'clear' | 'mist' | 'rain' | 'storm';

/**
 * Iterated in this fixed order when rolling.
 *
 * Not `Object.keys(climate)` -- that would make the result depend on the order someone happened
 * to write the keys in a climate literal, and two climates with identical weights would then
 * produce different weather. Determinism has to survive editing.
 */
const ROLL_ORDER: readonly Weather[] = ['clear', 'mist', 'rain', 'storm'];

/**
 * How long the sky holds. Three in-game hours, which is seven and a half real minutes against
 * the hour-long day in `dayNight.ts`.
 *
 * Short enough that a player waiting for a clear sky is not waiting for a whole day, long
 * enough that weather reads as weather rather than as flicker. It is the tuning knob most
 * likely to want changing after playtesting.
 */
export const SPELL_HOURS = 3;

/** Relative likelihood per spell. Weights are arbitrary units, not percentages. */
export type Climate = Partial<Record<Weather, number>>;

/**
 * The delta: wet, but clear more often than not.
 *
 * `clear` is deliberately the plurality. It is the only weather the ending chain depends on,
 * and a player who cannot finish the eastern field because the sky kept refusing has been
 * failed by the game rather than challenged by it.
 */
export const DELTA_CLIMATE: Climate = { clear: 58, mist: 18, rain: 18, storm: 6 };

/** Which spell an hour falls in. Spells are absolute, so they continue across days. */
export function spellAt(inGameHour: number): number {
  return Math.floor(inGameHour / SPELL_HOURS);
}

/**
 * The weather at an hour.
 *
 * Each spell is rolled independently: today's rain does not make tomorrow's rain likelier.
 * Real weather clumps, and adding persistence would be a small change here, but it would also
 * lengthen the worst-case wait for a clear sky -- so it is left out until something other than
 * realism asks for it.
 */
export function weatherAt(seed: string, inGameHour: number, climate: Climate = DELTA_CLIMATE): Weather {
  const weighted = ROLL_ORDER.map((w) => [w, climate[w] ?? 0] as const).filter(([, n]) => n > 0);
  const total = weighted.reduce((sum, [, n]) => sum + n, 0);
  if (total <= 0) return 'clear';

  let roll = tileHash(seed, spellAt(inGameHour), 0, 'weather') % total;
  for (const [weather, weight] of weighted) {
    roll -= weight;
    if (roll < 0) return weather;
  }
  return weighted[weighted.length - 1]![0];
}

/**
 * Every hour in the next `hours` at which the weather is one of `wanted`.
 *
 * For telling a player when to come back. A rung that wants a clear sky should be answerable
 * with "the sky clears around dawn" rather than "conditions not met", and that needs the
 * engine to be able to look ahead rather than only report now.
 */
export function nextSpells(
  seed: string,
  fromHour: number,
  wanted: readonly string[],
  climate: Climate = DELTA_CLIMATE,
  hours = 24
): number[] {
  const out: number[] = [];
  const first = spellAt(fromHour);
  const last = spellAt(fromHour + hours);
  for (let spell = first; spell <= last; spell += 1) {
    const at = spell * SPELL_HOURS;
    if (wanted.includes(weatherAt(seed, at, climate))) out.push(at);
  }
  return out;
}
