// Who is at a place right now.
//
// Reported from play: "if I walk into a town or POI, I am not aware who is there." The place panel
// listed everybody canon ever put at a place, so Kunch was at three Lothal places at once. These
// tests hold the rule; the panel's own rendering is `test/oneAtATime.test.tsx` and the browser half
// is `e2e/talking.spec.ts`, which walks to Thrali and finds him.

import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMap, fieldMaps, npc, npcsAt } from '../src/content/places';
import { awayLine, peopleAtPlaces, roadTalk, whoIsHere, type Reported } from '../src/content/presence';
import {
  NEARBY_TILES,
  hoursFor,
  nearby,
  placedCircuit,
  travellerState,
  travellersOn,
  whereabouts
} from '../src/content/travellers';
import { hoursToPhase } from '../src/game/dayNight';

/** What the scene would report for a map at one moment: the same calls `reportTravellers` makes. */
// One build per map and seed: the ground does not change with the hour, and rebuilding it for each
// of a hundred moments took the suite past its time budget under load.
const builds = new Map<string, ReturnType<typeof buildFieldMap>>();

function reportFor(fieldMapId: string, seed: string, day: number, hour: number): Reported[] {
  const key = `${fieldMapId}:${seed}`;
  const built = builds.get(key) ?? buildFieldMap(fieldMap(fieldMapId)!, { seed });
  builds.set(key, built);
  const out: Reported[] = [];
  for (const t of travellersOn(fieldMapId)) {
    const circuit = placedCircuit(t, built.placed);
    if (circuit.length < 2) continue;
    const where = whereabouts(built.world, circuit.map((s) => s.at), day, hoursToPhase(hour), hoursFor(t.id));
    const state = travellerState(circuit, where);
    if (state) out.push({ npcId: t.npcId, state });
  }
  return out;
}

const names = (list: readonly { name: string }[]) => list.map((n) => n.name);

describe('a place lists who is there now', () => {
  it('always has somebody authored in one place', () => {
    const uma = npc('npc_uma')!;
    expect(uma.foundAt, 'Uma is no longer authored in one place').toEqual(['poi_lothal_camp']);
    for (const hour of [0, 9, 12, 20]) {
      const here = whoIsHere('poi_lothal_camp', 'field_map_lothal', 0, reportFor('field_map_lothal', 'presence', 0, hour));
      expect(names(here.here), `Uma is missing at ${hour}:00`).toContain('Uma');
    }
  });

  it('counts a traveller as here until the scene has said otherwise', () => {
    const here = whoIsHere('poi_lothal_camp', 'field_map_lothal', 0, []);
    expect(names(here.here).sort()).toEqual(names(npcsAt('poi_lothal_camp')).sort());
    expect(here.away).toEqual([]);
  });

  it('says where a traveller went, in a sentence', () => {
    const resting: Reported = { npcId: 'npc_thrali', state: { resting: true, atPoi: 'poi_drowned_dockyard', boundFor: null } };
    const walkingAway: Reported = { npcId: 'npc_thrali', state: { resting: false, atPoi: null, boundFor: 'poi_drowned_dockyard' } };
    const walkingHere: Reported = { npcId: 'npc_thrali', state: { resting: false, atPoi: null, boundFor: 'poi_lothal_camp' } };

    const stopped = whoIsHere('poi_lothal_camp', 'field_map_lothal', 0, [resting]);
    expect(names(stopped.here)).not.toContain('Thrali');
    expect(stopped.away.find((a) => a.npc.id === 'npc_thrali')?.says).toBe('Thrali has stopped at the Drowned Dockyard.');

    const road = whoIsHere('poi_lothal_camp', 'field_map_lothal', 0, [walkingAway]);
    expect(road.away.find((a) => a.npc.id === 'npc_thrali')?.where).toBe('On the road to the Drowned Dockyard');

    const coming = whoIsHere('poi_lothal_camp', 'field_map_lothal', 0, [walkingHere]);
    expect(coming.away.find((a) => a.npc.id === 'npc_thrali')?.says).toBe('Thrali is on the way here.');

    // And at the dockyard he is simply here.
    const there = whoIsHere('poi_drowned_dockyard', 'field_map_lothal', 0, [resting]);
    expect(names(there.here)).toContain('Thrali');
  });

  it('lists nobody at two places at once, on any map, at any hour', () => {
    // **The fault itself.** Every named person, every place of theirs on the map, at dawn, noon,
    // dusk and midnight over a week: here in at most one of them.
    for (const map of fieldMaps) {
      for (let day = 0; day < 7; day += 1) {
        for (const hour of [5, 12, 19, 23]) {
          const reported = reportFor(map.id, 'presence', day, hour);
          const seenAt = new Map<string, string[]>();
          for (const poiId of map.pointsOfInterest) {
            for (const person of whoIsHere(poiId, map.id, day, reported).here) {
              seenAt.set(person.id, [...(seenAt.get(person.id) ?? []), poiId]);
            }
          }
          for (const [who, at] of seenAt) {
            expect(at.length, `${map.id} day ${day} ${hour}:00: ${who} is at ${at.join(' and ')}`).toBe(1);
          }
        }
      }
    }
  });

  it('lets everybody be found somewhere, so no line goes out of reach', () => {
    // Canon's playability check assumes a person at a place can be heard. Somebody who is never
    // here anywhere would make their lines unreachable, which is a worse fault than the one fixed.
    for (const map of fieldMaps) {
      const belongs = new Set(map.pointsOfInterest.flatMap((p) => npcsAt(p).map((n) => n.id)));
      const found = new Set<string>();
      for (let day = 0; day < 6; day += 1) {
        const reported = reportFor(map.id, 'presence', day, 23);
        for (const poiId of map.pointsOfInterest) {
          for (const person of whoIsHere(poiId, map.id, day, reported).here) found.add(person.id);
        }
      }
      for (const who of belongs) expect(found.has(who), `${map.id}: ${who} is never anywhere`).toBe(true);
    }
  });

  it('keeps a circuit person who is not drawn in one place a day, moving on the next', () => {
    // The Aravali has more people with circuits than `TRAVELLERS_PER_MAP` draws. Those left over
    // used to stand at every place of theirs at once.
    const map = fieldMap('field_map_aravali')!;
    const drawn = new Set(travellersOn(map.id).map((t) => t.npcId));
    const onMap = new Set(map.pointsOfInterest);
    const leftOver = map.pointsOfInterest
      .flatMap((p) => npcsAt(p))
      .filter((n, i, all) => all.findIndex((m) => m.id === n.id) === i)
      .filter((n) => !drawn.has(n.id) && n.foundAt.filter((p) => onMap.has(p)).length >= 2);
    expect(leftOver.length, 'nobody on the Aravali is left over -- the roster cap no longer bites').toBeGreaterThan(0);

    for (const person of leftOver) {
      const whereOn = (day: number) =>
        person.foundAt.filter((p) => onMap.has(p) && names(whoIsHere(p, map.id, day, []).here).includes(person.name));
      expect(whereOn(0).length, `${person.id} is in more than one place`).toBe(1);
      expect(whereOn(0), `${person.id} never moves`).not.toEqual(whereOn(1));
    }
  });
});

describe('the line under who is here', () => {
  it('says where the others went, in their own sentences', () => {
    const presence = whoIsHere('poi_lothal_camp', 'field_map_lothal', 0, [
      { npcId: 'npc_thrali', state: { resting: false, atPoi: null, boundFor: 'poi_drowned_dockyard' } },
      { npcId: 'npc_kunch', state: { resting: true, atPoi: 'poi_marsh_shrine', boundFor: null } }
    ]);
    expect(awayLine(presence)).toBe(
      'Kunch has stopped at the Marsh Shrine. Thrali is on the road to the Drowned Dockyard.'
    );
  });

  it('says nothing when everybody is in', () => {
    expect(awayLine(whoIsHere('poi_lothal_camp', 'field_map_lothal', 0, []))).toBeNull();
  });
});

describe('meeting people on the road', () => {
  it('names whoever is closest, and only those in view', () => {
    const drawn = new Map([
      ['b', { x: 12, y: 10 }],
      ['a', { x: 11, y: 11 }],
      ['far', { x: 30, y: 30 }]
    ]);
    const near = nearby(drawn, { x: 10, y: 10 });
    expect(near.map((n) => n.id)).toEqual(['a', 'b']);
    expect(near[0]).toEqual({ id: 'a', steps: 1, beside: true });
    expect(near[1]!.beside).toBe(false);
    expect(nearby(drawn, { x: 10, y: 10 }, 0)).toEqual([]);
    expect(near.some((n) => n.id === 'far'), `somebody ${NEARBY_TILES}+ tiles off is named`).toBe(false);
  });

  it('offers to talk to a named traveller, and walk with a stranger', () => {
    const lothal = travellersOn('field_map_lothal');
    const named = lothal.find((t) => t.npcId !== null)!;
    const stranger = lothal.find((t) => t.npcId === null)!;

    const talk = roadTalk([{ id: named.id, npcId: named.npcId, beside: true }], 'field_map_lothal', []);
    expect(talk).toEqual({ travellerId: named.id, npcId: named.npcId, label: `Talk to ${named.name}`, blocked: null });

    const walk = roadTalk([{ id: stranger.id, npcId: null, beside: true }], 'field_map_lothal', []);
    expect(walk?.label).toBe(`Walk with the ${stranger.role.split(',')[0]}`);
    expect(walk?.npcId).toBeNull();

    // Once met, by the name they gave.
    const again = roadTalk([{ id: stranger.id, npcId: null, beside: true }], 'field_map_lothal', [
      `field_map_lothal:${stranger.id}`
    ]);
    expect(again?.label).toBe(`Walk with ${stranger.givenName}`);
  });

  it('greys the row until you are beside them, and says how to get there', () => {
    const named = travellersOn('field_map_lothal').find((t) => t.npcId !== null)!;
    const far = roadTalk([{ id: named.id, npcId: named.npcId, beside: false }], 'field_map_lothal', []);
    expect(far?.blocked).toBe(`${named.name} is on the road nearby. Walk up beside them.`);
    expect(roadTalk([], 'field_map_lothal', [])).toBeNull();
  });
});

describe('the marks over places on the map', () => {
  it('marks every place somebody is at, once each, and nowhere empty', () => {
    const reported = reportFor('field_map_lothal', 'presence', 0, 12);
    const marks = peopleAtPlaces('field_map_lothal', 0, reported, () => false);
    for (const mark of marks) {
      expect(mark.people.length, `${mark.poiId} is marked with nobody`).toBeGreaterThan(0);
      expect(mark.people.map((p) => p.npcId).sort()).toEqual(
        whoIsHere(mark.poiId, 'field_map_lothal', 0, reported).here.map((n) => n.id).sort()
      );
    }
    const everyone = marks.flatMap((m) => m.people.map((p) => p.npcId));
    expect(new Set(everyone).size, 'somebody is marked at two places').toBe(everyone.length);
    // Uma never leaves the roof.
    expect(marks.find((m) => m.poiId === 'poi_lothal_camp')?.people.map((p) => p.npcId)).toContain('npc_uma');
  });

  it('carries whether somebody has news, from the caller', () => {
    const marks = peopleAtPlaces('field_map_lothal', 0, [], (id) => id === 'npc_uma');
    const camp = marks.find((m) => m.poiId === 'poi_lothal_camp')!;
    expect(camp.people.find((p) => p.npcId === 'npc_uma')?.fresh).toBe(true);
    expect(camp.people.filter((p) => p.npcId !== 'npc_uma').every((p) => !p.fresh)).toBe(true);
  });
});
