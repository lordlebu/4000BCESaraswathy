// How well a map knows you: four words, read off what the save already holds.
//
// The owner's brief: "semi well known, not on the sidelines, although some people do not care about
// us until we affect their lives." And the ruling: no fame number. These hold the words to what
// was done, and hold helping as the thing that moves them.

import { describe, expect, it } from 'vitest';
import { discoveries, offeredAt } from '../src/content/knowledge';
import { fieldMap, fieldMaps, npc, npcsAt, poi } from '../src/content/places';
import {
  KNOWN_BY_UNDERSTANDING,
  STANDINGS,
  STANDING_WORDS,
  standingOn,
  warmTo,
  type Facts
} from '../src/content/standing';

const facts = (finished: readonly string[] = [], met: readonly string[] = []): Facts => ({
  finished: (id) => finished.includes(id),
  met
});

/** Discoveries a map offers, once each. */
const offeredOn = (mapId: string) => [
  ...new Set((fieldMap(mapId)?.pointsOfInterest ?? []).flatMap((p) => offeredAt(p, poi(p)?.discoveries ?? [])))
];

/** People of this map, once each. */
const peopleOn = (mapId: string) => [
  ...new Set((fieldMap(mapId)?.pointsOfInterest ?? []).flatMap((p) => npcsAt(p).map((n) => n.id)))
];

describe('how well a map knows you', () => {
  it('begins as a stranger everywhere', () => {
    for (const map of fieldMaps) expect(standingOn(map.id, facts()).standing).toBe('stranger');
  });

  it('has heard of you once you finish something or meet somebody on its roads', () => {
    const lothal = offeredOn('field_map_lothal');
    const quiet = lothal.find((id) => discoveries.find((d) => d.id === id)?.helps.length === 0);
    expect(quiet, 'every Lothal discovery helps somebody -- pick another fixture').toBeTruthy();
    expect(standingOn('field_map_lothal', facts([quiet!])).standing).toBe('heard-of');
    expect(standingOn('field_map_lothal', facts([], ['field_map_lothal:company_carrier'])).standing).toBe('heard-of');
    // Meeting somebody on another map is not being heard of here.
    expect(standingOn('field_map_lothal', facts([], ['field_map_dwarka:company_carrier'])).standing).toBe('stranger');
  });

  it('knows you once you have helped somebody here', () => {
    const people = new Set(peopleOn('field_map_lothal'));
    const helping = discoveries.find((d) => d.helps.some((who) => people.has(who)));
    expect(helping, 'no discovery helps anybody on Lothal').toBeTruthy();
    const on = standingOn('field_map_lothal', facts([helping!.id]));
    expect(on.standing).toBe('known');
    expect(on.helped.length).toBeGreaterThan(0);
  });

  it('knows you, too, once you understand enough here without helping anybody', () => {
    const quiet = offeredOn('field_map_lothal').filter(
      (id) => discoveries.find((d) => d.id === id)?.helps.length === 0
    );
    if (quiet.length < KNOWN_BY_UNDERSTANDING) return; // nothing to test on this canon
    expect(standingOn('field_map_lothal', facts(quiet.slice(0, KNOWN_BY_UNDERSTANDING))).standing).toBe('known');
  });

  it('trusts you once you have helped half the people you could, and understood enough', () => {
    for (const map of fieldMaps) {
      const everything = offeredOn(map.id);
      const all = discoveries.map((d) => d.id);
      const on = standingOn(map.id, facts(all));
      if (on.helpable.length === 0 || everything.length < KNOWN_BY_UNDERSTANDING) continue;
      expect(on.standing, `${map.id}: doing everything did not earn trust`).toBe('trusted');
    }
  });

  it('only ever rises as more is done', () => {
    const map = 'field_map_narmada';
    const order = offeredOn(map);
    let was = 0;
    for (let i = 0; i <= order.length; i += 1) {
      const now = STANDINGS.indexOf(standingOn(map, facts(order.slice(0, i))).standing);
      expect(now, `finishing ${order[i - 1]} lowered the standing`).toBeGreaterThanOrEqual(was);
      was = now;
    }
  });

  it('says it in words, and never a number', () => {
    for (const s of STANDINGS) expect(STANDING_WORDS[s]).not.toMatch(/\d/);
  });
});

describe('whether a stranger cares', () => {
  it('is cold while nobody knows you and you have helped none of their people', () => {
    expect(warmTo('kia', 'stranger', facts())).toBe(false);
    expect(warmTo('kia', 'heard-of', facts())).toBe(false);
  });

  it('warms to you when the map knows you', () => {
    expect(warmTo('kia', 'known', facts())).toBe(true);
    expect(warmTo(null, 'trusted', facts())).toBe(true);
  });

  it('warms to you when you have helped somebody of their own people, anywhere', () => {
    const kiaHelp = discoveries.find((d) => d.helps.some((who) => npc(who)?.language === 'kia'));
    expect(kiaHelp, 'nothing helps a Kia speaker').toBeTruthy();
    expect(warmTo('kia', 'stranger', facts([kiaHelp!.id]))).toBe(true);
    // And not a Maru stranger, unless the same discovery helps a Maru speaker too.
    const alsoMaru = kiaHelp!.helps.some((who) => npc(who)?.language === 'maru');
    expect(warmTo('maru', 'stranger', facts([kiaHelp!.id]))).toBe(alsoMaru);
  });
});
