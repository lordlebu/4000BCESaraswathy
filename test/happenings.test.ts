// Events woven from what is here.
//
// The rules first, with the real maps rather than fixtures wherever a map can answer -- a template
// that reads fine against a hand-built tile and never fires on any real one is this codebase's
// signature fault, and the last describe block exists to catch exactly that.

import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { tileHash } from '../src/world/rng';
import type { Point } from '../src/world/types';
import { anyConditions, choicesFor, type Circumstance, type GameEvent, type Occasion } from '../src/content/events';
import {
  TEMPLATES,
  happeningNow,
  surroundingsAt,
  wovenFor,
  type Roll,
  type Surroundings
} from '../src/content/happenings';
import { material } from '../src/content/making';
import { fieldMap, fieldMaps } from '../src/content/places';
import { WOVEN_ONE_IN } from '../src/content/tiers';
import { DEFAULT_SEED } from '../src/ui/seed';

const OCCASIONS: Occasion[] = ['road', 'night', 'arriving', 'working'];
const SHELTERS = ['bedroll', 'tent', 'camp', 'roof', 'settlement', 'palace'];
const MOMENTS = [
  { timeOfDay: 'morning', weather: 'clear' },
  { timeOfDay: 'afternoon', weather: 'rain' },
  { timeOfDay: 'evening', weather: 'mist' },
  { timeOfDay: 'night', weather: 'storm' }
];

const now = (occasion: Occasion, over: Partial<Circumstance> = {}): Circumstance => ({
  occasion,
  shelter: occasion === 'night' ? 'roof' : null,
  fieldMapId: 'field_map_lothal',
  day: 3,
  holds: [],
  seen: [],
  ...over
});

const rollAt = (seed: string, at: Point, salt: string): Roll => (s) => tileHash(seed, at.x, at.y, `${salt}:${s}`);

/**
 * Every woven event the four maps can make, sampled over a spread of tiles, hours, skies and
 * shelters. Built once: it walks every map and the assertions below all read it.
 */
const sampled: { event: GameEvent; around: Surroundings }[] = (() => {
  const out: { event: GameEvent; around: Surroundings }[] = [];
  for (const map of fieldMaps) {
    const built = buildFieldMap(fieldMap(map.id)!, { seed: DEFAULT_SEED });
    const { world } = built;
    const step = Math.max(3, Math.floor(world.width / 12));
    for (let y = 1; y < world.height; y += step) {
      for (let x = 1; x < world.width; x += step) {
        const at = { x, y };
        MOMENTS.forEach((moment, k) => {
          for (const occasion of OCCASIONS) {
            const roll = rollAt(world.seed, at, `${occasion}:${k}`);
            const poiId = occasion === 'arriving' ? built.placed[(x + y) % built.placed.length]?.poi.id : null;
            const around = surroundingsAt(world, at, map.id, moment, roll, { poiId });
            if (!around) continue;
            const c = now(occasion, { fieldMapId: map.id, shelter: occasion === 'night' ? SHELTERS[k + 1]! : null });
            for (const event of wovenFor(c, around, roll)) out.push({ event, around });
          }
        });
      }
    }
  }
  return out;
})();

describe('the three rulings', () => {
  it('never grants knowledge: words and discoveries are canon’s to hand over', () => {
    for (const { event } of sampled) {
      for (const choice of event.choices) {
        expect(choice.grants, `${event.id}/${choice.id} grants something`).toEqual([]);
      }
    }
  });

  it('offers every choice, and never a choice that needs something', () => {
    for (const { event } of sampled) {
      expect(event.choices.length, `${event.id} has no way out`).toBeGreaterThanOrEqual(2);
      expect(choicesFor(event, [])).toEqual(event.choices);
    }
  });

  it('gives only materials that exist, one at a time', () => {
    for (const { event } of sampled) {
      for (const choice of event.choices) {
        for (const g of choice.gives ?? []) {
          expect(material(g.id), `${event.id} gives ${g.id}, which is not a material`).not.toBeNull();
          expect(g.n).toBe(1);
        }
      }
    }
  });

  it('rations woven events to about one in N', () => {
    // Measured over many days on one busy tile, with every template able to fire. The band is wide
    // because a hash is not a die, but a ration that had stopped working would be at 100%.
    const built = buildFieldMap(fieldMap('field_map_lothal')!, { seed: DEFAULT_SEED });
    const at = built.placed[0]!.at;
    for (const occasion of OCCASIONS) {
      let fired = 0;
      const days = 600;
      for (let day = 0; day < days; day += 1) {
        const roll = rollAt(built.world.seed, at, `${occasion}:${day}`);
        const around = surroundingsAt(built.world, at, 'field_map_lothal', MOMENTS[1]!, roll, {
          poiId: built.placed[0]!.poi.id
        });
        if (happeningNow(now(occasion, { day }), roll, around, [])) fired += 1;
      }
      const expected = 1 / WOVEN_ONE_IN[occasion];
      expect(fired / days, `${occasion} fired ${fired} of ${days}`).toBeGreaterThan(expected * 0.6);
      expect(fired / days, `${occasion} fired ${fired} of ${days}`).toBeLessThan(expected * 1.4);
    }
  });
});

describe('it behaves like an event', () => {
  it('writes no holes into the prose', () => {
    for (const { event } of sampled) {
      const text = [event.title, event.prose, ...event.choices.flatMap((c) => [c.label, c.line])].join(' ');
      expect(text, event.id).not.toMatch(/undefined|null|NaN|\[object|\$\{/);
    }
  });

  it('is the same event for the same tile, day and moment', () => {
    const built = buildFieldMap(fieldMap('field_map_narmada')!, { seed: DEFAULT_SEED });
    const at = built.placed[1]!.at;
    const ask = () => {
      const roll = rollAt(built.world.seed, at, 'road:9');
      return happeningNow(now('road', { day: 9, fieldMapId: 'field_map_narmada' }), roll,
        surroundingsAt(built.world, at, 'field_map_narmada', MOMENTS[2]!, roll), []);
    };
    expect(ask()).toEqual(ask());
  });

  it('lets an authored event win whenever one can happen', () => {
    const authored: GameEvent = {
      id: 'event_written',
      title: 'Written',
      occasion: 'road',
      conditions: anyConditions(),
      prose: 'Somebody wrote this.',
      art: 'event_written',
      choices: [{ id: 'go', label: 'Go on', needs: [], line: 'On.', grants: [] }],
      once: true
    };
    const built = buildFieldMap(fieldMap('field_map_lothal')!, { seed: DEFAULT_SEED });
    for (let day = 0; day < 20; day += 1) {
      const at = built.placed[0]!.at;
      const roll = rollAt(built.world.seed, at, `road:${day}`);
      const around = surroundingsAt(built.world, at, 'field_map_lothal', MOMENTS[1]!, roll);
      expect(happeningNow(now('road', { day }), roll, around, [authored])?.id).toBe('event_written');
    }
  });

  it('does not come round again once seen', () => {
    const { event, around } = sampled.find((s) => s.event.occasion === 'road')!;
    const roll: Roll = () => 0;
    const again = wovenFor(now('road', { seen: [event.id] }), around, roll);
    expect(again.map((e) => e.id)).not.toContain(event.id);
  });

  it('does nothing without a world, exactly as before it existed', () => {
    expect(happeningNow(now('night'), () => 0, null, [])).toBeNull();
  });

  it('only meets road company by day, when the map has them on the road', () => {
    for (const { event, around } of sampled) {
      if (!event.id.startsWith('woven:company:')) continue;
      expect(['morning', 'afternoon']).toContain(around.moment?.timeOfDay);
      expect(event.stranger?.look).toBeTruthy();
    }
  });
});

describe('every template happens somewhere', () => {
  /**
   * **The guard against a template nobody ever meets.** A rule for when the holes can be filled
   * that is too strict for any real tile compiles, tests clean against a fixture and never fires --
   * which is how `lava_field` had art, species and a biome entry and zero tiles on every seed.
   */
  it('fires every template on at least one real map', () => {
    const kinds = new Set(sampled.map(({ event }) => event.id.split(':')[1]));
    const expected = Object.values(TEMPLATES).flat().length;
    expect(kinds.size, `only these fired: ${[...kinds].sort().join(', ')}`).toBe(expected);
  });
});
