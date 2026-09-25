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
  TEXT,
  choicesUsed,
  kindOf,
  paceFor,
  pickWoven,
  fill,
  slotsIn,
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
            // Half the samples have already met this map's stranger, so the second meeting is
            // reachable too -- it needs one fact from the save and nothing else.
            const met = k % 2 && around.stranger ? [around.stranger.id] : [];
            // And the morning samples have sheltered them, so the chain that needs it is reached too.
            const flags = k === 0 && around.stranger ? [`sheltered:${around.stranger.id}`] : [];
            const c = now(occasion, {
              fieldMapId: map.id,
              shelter: occasion === 'night' ? SHELTERS[k + 1]! : null,
              met,
              flags
            });
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

  it('rations woven events to about one in N on an ordinary day', () => {
    // Measured over many days on one busy tile, with every template able to fire and the last
    // event three days back -- the stretch where the pacer leaves `WOVEN_ONE_IN` exactly as it is.
    // The band is wide because a hash is not a die, but a ration that had stopped working would
    // be at 100%.
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
        const last = { 'woven:dream:elsewhere': day };
        if (happeningNow(now(occasion, { day: day + 3, last }), roll, around, [])) fired += 1;
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

  it('never brings a once-only event round again', () => {
    const { event, around } = sampled.find((s) => s.event.id.startsWith('woven:company:'))!;
    const noon = { ...around, moment: MOMENTS[0]! };
    const later = wovenFor(now('road', { seen: [event.id], last: { [event.id]: 0 }, day: 500 }), noon, () => 0);
    expect(later.map((e) => e.id)).not.toContain(event.id);
  });

  it('brings a storylet round again only after its wait, and a kind only after its cooldown', () => {
    const { event, around } = sampled.find((s) => s.event.id.startsWith('woven:tracks:'))!;
    const ids = (day: number, last: Record<string, number>) =>
      wovenFor(now('road', { seen: [event.id], last, day }), around, () => 0).map((e) => e.id);
    // Tracks: `again_after` 20 for the same animal, `cooldown` 2 for any tracks at all.
    expect(ids(10, { [event.id]: 0 })).not.toContain(event.id);
    expect(ids(20, { [event.id]: 0 })).toContain(event.id);
    expect(ids(21, { [event.id]: 0, 'woven:tracks:another-animal': 20 })).not.toContain(event.id);
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

describe('a stranger remembers you', () => {
  it('meets you as a stranger once, and as somebody known after', () => {
    const { around } = sampled.find((x) => x.around.stranger && x.event.id.startsWith('woven:company:'))!;
    const noon = { ...around, moment: MOMENTS[0]! };
    const ids = (met: string[]) => wovenFor(now('road', { met }), noon, () => 0).map((e) => e.id.split(':')[1]);
    expect(ids([])).toContain('company');
    expect(ids([])).not.toContain('company-again');
    expect(ids([noon.stranger!.id])).toContain('company-again');
    expect(ids([noon.stranger!.id])).not.toContain('company');
  });

  it('counts the carrier on one map as a different person from the carrier on another', () => {
    const ids = new Set(sampled.filter((x) => x.around.stranger).map((x) => x.around.stranger!.id));
    const carriers = [...ids].filter((id) => id.endsWith(':company_carrier'));
    expect(carriers.length, 'a carrier walks every map').toBe(fieldMaps.length);
  });
});

describe('the words live in data, and the data matches the code', () => {
  const strings = (value: unknown): string[] =>
    typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];

  it('has words for every template the code has, and no template the code lacks', () => {
    const code = Object.values(TEMPLATES).flat().map((t) => t.kind).sort();
    expect(Object.keys(TEXT).sort()).toEqual(code);
  });

  it('uses only the slots each template declares', () => {
    const bad: string[] = [];
    for (const [kind, words] of Object.entries(TEXT)) {
      for (const text of strings([words.title, words.prose, words.choices])) {
        for (const slot of slotsIn(text)) if (!words.slots.includes(slot)) bad.push(`${kind}: {${slot}}`);
      }
    }
    expect(bad, 'a slot the template never fills would print as a hole').toEqual([]);
  });

  it('offers every choice the words file has, somewhere on the real maps', () => {
    // `sampled` above has built every template across the four maps, so every choice the code can
    // offer has been offered. One the file has and nothing offers is dead text.
    expect(sampled.length).toBeGreaterThan(0);
    const unused = Object.entries(TEXT).flatMap(([kind, words]) =>
      Object.keys(words.choices).filter((id) => !choicesUsed().has(`${kind}.${id}`)).map((id) => `${kind}.${id}`)
    );
    expect(unused).toEqual([]);
  });

  it('leaves an unfilled slot visible rather than swallowing it', () => {
    expect(fill('under the {plant}', {})).toBe('under the {plant}');
    expect(fill('{count} stones', { count: 12 })).toBe('12 stones');
  });
});

describe('strangers have names, and you learn them', () => {
  it('tells you their canon name in whichever choice you make at the first meeting', () => {
    const first = sampled.filter((x) => x.event.id.startsWith('woven:company:') || x.event.id.startsWith('woven:knock:'));
    expect(first.length).toBeGreaterThan(0);
    for (const { event } of first) {
      const name = event.stranger!.givenName;
      expect(name, `${event.id} has no name`).toBeTruthy();
      // Not in the prose -- you do not know it yet -- and in every line, because any choice is how
      // you come to know it.
      expect(event.prose).not.toContain(name!);
      for (const choice of event.choices) expect(choice.line, `${event.id}/${choice.id}`).toContain(name!);
    }
  });

  it('greets you by that name the second time', () => {
    const again = sampled.filter((x) => x.event.id.startsWith('woven:company-again:'));
    expect(again.length).toBeGreaterThan(0);
    for (const { event } of again) expect(event.prose.startsWith(event.stranger!.givenName!)).toBe(true);
  });
});

describe('the inspector', () => {
  it('opens a named template on demand, ration and all', () => {
    const { around } = sampled.find((x) => x.event.id.startsWith('woven:dream:'))!;
    // A roll that the ration would always refuse.
    const refuse: Roll = () => 9_999;
    expect(happeningNow(now('night', { shelter: 'roof' }), refuse, around, [])).toBeNull();
    const forced = happeningNow(now('night', { shelter: 'roof' }), refuse, around, [], { kind: 'dream' });
    expect(forced?.id.startsWith('woven:dream:')).toBe(true);
  });
});

describe('the pacer', () => {
  it('is quieter the day after something, and leans in after a long quiet', () => {
    const at = (quiet: number) => paceFor({ day: 100, last: { 'woven:dream:x': 100 - quiet } });
    expect(at(0)).toBeLessThan(at(1));
    expect(at(1)).toBeLessThan(at(3));
    expect(at(3)).toBe(1);
    expect(at(6)).toBeGreaterThan(at(3));
    expect(at(30)).toBeGreaterThanOrEqual(at(6));
    // A fresh journey is an ordinary day. It was the long gap first, which made the very first
    // arrival the likeliest moment for a card -- and a browser spec walking into a place met one.
    expect(paceFor({ day: 0, last: {} })).toBe(1);
    // An authored event in the record is not the road's rhythm.
    expect(paceFor({ day: 100, last: { event_written: 100 } })).toBe(1);
  });

  it('leaves the first day to the place', () => {
    const { around } = sampled.find((x) => x.event.id.startsWith('woven:dream:'))!;
    const always: Roll = () => 0;
    expect(happeningNow(now('night', { day: 0 }), always, around, [])).toBeNull();
    expect(happeningNow(now('night', { day: 1 }), always, around, [])).not.toBeNull();
    // The inspector is not held back: it is how a card is opened on purpose.
    expect(happeningNow(now('night', { day: 0 }), always, around, [], { kind: 'dream' })).not.toBeNull();
  });

  it('favours a kind unlike whatever happened in the last few days', () => {
    const { around } = sampled.find((x) => x.event.id.startsWith('woven:tracks:'))!;
    const noon = { ...around, moment: MOMENTS[1]! };
    let animal = 0;
    let animalAfterAnimal = 0;
    for (let day = 10; day < 410; day += 1) {
      const roll = rollAt('pacer', { x: day, y: 1 }, 'x');
      const fresh = now('road', { day });
      const tired = now('road', { day, last: { 'woven:night-sounds:owl': day - 1 } });
      const a = wovenFor(fresh, noon, roll);
      const b = wovenFor(tired, noon, roll);
      if (a.length < 2) continue;
      if (kindOf(pickWoven(a, fresh, roll)!.id) === 'tracks') animal += 1;
      if (kindOf(pickWoven(b, tired, roll)!.id) === 'tracks') animalAfterAnimal += 1;
    }
    expect(animal, 'tracks never picked at all').toBeGreaterThan(0);
    expect(animalAfterAnimal, `${animalAfterAnimal} after an animal, ${animal} otherwise`).toBeLessThan(animal * 0.75);
  });
});

describe('one event leads to another', () => {
  it('shelters a stranger at night, and meets them with a gift on the road', () => {
    const knock = sampled.find((x) => x.event.id.startsWith('woven:knock:'))!;
    const room = knock.event.choices.find((c) => c.id === 'room')!;
    expect(room.sets).toEqual([`sheltered:${knock.event.stranger!.id}`]);

    const noon = { ...knock.around, moment: MOMENTS[0]! };
    const road = (flags: string[]) => wovenFor(now('road', { flags }), noon, () => 0, 'kindness-returned');
    expect(road([]), 'the gift came without the kindness').toEqual([]);
    const [gift] = road(room.sets!);
    expect(gift, 'the kindness was never returned').toBeTruthy();
    const accept = gift!.choices.find((c) => c.id === 'accept')!;
    expect(accept.gives?.length).toBe(1);
    expect(material(accept.gives![0]!.id), 'the gift is not a canon material').not.toBeNull();
  });

  it('gives each people something of their own, from canon', () => {
    for (const [people, id] of Object.entries(TEXT['kindness-returned']!.gifts ?? {})) {
      expect(material(id), `${people} gives ${id}`).not.toBeNull();
    }
  });
});
