// The event framework, and the written happenings canon now fills it with.
//
// **The rules are driven with fixtures, not with canon's content.** They were written while the
// registry was empty, against the shape the first authored event would be written to -- if
// `canHappen` has the wrong idea about a condition, nobody finds out until somebody has written a
// dream and it never fires, and they blame the dream. Three things: conditions narrow, an event can
// never leave a player stuck in a scene, and choosing is seeded rather than random.
//
// The registry itself is canon's now (`happening_` entities, exported in `places.json`), and the
// last block holds the adapter to what canon actually ships.

import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import {
  type Circumstance,
  type GameEvent,
  anyConditions,
  canHappen,
  choicesFor,
  eventNow,
  events,
  eventsFor
} from '../src/content/events';
import { fieldMap, poi } from '../src/content/places';
import knowledgeBundle from '../data/canon/knowledge.json';
import craftingBundle from '../data/canon/crafting.json';

const { idFor, KINDS } = createRequire(import.meta.url)('../tools/build-plates.js') as {
  idFor: (file: string, word?: string, keepUnderscores?: boolean) => string;
  KINDS: { event: { word: string; keepUnderscores?: boolean } };
};

const event = (over: Partial<GameEvent> = {}): GameEvent => ({
  id: 'event_test',
  title: 'A test',
  occasion: 'night',
  conditions: anyConditions(),
  prose: 'Something happened.',
  art: 'event_test',
  choices: [{ id: 'go', label: 'Go on', needs: [], line: 'You went on.', grants: [] }],
  once: true,
  ...over
});

const tonight = (over: Partial<Circumstance> = {}): Circumstance => ({
  occasion: 'night',
  shelter: 'bedroll',
  fieldMapId: 'field_map_lothal',
  day: 0,
  holds: [],
  seen: [],
  ...over
});

const roll = (salt: string) => salt.length;

describe('the registry', () => {
  /**
   * **Nothing is also a real answer, and the framework has to survive it.** Most nights nothing
   * written can happen: a fresh journey holds nothing a written dream asks for. A framework that
   * threw or returned something here would be a regression nobody found until the night after it
   * shipped.
   */
  it('answers nothing when nothing written can happen', () => {
    expect(eventsFor(tonight())).toEqual([]);
    expect(eventNow(tonight(), roll)).toBeNull();
    expect(eventNow(tonight(), roll, [])).toBeNull();
  });
});

describe("canon's happenings", () => {
  const knowledge = knowledgeBundle as {
    discoveries: { id: string }[];
    field_questions: { id: string }[];
    vocabulary: { id: string }[];
  };
  const crafting = craftingBundle as { recipes: { id: string }[] };
  const grantable = new Set([
    ...knowledge.discoveries.map((d) => d.id),
    ...knowledge.field_questions.map((q) => q.id),
    ...knowledge.vocabulary.map((w) => w.id),
    ...crafting.recipes.map((r) => r.id)
  ]);

  it('come from the bundle, one event each, and happen once', () => {
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) {
      expect(e.id).toMatch(/^happening_[a-z0-9_]+$/);
      expect(e.once).toBe(true);
      expect(e.art).toBe(e.id);
      expect(e.prose.length).toBeGreaterThan(0);
      expect(e.choices.length).toBeGreaterThan(0);
    }
  });

  /**
   * **Canon never says which day, nor what kind of night.** Those are play, and the game's -- the
   * same line `renews` draws. An adapter that read either would be canon tracking the game's clock.
   */
  it('never carry a day or a shelter', () => {
    for (const e of events) {
      expect(e.conditions.fromDay).toBe(0);
      expect(e.conditions.shelter).toEqual([]);
    }
  });

  /**
   * The seam to the story. A written happening grants what a line grants, through the same door, so
   * every grant has to be something `journey.receiveAll` knows how to hold.
   */
  it('grant only what a line may grant, and all of it exists', () => {
    for (const e of events) {
      for (const c of e.choices) {
        for (const g of c.grants) expect(grantable, `${e.id} grants ${g}`).toContain(g);
      }
    }
  });

  it('name only maps and points that exist, and every point is on its maps', () => {
    for (const e of events) {
      for (const m of e.conditions.fieldMaps) expect(fieldMap(m), `${e.id}: ${m}`).not.toBeNull();
      for (const p of e.conditions.pois) {
        const at = poi(p);
        expect(at, `${e.id}: ${p}`).not.toBeNull();
        if (e.conditions.fieldMaps.length > 0) expect(e.conditions.fieldMaps).toContain(at!.fieldMap);
        expect(e.occasion).toBe('arriving');
      }
    }
  });

  /**
   * **An arrival at one point is not an arrival at its neighbour.** Found by writing the first one:
   * `Conditions` had maps and no points, so *Where you stop* would have happened on reaching any
   * point of North Dwarka.
   */
  it('narrow an arrival to its point', () => {
    const stop = events.find((e) => e.conditions.pois.length > 0);
    expect(stop).toBeDefined();
    const arriving = (poiId: string | null): Circumstance =>
      tonight({ occasion: 'arriving', shelter: null, fieldMapId: stop!.conditions.fieldMaps[0]!, poiId });
    const at = stop!.conditions.pois[0]!;
    expect(canHappen(stop!, arriving(at))).toBe(true);
    expect(canHappen(stop!, arriving('poi_somewhere_else'))).toBe(false);
    expect(canHappen(stop!, arriving(null))).toBe(false);
  });

  /**
   * **A painting saved under the event's name builds under the event's name.** The card looks its
   * art up by `art`, which is the canon id, underscores and all; the builder used to hyphenate every
   * event painting, so `happening_tower_standing.png` would have built as a picture nothing draws.
   */
  it('keep their painting names through the builder', () => {
    const built = (file: string) => idFor(file, KINDS.event.word, KINDS.event.keepUnderscores);
    for (const e of events) expect(built(`${e.art}.png`)).toBe(e.art);
    expect(built('ChatGPT happening_where_you_stop.png')).toBe('happening_where_you_stop');
    expect(built('woven-dream.png')).toBe('woven-dream');
  });

  it('wait for what they require to have been seen', () => {
    const gated = events.find((e) => e.conditions.requires.length > 0);
    expect(gated).toBeDefined();
    const now = tonight({
      occasion: gated!.occasion,
      shelter: null,
      fieldMapId: gated!.conditions.fieldMaps[0] ?? 'field_map_lothal'
    });
    expect(canHappen(gated!, now)).toBe(false);
    expect(canHappen(gated!, { ...now, holds: gated!.conditions.requires })).toBe(true);
  });
});

describe('when an event can happen', () => {
  it('only on its own occasion', () => {
    expect(canHappen(event({ occasion: 'night' }), tonight())).toBe(true);
    expect(canHappen(event({ occasion: 'road' }), tonight())).toBe(false);
  });

  /**
   * **The axis the flat rest table left open.** Six kinds of night exist and every one of them
   * restores the same, because the interesting thing about sleeping in a town rather than the woods
   * is not a percentage -- it is what can happen to you there. This is that.
   */
  it('narrows a night by the kind of place it was spent in', () => {
    const inTown = event({ conditions: anyConditions({ shelter: ['settlement', 'palace'] }) });
    expect(canHappen(inTown, tonight({ shelter: 'settlement' }))).toBe(true);
    expect(canHappen(inTown, tonight({ shelter: 'bedroll' }))).toBe(false);
    // An empty list means anywhere you can sleep, which is the common case and the default.
    expect(canHappen(event(), tonight({ shelter: 'palace' }))).toBe(true);
  });

  it('narrows by map, by day and by what the player holds', () => {
    const late = event({ conditions: anyConditions({ fromDay: 3 }) });
    expect(canHappen(late, tonight({ day: 2 }))).toBe(false);
    expect(canHappen(late, tonight({ day: 3 }))).toBe(true);

    const here = event({ conditions: anyConditions({ fieldMaps: ['field_map_narmada'] }) });
    expect(canHappen(here, tonight())).toBe(false);
    expect(canHappen(here, tonight({ fieldMapId: 'field_map_narmada' }))).toBe(true);

    const gated = event({ conditions: anyConditions({ requires: ['word_saraswati'] }) });
    expect(canHappen(gated, tonight())).toBe(false);
    expect(canHappen(gated, tonight({ holds: ['word_saraswati'] }))).toBe(true);
  });

  /** A dream that recurs every night is wallpaper, so `once` is the default an author assumes. */
  it('does not come round again once it has been seen', () => {
    const e = event({ once: true });
    expect(canHappen(e, tonight({ seen: [e.id] }))).toBe(false);
    expect(canHappen(event({ once: false, id: 'event_recurs' }), tonight({ seen: ['event_recurs'] })))
      .toBe(true);
  });
});

describe('choosing one', () => {
  /**
   * **Seeded, never random.** The determinism rule in this codebase is absolute: the same seed must
   * produce the same world and the same journal text. An event picked with `Math.random` would make
   * a seed unshareable and this untestable, and it would be the first thing in `content/` to break
   * it.
   */
  it('picks the same event twice for the same roll', () => {
    const three = [event({ id: 'a' }), event({ id: 'b' }), event({ id: 'c' })];
    const first = eventNow(tonight(), roll, three);
    expect(eventNow(tonight(), roll, three)?.id).toBe(first?.id);
    expect(first).not.toBeNull();
  });

  it('only ever picks something that could happen', () => {
    const pool = [
      event({ id: 'wrong_place', conditions: anyConditions({ shelter: ['palace'] }) }),
      event({ id: 'right_place' })
    ];
    expect(eventNow(tonight({ shelter: 'bedroll' }), roll, pool)?.id).toBe('right_place');
  });
});

describe('what the player can do about it', () => {
  it('offers only the choices they can actually take', () => {
    const e = event({
      choices: [
        { id: 'gated', label: 'Name it', needs: ['word_x'], line: 'You named it.', grants: [] },
        { id: 'open', label: 'Let it be', needs: [], line: 'You let it be.', grants: [] }
      ]
    });
    expect(choicesFor(e, []).map((c) => c.id)).toEqual(['open']);
    expect(choicesFor(e, ['word_x']).map((c) => c.id)).toEqual(['gated', 'open']);
  });

  /**
   * **A scene a player cannot leave is a soft lock, and this is the guard.**
   *
   * The first authored event with a conditional option would find this out the hard way: gate every
   * choice, meet none of the gates, and the card has a picture, a passage and no buttons. So the
   * rule bends rather than breaks -- an event with no way out is worse than one that offers a
   * choice it said it would not.
   */
  it('never leaves an event with no way out', () => {
    const allGated = event({
      choices: [
        { id: 'a', label: 'A', needs: ['nope'], line: 'a', grants: [] },
        { id: 'b', label: 'B', needs: ['also_nope'], line: 'b', grants: [] }
      ]
    });
    expect(choicesFor(allGated, [])).toHaveLength(1);
  });

  /** An event with no choices at all is legal -- it is a thing you read -- and must not invent one. */
  it('invents nothing for an event that offers nothing', () => {
    expect(choicesFor(event({ choices: [] }), [])).toEqual([]);
  });
});

describe('what an authored event will have to satisfy', () => {
  /**
   * Run against the real registry, so it means nothing today and starts meaning something the
   * moment somebody adds a row. Cheaper to write now than to remember later.
   */
  it('gives every event a unique id, prose, and a way out', () => {
    const ids = new Set(events.map((e) => e.id));
    expect(ids.size, 'two events share an id').toBe(events.length);
    for (const e of events) {
      expect(e.prose.length, `${e.id} has no prose`).toBeGreaterThan(10);
      expect(e.title.length, `${e.id} has no title`).toBeGreaterThan(2);
      expect(choicesFor(e, []).length, `${e.id} can strand a player with nothing`).toBeGreaterThan(0);
    }
  });
});
