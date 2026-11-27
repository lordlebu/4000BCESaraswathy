import { describe, expect, it } from 'vitest';
import { campPeople, doingLine } from '../src/content/campLife';
import { campable, encampmentOn, wayIn } from '../src/content/encampments';
import type { Circumstance, EventStranger } from '../src/content/events';
import { happeningNow, surroundingsAt } from '../src/content/happenings';
import { strangersMet } from '../src/content/people';
import { fieldMap } from '../src/content/places';
import type { Rumour } from '../src/content/rumours';
import { ambientTopics } from '../src/content/twinAmbientTalk';
import { twinCampDressingSpots, twinCampRouteTiles } from '../src/content/twinCampDressing';
import { travellersOn, walkedRoad } from '../src/content/travellers';
import { compatibleFaces, paintedFaceFor } from '../src/ui/StrangerFace';
import { buildFieldMap } from '../src/world/fieldMap';
import { TWIN_MAP } from '../src/world/twinGeneration';

const speaker = `${TWIN_MAP}:company_carrier`;
const stranger: EventStranger = {
  id: speaker, culture: 'harappan', givenName: 'Saalik', role: 'carrier, with a loaded back',
  look: { body: 'traveller-carrier', skin: 'as-painted', cloth: 'undyed', second: 'indigo' }
};
const roll = () => 0;
const now: Circumstance = {
  fieldMapId: TWIN_MAP, occasion: 'road', day: 9, shelter: null, holds: [], seen: [], met: [speaker]
};
const road = { road: true, culture: 'harappan', biome: 'hills', standing: 'heard-of', warm: true } as const;
const built = buildFieldMap(fieldMap(TWIN_MAP)!, { seed: 'camps', twinGeneration: 2 });
const smallTalk = { kind: 'small-talk', asked: true };
const campTalk = { kind: 'camp-talk', asked: true };

describe('Twin Cities ambient conversations', () => {
  it('keeps displayed lines stable on the same day and cools down heard lines for three days', () => {
    const first = ambientTopics(speaker, road, 9);
    const greeting = first[0]!;
    expect(greeting.id).toBe('greeting');
    expect(first).toHaveLength(3);
    const history = Object.fromEntries(first.map(({ historyKey }) => [historyKey, 9]));
    expect(ambientTopics(speaker, road, 9, history)).toEqual(first);
    for (const day of [10, 11]) {
      const next = ambientTopics(speaker, road, day, history);
      expect(next[0]?.id).toBe('greeting');
      expect(next.some((topic) => topic.historyKey in history)).toBe(false);
    }
    const other = ambientTopics(`${TWIN_MAP}:company_pilgrim`, road, 10, history);
    expect(other.every((topic) => !(topic.historyKey in history))).toBe(true);
  });

  it('shows live news while retaining the existing choice effects, and works on other maps', () => {
    const { world, placed } = built;
    const rumour: Rumour = { id: 'rumour:place:bank', kind: 'place', place: 'Reedwright’s Bank', poiId: 'bank', person: null };
    const around = { ...surroundingsAt(world, placed[0]!.at, TWIN_MAP, null, roll)!, stranger, talk: { warm: true, standing: 'known', rumour } } as const;
    const repeat = happeningNow(now, roll, around, [], smallTalk)!;
    expect(repeat.topics?.[0]).toMatchObject({ id: 'news', line: expect.stringContaining(rumour.place) });
    expect(repeat.choices[0]?.sets).toContain(`told:${rumour.id}@${rumour.poiId}@${speaker}`);
    expect(happeningNow({ ...now, met: [] }, roll, around, [], smallTalk)).toBeNull();
    const legacy = happeningNow({ ...now, fieldMapId: 'field_map_lothal' }, roll, around, [], smallTalk);
    expect(legacy?.topics?.[0]).toMatchObject({ id: 'news', line: expect.stringContaining(rumour.place) });
  });

  it('reconstructs a Twin Cities road traveller from the journey seed', () => {
    const traveller = travellersOn(TWIN_MAP, built.world.seed).find((person) => person.npcId === null)!;
    expect(strangersMet([`${TWIN_MAP}:${traveller.id}`], 'camps')[0]?.traveller).toEqual(traveller);
  });

  it('keeps introductions and meal effects, and dresses camps away from their residents and approaches', () => {
    const { world, placed } = built;
    const places = placed.map(({ poi, at }) => ({ poiId: poi.id, at }));
    const placedTiles = places.map(({ at }) => at);
    const kinds = new Set<string>();
    for (let day = 1; day < 70 && kinds.size < 3; day++) {
      const camp = encampmentOn(world, TWIN_MAP, places, day);
      if (!camp || day !== camp.from + 1 || kinds.has(camp.kind)) continue;
      kinds.add(camp.kind);
      const person = campPeople(camp, TWIN_MAP, world.seed)[0]!;
      const memory = strangersMet([`${TWIN_MAP}:${person.id}`], 'camps');
      expect(memory[0]?.traveller).toEqual(person);
      const campPerson = { person, activity: 'meal', doing: doingLine(camp.kind, person.slot, 'meal'), meal: true } as const;
      const around = { ...surroundingsAt(world, camp.at, TWIN_MAP, null, roll)!, campPerson };
      const first = happeningNow(now, roll, around, [], campTalk)!;
      const known = happeningNow({ ...now, met: [`${TWIN_MAP}:${person.id}`] }, roll, around, [], campTalk)!;
      expect(first.topics).toBeUndefined();
      expect(known.choices).toEqual(first.choices);
      expect(known.artMoment).toBe(`woven-camp-meal-${camp.kind}`);
      expect(known.topics?.[0]?.line).toContain('your bowl');

      const way = wayIn(world, camp, walkedRoad(world, TWIN_MAP, places), placedTiles);
      const reserved = twinCampRouteTiles(world, camp, way, places);
      const spots = twinCampDressingSpots(world, camp, placedTiles, reserved);
      expect(spots.length).toBeGreaterThan(0);
      expect(spots.length).toBeLessThanOrEqual(3);
      for (const p of spots) {
        expect(campable(world, p)).toBe(true);
        expect(Math.max(Math.abs(p.x - camp.at.x), Math.abs(p.y - camp.at.y))).toBe(3);
        expect(reserved.has(`${p.x},${p.y}`)).toBe(false);
      }
      const occupied = new Set(world.tiles.flat().map(({ x, y }) => `${x},${y}`));
      expect(twinCampDressingSpots(world, camp, placedTiles, occupied)).toEqual([]);
    }
    expect([...kinds].sort()).toEqual(['adventurers', 'drovers', 'pilgrims']);
  });

  it('chooses only compatible paintings across maps and falls back for an incompatible look', () => {
    expect(compatibleFaces(stranger.look, stranger.culture)).toEqual(['harappan-f-04']);
    const painting = paintedFaceFor(stranger);
    expect(painting).toContain('harappan-f-04');
    expect(paintedFaceFor({ ...stranger, id: 'field_map_lothal:company_carrier' })).toBe(painting);
    expect(paintedFaceFor({ ...stranger, look: { ...stranger.look, skin: 'deep' } })).toBeNull();
    expect(paintedFaceFor({ ...stranger, look: { ...stranger.look, cloth: 'leaf' } })).toBeNull();
    expect(paintedFaceFor({ ...stranger, culture: 'maru' })).toBeNull();
  });
});
