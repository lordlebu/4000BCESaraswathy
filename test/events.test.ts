// The event framework, which has no content and must still be correct.
//
// **Testing an empty registry is the point rather than a curiosity.** The content is later work;
// what ships now is the shape, and the shape is what the first authored event will be written
// against. If `canHappen` has the wrong idea about a condition, nobody finds out until somebody has
// written a dream and it never fires -- and they will blame the dream.
//
// So these drive the rules with fixtures and assert three things the real registry cannot yet:
// that conditions narrow, that an event can never leave a player stuck in a scene, and that
// choosing is seeded rather than random.

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
   * **Empty is a real state, and the whole framework has to survive it.** This is what a player
   * sees today: they sleep, nothing happens, and the card never mounts. A framework that threw or
   * returned something on an empty registry would be a regression nobody would find until the
   * night after it shipped.
   */
  it('answers nothing while there is nothing authored', () => {
    expect(events).toHaveLength(0);
    expect(eventsFor(tonight())).toEqual([]);
    expect(eventNow(tonight(), roll)).toBeNull();
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
