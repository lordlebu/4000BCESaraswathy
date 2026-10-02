// The people who keep a camp, the way in to it, and who comes and goes.
//
// Two halves, as `travellers.test.ts` has. The rules are checked here, and so is the half this
// codebase keeps getting wrong: **that each thing actually happens on the real maps**. A runner
// errand that never fires and a visitor nobody ever sees would pass every rule below while the
// camps stayed exactly as empty as they were. That the people reach the screen is
// `e2e/camp-life.spec.ts`.

import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { isWalkable } from '../src/world/generate';
import { fieldMap, fieldMaps } from '../src/content/places';
import { CAMP_KINDS, PROPS_AROUND, campSpots, campable, encampmentOn, wayIn, type Encampment } from '../src/content/encampments';
import {
  CAMP_SLOTS,
  busyLine,
  campActivity,
  campPeople,
  campPlacements,
  campStage,
  campVisitors,
  phaseAfterMeeting,
  runnerErrand,
  standingRoom,
  visitorAt,
  type RoadTraveller
} from '../src/content/campLife';
import { atHour, hoursFor, placedCircuit, travellersOn, untangle, walkedRoad, whereabouts } from '../src/content/travellers';
import { CAMP_DAY, VISIT_PACE_CAP } from '../src/content/tiers';
import { CAMP_LAYOUT, CROSSED_GROUND, PRINTED_GROUND, carriesTint, troddenColour } from '../src/game/campArt';
import { spendNight } from '../src/game/night';
import type { Point } from '../src/world/types';

// `h` holds the Aravali's roadless northern landmass, where a camp's way leaves from a place.
const SEEDS = ['a', 'b', 'c', 'd', 'h'];
const DAYS = 24;

/** Every camp that stands on one map and seed in the first few weeks, with what the scene would build. */
function campsOn(mapId: string, seed: string) {
  const built = buildFieldMap(fieldMap(mapId)!, { seed });
  const world = built.world;
  const places = built.placed.map((p) => ({ poiId: p.poi.id, at: p.at }));
  const walked = walkedRoad(world, mapId, places);
  const roster: RoadTraveller[] = travellersOn(mapId)
    .map((t) => ({ id: t.id, npcId: t.npcId, stops: placedCircuit(t, built.placed).map((s) => s.at) }))
    .filter((t) => t.stops.length >= 2);
  const out: { camp: Encampment; day: number }[] = [];
  const placeTiles = places.map((p) => p.at);
  for (let day = 0; day < DAYS; day++) {
    const camp = encampmentOn(world, mapId, places, day);
    if (camp) out.push({ camp, day });
  }
  return { world, walked, roster, out, places: placeTiles };
}

const builds = new Map<string, ReturnType<typeof campsOn>>();
const camps = (mapId: string, seed: string) => {
  const key = `${mapId}:${seed}`;
  if (!builds.has(key)) builds.set(key, campsOn(mapId, seed));
  return builds.get(key)!;
};

const cheb = (a: Point, b: Point) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

describe('who keeps a camp', () => {
  const camp: Encampment = { id: 'field_map_lothal:3', kind: 'drovers', at: { x: 10, y: 10 }, from: 18, to: 21, near: null };

  it('is a leader, a runner and a watch, each with a look and a name nobody on the road has', () => {
    for (const kind of CAMP_KINDS) {
      const people = campPeople({ ...camp, kind }, 'field_map_lothal');
      expect(people.map((p) => p.slot)).toEqual([...CAMP_SLOTS]);
      for (const p of people) {
        expect(p.look, `${kind} ${p.slot} has no look`).not.toBeNull();
        expect(p.id).not.toContain(':');
        expect(p.campId).toBe(camp.id);
      }
      const names = people.map((p) => p.givenName);
      expect(new Set(names).size, `${kind}: ${names.join(', ')}`).toBe(names.length);
      const road = travellersOn('field_map_lothal').map((t) => t.givenName);
      for (const n of names) expect(road, `${n} is already somebody on the road`).not.toContain(n);
    }
  });

  it('is somebody different at the next camp', () => {
    const a = campPeople(camp, 'field_map_lothal');
    const b = campPeople({ ...camp, id: 'field_map_lothal:4' }, 'field_map_lothal');
    expect(a.map((p) => p.id)).not.toEqual(b.map((p) => p.id));
  });

  it('agrees with the scene about how many things stand round the fire', () => {
    // `pitchCamp` draws the shelter and the extras from `CAMP_LAYOUT`; the people keep off as many
    // tiles as `PROPS_AROUND` says. Two numbers for one fact, held together here.
    for (const kind of CAMP_KINDS) expect(PROPS_AROUND[kind], kind).toBe(1 + CAMP_LAYOUT[kind].extras.length);
  });
});

describe("a camp's day", () => {
  const camp: Encampment = { id: 'x:1', kind: 'pilgrims', at: { x: 5, y: 5 }, from: 6, to: 9, near: null };
  const at = (h: number) => atHour(h);

  it('keeps the hours in tiers.ts', () => {
    const mid = 7;
    expect(campActivity(camp, 'leader', mid, at(CAMP_DAY.wake + 0.5))).toBe('relight');
    expect(campActivity(camp, 'watch', mid, at(CAMP_DAY.wake + 0.5))).toBe('asleep');
    expect(campActivity(camp, 'runner', mid, at(9))).toBe('chore');
    expect(campActivity(camp, 'leader', mid, at(13))).toBe('shade');
    expect(campActivity(camp, 'watch', mid, at(13))).toBe('chore');
    expect(campActivity(camp, 'leader', mid, at(18))).toBe('meal');
    expect(campActivity(camp, 'leader', mid, at(20))).toBe('evening');
    expect(campActivity(camp, 'leader', mid, at(23))).toBe('asleep');
    expect(campActivity(camp, 'watch', mid, at(23))).toBe('watch');
    expect(campActivity(camp, 'watch', mid, at(3))).toBe('watch');
  });

  it('pitches on its first morning and strikes on its last afternoon', () => {
    expect(campActivity(camp, 'leader', 6, at(8))).toBe('pitch');
    expect(campStage(camp, 6, at(8)).shelterUp).toBe(false);
    expect(campStage(camp, 6, at(CAMP_DAY.pitched + 1)).shelterUp).toBe(true);
    expect(campActivity(camp, 'runner', 8, at(16))).toBe('strike');
    expect(campStage(camp, 8, at(16)).shelterUp).toBe(false);
    expect(campStage(camp, 7, at(16)).shelterUp).toBe(true);
  });

  it('feeds the fire at first light and at dusk, and keeps a thread through the night', () => {
    expect(campStage(camp, 7, at(6)).smoke).toBe('thick');
    expect(campStage(camp, 7, at(18)).smoke).toBe('thick');
    expect(campStage(camp, 7, at(11)).smoke).toBe('steady');
    expect(campStage(camp, 7, at(2)).smoke).toBe('thread');
  });

  it('writes a night beside a camp in the words of whose camp it was', () => {
    for (const kind of CAMP_KINDS) expect(spendNight('camp', kind).entry).toMatch(kind === 'pilgrims' ? /pilgrims/ : new RegExp(kind));
    expect(spendNight('camp').entry).toMatch(/banked the fire/);
  });
});

describe('where everybody stands, on the real maps', () => {
  it('never on a prop, the fire, a road, or each other; always near the fire unless out on the way', () => {
    let checked = 0;
    for (const map of fieldMaps) {
      const { world, out } = camps(map.id, 'a');
      for (const { camp, day } of out) {
        const { around } = campSpots(world, camp);
        const props = new Set([camp.at, ...around.slice(0, PROPS_AROUND[camp.kind])].map((p) => `${p.x},${p.y}`));
        for (let h = 0; h < 24; h += 1) {
          const placed = campPlacements(world, camp, day, atHour(h + 0.25));
          const tiles = placed.filter((p) => p.at).map((p) => `${p.at!.x},${p.at!.y}`);
          expect(new Set(tiles).size, `${camp.id} at ${h}: two on one tile`).toBe(tiles.length);
          for (const p of placed) {
            if (!p.at) continue;
            checked++;
            const t = world.tiles[p.at.y]![p.at.x]!;
            expect(props.has(`${p.at.x},${p.at.y}`), `${camp.id} ${p.slot} stands on a prop at ${h}`).toBe(false);
            expect(isWalkable(t) && !t.road, `${camp.id} ${p.slot} on ${t.biome} at ${h}`).toBe(true);
            expect(cheb(p.at, camp.at)).toBeLessThanOrEqual(2);
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });
});

describe('the way in', () => {
  it('reaches every camp from a road, one step at a time, never over the open sea', () => {
    for (const map of fieldMaps) {
      for (const seed of SEEDS) {
        const { world, walked, out, places } = camps(map.id, seed);
        for (const { camp } of out) {
          const way = wayIn(world, camp, walked, places);
          expect(way, `${map.id} ${seed} ${camp.id} has no way in`).not.toBeNull();
          const { tiles, turnOff } = way!;
          // The rails and ropes are walked like ground; the sea under them never is.
          for (const p of tiles) {
            const t = world.tiles[p.y]![p.x]!;
            if (t.biome === 'sea') expect(Boolean(t.track || t.plank), `${camp.id} crosses open sea at ${p.x},${p.y}`).toBe(true);
          }
          expect(tiles[0]).toEqual(turnOff);
          expect(tiles[tiles.length - 1]).toEqual(camp.at);
          const fromPlace = places.some((p) => p.x === turnOff.x && p.y === turnOff.y);
          expect(world.tiles[turnOff.y]![turnOff.x]!.road || fromPlace, 'the turn-off is neither a road nor a place').toBe(true);
          // Off the Aravali a road somebody walks is always reachable on foot, so the way leaves from one.
          if (map.id !== 'field_map_aravali') {
            expect(walked.has(`${turnOff.x},${turnOff.y}`), 'the turn-off is not on a road anybody walks').toBe(true);
          }
          for (let i = 1; i < tiles.length; i++) {
            const step = Math.abs(tiles[i]!.x - tiles[i - 1]!.x) + Math.abs(tiles[i]!.y - tiles[i - 1]!.y);
            expect(step, `${camp.id}: a jump at ${i}`).toBe(1);
            expect(isWalkable(world.tiles[tiles[i]!.y]![tiles[i]!.x]!)).toBe(true);
          }
        }
      }
    }
  });

  it('goes round rough ground rather than over it, priced as the walker is', () => {
    // The way is the cheapest walk, so it is never dearer than the straight-ish route `findPath`
    // would take with the walker's own prices -- checked by its cost never exceeding the tile count
    // times the dearest step, and by mountains being a small share of what it crosses.
    let mountains = 0;
    let total = 0;
    for (const map of fieldMaps) {
      const { world, walked, out, places } = camps(map.id, 'b');
      for (const { camp } of out) {
        for (const p of wayIn(world, camp, walked, places)?.tiles.slice(1) ?? []) {
          total++;
          if (world.tiles[p.y]![p.x]!.biome === 'mountains') mountains++;
        }
      }
    }
    expect(total).toBeGreaterThan(100);
    expect(mountains / total).toBeLessThan(0.05);
  });
});

describe('runners and visitors, on the real maps', () => {
  /** Everything the camps on every map and seed come to, gathered once. */
  const gathered = (() => {
    const errands: { map: string; seed: string; camp: Encampment; day: number; errand: NonNullable<ReturnType<typeof runnerErrand>> }[] = [];
    const visits: {
      map: string;
      world: ReturnType<typeof campsOn>['world'];
      camp: Encampment;
      day: number;
      visit: ReturnType<typeof campVisitors>[number];
      errandId: string | null;
    }[] = [];
    let campDays = 0;
    for (const map of fieldMaps) {
      for (const seed of SEEDS) {
        const { world, walked, roster, out, places } = camps(map.id, seed);
        for (const { camp, day } of out) {
          campDays++;
          const way = wayIn(world, camp, walked, places);
          const errand = runnerErrand(world, camp, way, roster, day);
          if (errand) errands.push({ map: map.id, seed, camp, day, errand });
          for (const visit of campVisitors(world, camp, way, roster, day, errand)) {
            visits.push({ map: map.id, world, camp, day, visit, errandId: errand?.travellerId ?? null });
          }
        }
      }
    }
    return { errands, visits, campDays };
  })();

  it('sends a runner to the road on a good share of camp days, on three maps at least', () => {
    const maps = new Set(gathered.errands.map((e) => e.map));
    expect(maps.size, `runners only on ${[...maps].join(', ')}`).toBeGreaterThanOrEqual(3);
    expect(gathered.errands.length / gathered.campDays).toBeGreaterThan(0.15);
  });

  it('meets road company only, inside the camp day, and holds them at the turn-off for it', () => {
    for (const { map, seed, day, errand } of gathered.errands) {
      expect(errand.leave).toBeGreaterThanOrEqual(CAMP_DAY.wake);
      expect(errand.back).toBeLessThanOrEqual(CAMP_DAY.sleep);
      const t = travellersOn(map).find((x) => x.id === errand.travellerId)!;
      expect(t.npcId, `${errand.travellerId} is canon's`).toBeNull();
      // During the meeting, and at both ends of it, the traveller is standing on the turn-off.
      const built = buildFieldMap(fieldMap(map)!, { seed });
      const stops = placedCircuit(t, built.placed).map((s) => s.at);
      for (const h of [errand.arrive + 0.01, (errand.arrive + errand.part) / 2, errand.part - 0.01]) {
        const where = whereabouts(built.world, stops, day, phaseAfterMeeting(errand, t.id, atHour(h)), hoursFor(t.id));
        expect(where?.at, `${t.id} not at the turn-off at ${h.toFixed(2)}`).toEqual(errand.turnOff);
      }
      // And the runner stands beside them, on the last tile of the way.
      expect(cheb(errand.way[errand.way.length - 1]!, errand.turnOff)).toBe(1);
    }
  });

  it('brings a visitor some days, only as fast as nine travellers in ten walk, never while pitching or striking', () => {
    expect(gathered.visits.length, 'nobody ever visits a camp').toBeGreaterThan(0);
    for (const { world, camp, day, visit, errandId } of gathered.visits) {
      const tiles = visit.there.length + visit.onward.length - 2;
      const walking = visit.in - visit.setOut - (visit.leave - visit.arrive);
      expect(tiles / walking).toBeLessThanOrEqual(VISIT_PACE_CAP + 1e-9);
      if (day === Math.max(camp.from, 1)) expect(visit.arrive).toBeGreaterThanOrEqual(CAMP_DAY.pitched);
      if (day === camp.to - 1) expect(visit.leave).toBeLessThanOrEqual(CAMP_DAY.strike);
      expect(visit.travellerId).not.toBe(errandId);
      // At the fire for the visit, at a place before and after.
      const seat = { x: camp.at.x + 1, y: camp.at.y };
      expect(visitorAt(world, visit, atHour((visit.arrive + visit.leave) / 2), seat).at).toEqual(seat);
      expect(visitorAt(world, visit, atHour(visit.setOut - 0.5), seat).resting).toBe(true);
      expect(visitorAt(world, visit, atHour(visit.in + 0.5), seat).resting).toBe(true);
    }
  });
});

describe('what the talk row says about somebody busy with a camp', () => {
  it('names the visit or the trade in the camp kind\'s own words, and nothing for anybody else', () => {
    expect(busyLine('visit', 'the carrier', 'drovers')).toBe('The carrier has come out to the camp to eat, and for goat hair for flour.');
    expect(busyLine('trade', 'the pilgrim', 'dacoits')).toMatch(/^The pilgrim has stopped at the turn-off/);
    expect(busyLine('chore', 'the carrier', 'drovers')).toBeNull();
    expect(busyLine('visit', 'the carrier', null)).toBeNull();
  });
});

describe('the colour a way is worn into the ground', () => {
  const channels = (c: number) => [(c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff];

  it('is the ground itself, darker -- never a colour painted on top of it', () => {
    // The owner's note: a brown line sat on grass and snow alike. Worn ground keeps its own hue.
    const grass = 0x9fb86a;
    const worn = channels(troddenColour(grass, false));
    const [r, g, b] = channels(grass);
    expect(worn[1]).toBeGreaterThan(worn[0]!);
    expect(worn[1]).toBeGreaterThan(worn[2]!);
    expect(worn.every((c, i) => c < [r, g, b][i]!)).toBe(true);
  });

  it('presses prints in mud, snow and sand deeper than a line worn through grass', () => {
    const snow = 0xe6e8ec;
    expect(channels(troddenColour(snow, true))[0]).toBeLessThan(channels(troddenColour(snow, false))[0]!);
    for (const ground of ['wetland', 'snow', 'desert', 'coast']) expect(PRINTED_GROUND.has(ground), ground).toBe(true);
    for (const ground of ['plains', 'hills', 'forest']) expect(PRINTED_GROUND.has(ground), ground).toBe(false);
  });

  it('shows the way faintly across water and mountain, never as prints on them', () => {
    for (const ground of ['river', 'mountains', 'lava_field']) {
      expect(CROSSED_GROUND.has(ground), ground).toBe(true);
      expect(PRINTED_GROUND.has(ground), `${ground} is printed`).toBe(false);
    }
  });

  it('draws the rails, the ropes and the sky pool as the grass line, walked like any ground', () => {
    expect(carriesTint({ biome: 'sea', track: true })).toBe(true);
    expect(carriesTint({ biome: 'sky_island', plank: true })).toBe(true);
    expect(carriesTint({ biome: 'sky_water' })).toBe(true);
    expect(carriesTint({ biome: 'plains' })).toBe(false);
    expect(CROSSED_GROUND.has('sky_water')).toBe(false);
  });

  it('takes a hex string as well as a number', () => {
    expect(troddenColour('#9fb86a', false)).toBe(troddenColour(0x9fb86a, false));
  });
});

describe('nobody is drawn standing in the sea', () => {
  it('places everybody on ground a person can stand on, on every map at every hour', () => {
    // The owner's question: is anybody pushed into the ocean when people make room for each other?
    // This does what `updateTravellers` does -- every traveller, trader, visitor and camp person,
    // then `untangle` -- and checks every tile they end up on. The sea is never walkable; the rails
    // and ropes over it are, as they are for the player.
    let checked = 0;
    for (const map of fieldMaps) {
      const { world, walked, roster, out, places } = camps(map.id, 'a');
      for (let day = 0; day < DAYS; day++) {
        const camp = out.find((c) => c.day === day)?.camp ?? null;
        const way = camp ? wayIn(world, camp, walked, places) : null;
        const errand = camp ? runnerErrand(world, camp, way, roster, day) : null;
        const visits = camp ? campVisitors(world, camp, way, roster, day, errand) : [];
        for (let h = 6; h <= 20; h += 2) {
          const phase = atHour(h + 0.3);
          const folk = camp ? campPlacements(world, camp, day, phase, errand) : [];
          const seats = camp ? standingRoom(world, camp).filter((p) => !folk.some((f) => f.at && cheb(f.at, p) === 0)) : [];
          const placed = [
            ...roster.map((t) => {
              const v = visits.find((x) => x.travellerId === t.id);
              if (v) return { id: t.id, where: visitorAt(world, v, phase, seats[0] ?? camp!.at) };
              return { id: t.id, where: whereabouts(world, t.stops, day, phaseAfterMeeting(errand, t.id, phase), hoursFor(t.id)) };
            }),
            ...folk
              .filter((f) => f.at)
              .map((f) => ({ id: f.id, where: { at: f.at!, heading: null, resting: false, from: f.at!, to: f.at! } }))
          ];
          const room = untangle(world, placed);
          for (const p of placed) {
            if (!p.where || p.where.resting) continue;
            const at = room.get(p.id)!;
            checked++;
            expect(isWalkable(world.tiles[at.y]![at.x]!), `${map.id} day ${day} ${h}:00 ${p.id} at ${at.x},${at.y}`).toBe(true);
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });
});

describe('a camp stands on the grass, never on the edge', () => {
  it('puts its fire, its things and its people only on campable ground, with room for all of them', () => {
    // The owner's ruling, after the first island camps put a tent on the rim and a sack on the
    // planks: on the grass or not at all. Every camp on every map, every hour.
    let camps = 0;
    for (const map of fieldMaps) {
      for (const seed of SEEDS) {
        const { world, out } = campsOn(map.id, seed);
        const seen = new Set<string>();
        for (const { camp, day } of out) {
          if (seen.has(camp.id)) continue;
          seen.add(camp.id);
          camps++;
          expect(campable(world, camp.at), `${map.id} ${seed} ${camp.id}: the fire is on the edge`).toBe(true);
          const props = campSpots(world, camp).around.slice(0, PROPS_AROUND[camp.kind]);
          expect(props.length, `${camp.id}: no room for its things, which would stack on the fire`).toBe(PROPS_AROUND[camp.kind]);
          for (const p of props) expect(campable(world, p), `${camp.id}: a prop at ${p.x},${p.y} is on the edge`).toBe(true);
          for (let h = 0; h < 24; h += 3) {
            for (const f of campPlacements(world, camp, day, atHour(h + 0.2))) {
              if (!f.at || f.activity === 'road' || f.activity === 'trade' || f.activity === 'home') continue;
              expect(campable(world, f.at), `${camp.id} ${f.slot} at ${f.at.x},${f.at.y} at ${h}:00`).toBe(true);
            }
          }
        }
      }
    }
    expect(camps).toBeGreaterThan(50);
  });

  it('keeps off the rim of a sky island and off its planks', () => {
    const island = (biome: string, extra: object = {}) => ({ biome, ...extra });
    // A 5x5 island with sky all round, and a plank in the middle of one side.
    const tiles = [0, 1, 2, 3, 4, 5, 6].map((y) =>
      [0, 1, 2, 3, 4, 5, 6].map((x) => ({
        x,
        y,
        ...(x === 0 || y === 0 || x === 6 || y === 6 ? island('open_sky') : island('sky_island'))
      }))
    );
    tiles[3]![5] = { x: 5, y: 3, ...island('sky_island', { plank: true }) };
    const world = { width: 7, height: 7, tiles } as never;
    expect(campable(world, { x: 3, y: 3 }), 'the middle of the island').toBe(true);
    expect(campable(world, { x: 1, y: 3 }), 'the rim, beside open sky').toBe(false);
    expect(campable(world, { x: 4, y: 3 }), 'beside the plank').toBe(false);
    expect(campable(world, { x: 5, y: 3 }), 'the plank itself').toBe(false);
  });
});
