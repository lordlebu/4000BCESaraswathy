// What people on the road have heard, and the happening it leads to.
//
// The owner's brief: apart from the main conversation, talk should generate each map's events. A
// rumour is only ever something true of the world -- a place, a person with news, a question being
// asked -- and walking to where it points opens `rumour-kept`, once.

import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { tileHash } from '../src/world/rng';
import type { Circumstance } from '../src/content/events';
import { fieldMap, fieldMaps, npcsAt } from '../src/content/places';
import { fieldQuestions } from '../src/content/knowledge';
import { heardFlag, rumourAt, rumourFor, rumoursOn, type RumourFacts } from '../src/content/rumours';
import { surroundingsAt, wovenFor, type Roll, type Talk } from '../src/content/happenings';
import { DEFAULT_SEED } from '../src/ui/seed';

const fresh = (over: Partial<RumourFacts> = {}): RumourFacts => ({
  reached: () => false,
  knowsQuestion: () => false,
  hasNews: () => true,
  whereIs: () => null,
  flags: [],
  ...over
});

describe('what the road has heard', () => {
  it('only ever points at a place on this map', () => {
    for (const map of fieldMaps) {
      const here = new Set(map.pointsOfInterest);
      const whereIs = (id: string) => map.pointsOfInterest.find((p) => npcsAt(p).some((n) => n.id === id)) ?? null;
      for (const r of rumoursOn(map.id, fresh({ whereIs }))) {
        expect(here.has(r.poiId), `${r.id} points off ${map.id}`).toBe(true);
        expect(r.id.startsWith(`rumour:${r.kind}:`)).toBe(true);
      }
    }
  });

  it('is news: nowhere reached, nobody without news, no question already carried', () => {
    const map = fieldMap('field_map_lothal')!;
    const all = rumoursOn(map.id, fresh());
    expect(all.some((r) => r.kind === 'place')).toBe(true);
    const reached = rumoursOn(map.id, fresh({ reached: () => true }));
    expect(reached.some((r) => r.kind === 'place'), 'a reached place is still news').toBe(false);

    const whereIs = (id: string) => map.pointsOfInterest.find((p) => npcsAt(p).some((n) => n.id === id)) ?? null;
    expect(rumoursOn(map.id, fresh({ whereIs })).some((r) => r.kind === 'person')).toBe(true);
    expect(rumoursOn(map.id, fresh({ whereIs, hasNews: () => false })).some((r) => r.kind === 'person')).toBe(false);
    // Somebody on the road is nowhere a rumour could send you.
    expect(rumoursOn(map.id, fresh({ whereIs: () => null })).some((r) => r.kind === 'person')).toBe(false);

    const asked = fieldQuestions.filter((q) => q.raisedAt && map.pointsOfInterest.includes(q.raisedAt));
    expect(asked.length).toBeGreaterThan(0);
    expect(all.filter((r) => r.kind === 'question').length).toBe(asked.length);
    expect(rumoursOn(map.id, fresh({ knowsQuestion: () => true })).some((r) => r.kind === 'question')).toBe(false);
  });

  it('is not told twice', () => {
    const all = rumoursOn('field_map_lothal', fresh());
    const first = all[0]!;
    const after = rumoursOn('field_map_lothal', fresh({ flags: [heardFlag(first.id)] }));
    expect(after.map((r) => r.id)).not.toContain(first.id);
    expect(after.length).toBe(all.length - 1);
  });

  it('is a seeded pick, the same for the same roll', () => {
    const all = rumoursOn('field_map_narmada', fresh());
    const roll = (s: string) => tileHash('seed', 3, 4, s);
    expect(rumourFor(all, roll)).toEqual(rumourFor(all, roll));
    expect(rumourFor([], roll)).toBeNull();
  });
});

describe('small talk and the rumour it passes on', () => {
  const built = buildFieldMap(fieldMap('field_map_lothal')!, { seed: DEFAULT_SEED });
  const at = built.placed[0]!.at;
  const roll: Roll = (s) => tileHash(built.world.seed, at.x, at.y, `talk:${s}`);
  const morning = { timeOfDay: 'morning', weather: 'clear' };
  const rumour = rumoursOn('field_map_lothal', fresh()).find((r) => r.kind === 'place')!;
  const talking = (talk: Talk) =>
    surroundingsAt(built.world, at, 'field_map_lothal', morning, roll, { strangerId: 'company_carrier', talk })!;
  const who = 'field_map_lothal:company_carrier';
  const now = (over: Partial<Circumstance> = {}): Circumstance => ({
    occasion: 'road',
    shelter: null,
    fieldMapId: 'field_map_lothal',
    day: 5,
    holds: [],
    seen: [],
    met: [who],
    ...over
  });

  it('passes a rumour on only when the stranger cares, and asking leaves the flags', () => {
    const [warm] = wovenFor(now(), talking({ standing: 'known', warm: true, rumour }), roll, 'small-talk', true);
    expect(warm, 'no small talk with a warm stranger').toBeTruthy();
    expect(warm!.prose).toContain(rumour.place);
    const ask = warm!.choices.find((c) => c.id === 'ask')!;
    expect(ask.sets).toEqual([`heard:${rumour.id}`, `told:${rumour.id}@${rumour.poiId}@${who}`]);

    const [cold] = wovenFor(now(), talking({ standing: 'stranger', warm: false, rumour }), roll, 'small-talk', true);
    expect(cold!.prose, 'a cold stranger passed on a rumour').not.toContain(rumour.place);
    expect(cold!.choices.map((c) => c.id)).toEqual(['walk', 'part']);
  });

  it('greets you as the map knows you', () => {
    const say = (standing: Talk['standing']) =>
      wovenFor(now(), talking({ standing, warm: true, rumour: null }), roll, 'small-talk', true)[0]!.prose;
    expect(new Set(['stranger', 'heard-of', 'known', 'trusted'].map((s) => say(s as Talk['standing']))).size).toBe(4);
  });

  it('never happens with somebody not yet met: that is the company card, where you learn a name', () => {
    expect(wovenFor(now({ met: [] }), talking({ standing: 'known', warm: true, rumour }), roll, 'small-talk', true)).toEqual([]);
  });

  it('keeps its promise once, at the place it named, and nowhere else', () => {
    const flags = [`heard:${rumour.id}`, `told:${rumour.id}@${rumour.poiId}@${who}`];
    expect(rumourAt(rumour.poiId, flags)).toEqual({ rumourId: rumour.id, teller: who });
    const arriveAt = (poiId: string) =>
      surroundingsAt(built.world, at, 'field_map_lothal', morning, roll, { poiId })!;
    const arriving = (over: Partial<Circumstance> = {}) => now({ occasion: 'arriving', flags, ...over });

    const [kept] = wovenFor(arriving(), arriveAt(rumour.poiId), roll, 'rumour-kept', true);
    expect(kept?.id).toBe(`woven:rumour-kept:${rumour.id}`);
    expect(kept!.prose).toContain(rumour.place);

    expect(wovenFor(arriving({ seen: [kept!.id] }), arriveAt(rumour.poiId), roll, 'rumour-kept', true)).toEqual([]);
    const elsewhere = fieldMap('field_map_lothal')!.pointsOfInterest.find((p) => p !== rumour.poiId)!;
    expect(wovenFor(arriving(), arriveAt(elsewhere), roll, 'rumour-kept', true)).toEqual([]);
  });
});
