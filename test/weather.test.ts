// Weather, and the ending it was blocking.
//
// The point of this file is the last describe block: canon gates a rung on a clear sky, that
// rung gates a discovery, and that discovery restores the eastern field. Before `weather.ts`
// there was no clear sky because there was no sky, so the chain was dead and nothing said so.

import { describe, expect, it } from 'vitest';
import {
  DELTA_CLIMATE,
  SPELL_HOURS,
  type Climate,
  nextSpells,
  spellAt,
  weatherAt
} from '../src/world/weather';
import { CANON_TIME_OF_DAY, inGameHour, momentAt } from '../src/game/moment';
import { DAY_MS } from '../src/game/dayNight';
import {
  type Progress,
  advance,
  canAdvance,
  emptyProgress,
  isComplete,
  learn,
  restored
} from '../src/journey';
import { discoveries, vocabulary } from '../src/content/knowledge';

/** The full canon weather enum, from `discovery.schema.json`. */
const CANON_WEATHER = ['clear', 'rain', 'storm', 'mist', 'flood', 'full_moon'];
/** The full canon time_of_day enum, from the same place. */
const CANON_TIMES = ['dawn', 'morning', 'afternoon', 'evening', 'night'];

describe('weather', () => {
  it('is the same weather for the same seed and hour', () => {
    for (const hour of [0, 3, 7.5, 26, 100]) {
      expect(weatherAt('lothal', hour)).toBe(weatherAt('lothal', hour));
    }
  });

  it('differs between seeds, or it is not seeded at all', () => {
    const a = Array.from({ length: 40 }, (_, i) => weatherAt('lothal', i * SPELL_HOURS));
    const b = Array.from({ length: 40 }, (_, i) => weatherAt('dwarka', i * SPELL_HOURS));
    expect(a).not.toEqual(b);
  });

  it('holds for a spell and then moves on', () => {
    const spellStart = 9;
    expect(spellAt(spellStart)).toBe(spellAt(spellStart + SPELL_HOURS - 0.01));
    expect(weatherAt('lothal', spellStart)).toBe(weatherAt('lothal', spellStart + SPELL_HOURS - 0.01));
    // Across a full day something has to change, or it is a constant with extra steps.
    const day = Array.from({ length: 24 / SPELL_HOURS }, (_, i) => weatherAt('lothal', i * SPELL_HOURS));
    expect(new Set(day).size).toBeGreaterThan(1);
  });

  it('only ever says things canon can gate on', () => {
    for (let hour = 0; hour < 24 * 30; hour += SPELL_HOURS) {
      expect(CANON_WEATHER).toContain(weatherAt('lothal', hour));
    }
  });

  it('leaves the moon and the flood alone — they are not weather', () => {
    const seen = new Set<string>();
    for (let hour = 0; hour < 24 * 60; hour += SPELL_HOURS) seen.add(weatherAt('lothal', hour));
    expect(seen).not.toContain('full_moon');
    expect(seen).not.toContain('flood');
  });

  it('clears more often than not, because an ending depends on it', () => {
    let clear = 0;
    const spells = 400;
    for (let i = 0; i < spells; i += 1) {
      if (weatherAt('lothal', i * SPELL_HOURS) === 'clear') clear += 1;
    }
    expect(clear / spells).toBeGreaterThan(0.4);
  });

  it('does not depend on the order a climate literal was written in', () => {
    const one: Climate = { clear: 58, mist: 18, rain: 18, storm: 6 };
    const other: Climate = { storm: 6, rain: 18, mist: 18, clear: 58 };
    for (let hour = 0; hour < 120; hour += SPELL_HOURS) {
      expect(weatherAt('lothal', hour, one)).toBe(weatherAt('lothal', hour, other));
    }
  });

  it('honours a climate that rules something out', () => {
    const drought: Climate = { clear: 1 };
    for (let hour = 0; hour < 200; hour += SPELL_HOURS) {
      expect(weatherAt('lothal', hour, drought)).toBe('clear');
    }
  });

  it('can look ahead, so the game can say when to come back', () => {
    const upcoming = nextSpells('lothal', 0, ['clear'], DELTA_CLIMATE, 24);
    expect(upcoming.length).toBeGreaterThan(0);
    for (const hour of upcoming) expect(weatherAt('lothal', hour)).toBe('clear');
  });
});

describe('the moment handed to the ladder', () => {
  it('speaks canon vocabulary, never the sky labels', () => {
    for (let ms = 0; ms < DAY_MS; ms += DAY_MS / 96) {
      const moment = momentAt('lothal', ms);
      expect(CANON_TIMES).toContain(moment.timeOfDay);
      expect(CANON_WEATHER).toContain(moment.weather);
    }
  });

  it('maps every label dayNight can produce', () => {
    // If dayNight gains a label and this map does not, conditions fail silently. Catch it here.
    const produced = new Set<string>();
    for (let ms = 0; ms < DAY_MS; ms += DAY_MS / 288) {
      produced.add(momentAt('lothal', ms).timeOfDay);
    }
    for (const label of produced) expect(CANON_TIMES).toContain(label);
    expect(Object.keys(CANON_TIME_OF_DAY)).toContain('first light');
    expect(Object.keys(CANON_TIME_OF_DAY)).toContain('noon');
  });

  it('counts hours forward across days rather than wrapping', () => {
    expect(inGameHour(0)).toBe(0);
    expect(inGameHour(DAY_MS)).toBeCloseTo(24);
    expect(inGameHour(2 * DAY_MS)).toBeCloseTo(48);
  });

  it('reaches night, so the bloom is findable at all', () => {
    const seen = new Set<string>();
    for (let ms = 0; ms < DAY_MS; ms += DAY_MS / 96) seen.add(momentAt('lothal', ms).timeOfDay);
    expect(seen).toContain('night');
  });
});

/** Play a seed for a while, climbing whatever the sky allows as the hours pass. */
function playThrough(seed: string, days: number, climate: Climate = DELTA_CLIMATE): Progress {
  let p = emptyProgress();
  // Words are taught by people, which is not what this file is testing.
  for (const w of vocabulary) p = learn(p, w.id);

  for (let ms = 0; ms <= days * DAY_MS; ms += DAY_MS / 96) {
    const moment = momentAt(seed, ms, 0, climate);
    for (let settle = 0; settle < discoveries.length; settle += 1) {
      let moved = false;
      for (const d of discoveries) {
        if (canAdvance(p, d.id, moment)) {
          p = advance(p, d.id, moment);
          moved = true;
        }
      }
      if (!moved) break;
    }
  }
  return p;
}

describe('the ending weather was blocking', () => {
  it('lets the poisoned ground be read, given a clear day', () => {
    const p = playThrough('lothal', 2);
    expect(isComplete(p, 'discovery_poisoned_ground')).toBe(true);
  });

  it('carries that through to the field being put back', () => {
    const p = playThrough('lothal', 2);
    expect(isComplete(p, 'discovery_red_rice_survival')).toBe(true);
    expect(restored(p)).toContain('poi_eastern_field');
  });

  it('and the gate is real — under a sky that never clears, the field stays dead', () => {
    // Without this the tests above would pass just as well if conditions were ignored entirely.
    const monsoon: Climate = { rain: 1 };
    const p = playThrough('lothal', 5, monsoon);
    expect(isComplete(p, 'discovery_poisoned_ground')).toBe(false);
    expect(isComplete(p, 'discovery_red_rice_survival')).toBe(false);
    expect(restored(p)).not.toContain('poi_eastern_field');
  });

  it('finishes every ladder in the slice within a couple of days', () => {
    const p = playThrough('lothal', 2);
    for (const d of discoveries) {
      expect(isComplete(p, d.id), `${d.id} never finished under real weather`).toBe(true);
    }
  });
});
