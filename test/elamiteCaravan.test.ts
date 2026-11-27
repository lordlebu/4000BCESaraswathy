import { describe, expect, it } from 'vitest';
import { campPeople, campPlacements, doingLine } from '../src/content/campLife';
import { happeningNow, surroundingsAt } from '../src/content/happenings';
import { strangersMet } from '../src/content/people';
import { ELAMITE_DIALOGUE } from '../src/content/elamiteDialogue';
import { atHour } from '../src/content/travellers';
import { caravanSchedule, caravanStage, elamiteCaravanVisit, westernCaravanRoute } from '../src/content/elamiteCaravan';
import { campGround, CYCLE_DAYS, encampmentOn } from '../src/content/encampments';
import { fieldMap } from '../src/content/places';
import { bakeWorld, restoreWorld } from '../src/world/bake';
import { buildFieldMap } from '../src/world/fieldMap';
import { TWIN_MAP } from '../src/world/twinGeneration';

describe('Elamite caravan planning', () => {
  it.each([1, 2] as const)('finds stable western visits in Twin Cities generation %s', (twinGeneration) => {
    const built = buildFieldMap(fieldMap(TWIN_MAP)!, { seed: 'camps', twinGeneration });
    const places = built.placed.map(({ at }) => at);
    const campsites = campGround(built.world, places);
    const restored = restoreWorld(bakeWorld(built), fieldMap(TWIN_MAP)!);
    expect(restored).toBeTruthy();
    const restoredPlaces = restored!.placed.map(({ at }) => at);
    const restoredCampsites = campGround(restored!.world, restoredPlaces);
    const visitAt = (cycle: number) => elamiteCaravanVisit(
      built.world, TWIN_MAP, cycle, caravanSchedule(2), campsites, places
    );
    const wagons = new Set<string>();
    expect(visitAt(0)).toBeNull();
    expect(visitAt(1)).toBeNull();
    for (let cycle = 2; cycle < 48 && wagons.size < 2; cycle++) {
      const visit = visitAt(cycle);
      if (!visit) continue;
      wagons.add(visit.wagon);
      expect(visit.route[0]?.x).toBe(0);
      expect(campsites).toContainEqual(visit.route.at(-1));
      expect(elamiteCaravanVisit(restored!.world, TWIN_MAP, cycle, caravanSchedule(2), restoredCampsites, restoredPlaces)).toEqual(visit);
      const blocked = Array.from({ length: built.world.height }, (_, y) => ({ x: 1, y }));
      expect(westernCaravanRoute(built.world, visit.route.at(-1)!, [...places, ...blocked])).toBeNull();
      expect(elamiteCaravanVisit(built.world, TWIN_MAP, cycle, caravanSchedule(2), campsites, [...places, ...blocked])).toBeNull();
    }
    expect(wagons).toEqual(new Set(['covered', 'open']));
  });

  it('can substitute a visit using an eligible camp cycle without changing the legacy schedule', () => {
    const built = buildFieldMap(fieldMap(TWIN_MAP)!, { seed: 'camps', twinGeneration: 2 });
    const { world } = built;
    const places = built.placed.map(({ poi, at }) => ({ poiId: poi.id, at }));
    const legacy = Array.from({ length: 48 }, (_, i) => encampmentOn(world, TWIN_MAP, places, i + 1));
    const revised = legacy.map((_, i) => encampmentOn(world, TWIN_MAP, places, i + 1, caravanSchedule(2)));
    expect(revised.slice(0, 11)).toEqual(legacy.slice(0, 11));
    const day = revised.findIndex((camp) => camp?.caravan !== undefined);
    expect(day).toBeGreaterThanOrEqual(11);
    const visit = revised[day]!;
    expect(visit.caravan?.route.at(-1)).toEqual(visit.at);
    expect(visit).toMatchObject({ id: legacy[day]?.id, from: legacy[day]?.from, to: legacy[day]?.to });
    expect(revised[day + 1]?.caravan).toEqual(visit.caravan);
    const roster = campPeople(visit, TWIN_MAP, world.seed);
    const keys = roster.map(({ id }) => `${TWIN_MAP}:${id}`);
    expect(roster.map(({ elamiteRole }) => elamiteRole)).toEqual(['master', 'handler', visit.caravan?.thirdRole]);
    expect(strangersMet(keys, 'camps').map(({ traveller }) => traveller)).toEqual(roster);
    expect(campPlacements(world, visit, day + 2, atHour(12)).map(({ id }) => id)).toEqual(roster.map(({ id }) => id));

    const roll = () => 0;
    const vicinity = surroundingsAt(world, visit.at, TWIN_MAP, null, roll)!;
    const now = { fieldMapId: TWIN_MAP, day: day + 2, shelter: null, holds: [], seen: [], met: keys };
    const welcome = happeningNow({ ...now, occasion: 'arriving' }, roll, { ...vicinity, camp: visit }, [], { kind: 'camp', asked: true });
    expect(welcome?.title).toBe('The western caravan');
    expect(welcome?.choices).toHaveLength(2);
    expect(welcome?.choices.every((choice) => (choice.gives?.length ?? 0) === 0)).toBe(true);
    const person = roster[1]!;
    const talk = happeningNow({ ...now, occasion: 'road' }, roll, {
      ...vicinity,
      campPerson: {
        person, activity: 'chore', meal: false, doing: doingLine(person.kind, person.slot, 'chore', person.elamiteRole)
      }
    }, [], { kind: 'camp-talk', asked: true });
    expect(talk?.stranger).toMatchObject({ id: keys[1], givenName: person.givenName, culture: 'elamite' });
    expect(talk?.topics?.every((topic) => topic.historyKey.includes(':elamite-'))).toBe(true);
    expect(talk?.topics).toHaveLength(3);
    expect(Object.values(ELAMITE_DIALOGUE).flat()).toHaveLength(42);
  });

  it('derives every stage and reverses the route from the camp clock', () => {
    const from = CYCLE_DAYS;
    const to = from + 3;
    expect(caravanStage(from, to, from - 1, 18)).toBeNull();
    expect(caravanStage(from, to, from, 6)).toEqual({ stage: 'arrival', routeProgress: 0 });
    expect(caravanStage(from, to, from, 8)).toEqual({ stage: 'travelling', routeProgress: 0.5 });
    expect(caravanStage(from, to, from, 9)).toEqual({ stage: 'pitching', routeProgress: 1 });
    expect(caravanStage(from, to, from, 2)).toEqual({ stage: 'established', routeProgress: 1 });
    expect(caravanStage(from, to, from + 1, 6)).toEqual({ stage: 'established', routeProgress: 1 });
    expect(caravanStage(from, to, to - 1, 15)).toEqual({ stage: 'packing', routeProgress: 1 });
    expect(caravanStage(from, to, to - 1, 17.5)).toEqual({ stage: 'departure', routeProgress: 0.5 });
    expect(caravanStage(from, to, to - 1, 19)).toEqual({ stage: 'aftermath', routeProgress: 0 });
    expect(caravanStage(from, to, to - 1, 2)).toEqual({ stage: 'aftermath', routeProgress: 0 });
    expect(caravanStage(from, to, to, 6)).toBeNull();
  });
});
