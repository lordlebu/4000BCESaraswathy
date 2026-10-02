// The people who keep a camp, and what they are doing at each hour.
//
// **A camp used to be a picture and a card.** Smoke, a fire ring, a shelter, and three people who
// existed only in the card's prose: nobody was drawn and nobody could be spoken to. This module puts
// them on the ground. Three to a camp -- one who leads, a follower who is also the camp's runner to
// the road, and a follower who keeps the fire at night -- each standing somewhere because of what
// they are doing, and doing it because of the hour. See `docs/living-camps.md`.
//
// **Nothing here is saved, and that is the same decision `travellers.ts` makes.** Who is at a camp is
// a pure function of the camp, which is already a pure function of the seed, the map and the day;
// where each of them stands is a pure function of the hour. Adding a whole camp's life cost no save
// version, and the same seed puts the same milker at the same fold on every machine.
//
// **They are travellers who do not travel.** Each is a `Traveller` with an empty circuit and a
// `campId`, so the talk row, its marker, calling out and tapping somebody on the map -- everything
// `presence.ts` and the scene already do for people on the road -- work for them unchanged.
//
// **Nobody here is a threat.** No line holds anything up, the dacoits' toll is an arrangement with
// the salt carriers, and nobody follows the player: they keep to their spots and the way in.
//
// Pure: no React, no Phaser, no clock. The caller owns the hour.

import campLifeData from '../../data/camp-life.json';
import type { Point, World } from '../world/types';
import { isWalkable } from '../world/generate';
import { tileHash, weightedPickFor } from '../world/rng';
import { givenNames } from './places';
import { lookFor } from './looks';
import { CAMP_DAY, MEET_HOURS, RUNNER_PACE, VISIT_HOURS, VISIT_PACE_CAP } from './tiers';
import { FIRST_DAY, PROPS_AROUND, campSpots, type CampKind, type Encampment, type WayIn } from './encampments';
import {
  STRANGER_CULTURES,
  alongAt,
  atHour,
  givenNameFor,
  hourOf,
  hoursFor,
  indexAlong,
  travellersOn,
  wayBetween,
  type StrangerCulture,
  type Traveller
} from './travellers';

/** The three people a camp has, by what they do there. */
export type CampSlot = 'leader' | 'runner' | 'watch';
export const CAMP_SLOTS: readonly CampSlot[] = ['leader', 'runner', 'watch'];

/**
 * What somebody at a camp is doing. Each is a stretch of the day (`CAMP_DAY`), except the last
 * three, which are the runner's errand to the road and only happen on a day there is one.
 */
export type CampActivity =
  | 'pitch'
  | 'relight'
  | 'chore'
  | 'shade'
  | 'meal'
  | 'evening'
  | 'watch'
  | 'asleep'
  | 'strike'
  | 'road'
  | 'trade'
  | 'home';

interface KindWords {
  people: Record<CampSlot, { title: string; about: string; body: string; culture: string }>;
  doing: Record<string, string | Record<CampSlot, string>>;
  says: Record<CampSlot, string>;
  trades: string;
  eats: string;
}

/** The words, from `data/camp-life.json`. */
export const CAMP_WORDS: Readonly<Record<CampKind, KindWords>> = (
  campLifeData as unknown as { kinds: Record<CampKind, KindWords> }
).kinds;

/** What the talk row says about somebody on the road who is busy with a camp. See the file's `road`. */
const ROAD_WORDS = (campLifeData as unknown as { road: Record<'visit' | 'trade', string> }).road;

/**
 * "The carrier has come out to the camp to eat": the line the talk row adds about a road traveller
 * who is visiting a camp or trading with its runner, or null for anybody not busy with one.
 */
export function busyLine(doing: string | null | undefined, who: string, kind: CampKind | null): string | null {
  if (!kind || (doing !== 'visit' && doing !== 'trade')) return null;
  const Who = who[0]!.toUpperCase() + who.slice(1);
  return ROAD_WORDS[doing].replace('{Who}', Who).replace('{trades}', CAMP_WORDS[kind].trades);
}

/** Somebody who keeps a camp. A `Traveller`, so the road's machinery is theirs too. */
export interface CampPerson extends Traveller {
  campId: string;
  slot: CampSlot;
  kind: CampKind;
  /** What they are called before you know their name: "the head drover". */
  title: string;
}

const isCulture = (c: string): c is StrangerCulture => (STRANGER_CULTURES as readonly string[]).includes(c);

/**
 * The people who keep this camp.
 *
 * Ids are `camp-<turn>-<slot>`: unique on the map, free of the `:` that a met stranger's key is
 * split on, and different for every camp, so the head drover of one camp is not the head drover of
 * the next. Names come from canon's peoples, never one a stranger on this map's road already has,
 * and never two alike in one camp.
 */
export function campPeople(camp: Encampment, fieldMapId: string): CampPerson[] {
  const words = CAMP_WORDS[camp.kind];
  const turn = camp.id.split(':').pop() ?? '0';
  const taken = new Set(
    travellersOn(fieldMapId)
      .map((t) => t.givenName ?? (t.npcId === null ? givenNameFor(`${fieldMapId}:${t.id}`) : null))
      .filter((n): n is string => Boolean(n))
  );
  return CAMP_SLOTS.map((slot) => {
    const who = words.people[slot];
    const id = `camp-${turn}-${slot}`;
    const culture = isCulture(who.culture) ? who.culture : null;
    const names = culture ? (givenNames[culture] ?? []) : [];
    const free = names.filter((n) => !taken.has(n));
    const givenName =
      weightedPickFor(free.length > 0 ? free : names, 'camp-name', { x: 0, y: 0 }, `${camp.id}:${slot}`, (n) => n, () => 1) ?? null;
    if (givenName) taken.add(givenName);
    return {
      id,
      name: `The ${who.title}`,
      role: who.about,
      npcId: null,
      circuit: [],
      conveyance: null,
      art: who.body,
      look: lookFor(`${fieldMapId}:${id}`, who.body),
      culture,
      givenName,
      campId: camp.id,
      slot,
      kind: camp.kind,
      title: who.title
    };
  });
}

/** Whether this is the day a camp pitches, and the day it strikes. */
function campDays(camp: Encampment, day: number): { first: boolean; last: boolean } {
  return { first: day === Math.max(camp.from, FIRST_DAY), last: day === camp.to - 1 };
}

/**
 * What the camp itself looks like at this hour: whether its shelter is up, and how much smoke.
 *
 * **The shelter goes up on the first morning and comes down on the last afternoon**, so a camp
 * arrives and leaves rather than appearing whole and vanishing. The smoke is thick when the fire is
 * fed -- relit at first light, cooked on at dusk -- and a thread through the night.
 */
export function campStage(camp: Encampment, day: number, phase: number): { shelterUp: boolean; smoke: 'thread' | 'steady' | 'thick' } {
  const h = hourOf(phase);
  const { first, last } = campDays(camp, day);
  const shelterUp = !(first && h < CAMP_DAY.pitched) && !(last && h >= CAMP_DAY.strike);
  const night = h >= CAMP_DAY.sleep || h < CAMP_DAY.wake;
  const fed = (h >= CAMP_DAY.wake && h < CAMP_DAY.chores) || (h >= CAMP_DAY.meal && h < CAMP_DAY.sleep);
  return { shelterUp, smoke: night ? 'thread' : fed ? 'thick' : 'steady' };
}

/** Whether people are sitting down to eat: when a visitor or the player can eat with them. */
export function isMealtime(phase: number): boolean {
  const h = hourOf(phase);
  return h >= CAMP_DAY.meal && h < CAMP_DAY.evening;
}

/**
 * What one of a camp's people is doing at this hour.
 *
 * The day is `CAMP_DAY`'s stretches. The leader relights the fire at first light and the watch, who
 * kept it all night, sleeps until the chores; at midday the leader and runner sit out the heat while
 * the watch keeps working; everybody eats, then the kind's evening; then two sleep and the watch
 * keeps the fire. The first morning is pitching and the last afternoon striking. A runner with an
 * errand is on the road for it instead, whatever the hour says.
 */
export function campActivity(
  camp: Encampment,
  slot: CampSlot,
  day: number,
  phase: number,
  errand: RunnerErrand | null = null
): CampActivity {
  const h = hourOf(phase);
  if (slot === 'runner' && errand) {
    if (h >= errand.leave && h < errand.arrive) return 'road';
    if (h >= errand.arrive && h < errand.part) return 'trade';
    if (h >= errand.part && h < errand.back) return 'home';
  }
  if (h >= CAMP_DAY.sleep || h < CAMP_DAY.wake) return slot === 'watch' ? 'watch' : 'asleep';
  const { first, last } = campDays(camp, day);
  if (first && h < CAMP_DAY.pitched && slot !== 'watch') return 'pitch';
  if (last && h >= CAMP_DAY.strike && h < CAMP_DAY.meal && slot !== 'watch') return 'strike';
  if (h < CAMP_DAY.chores) return slot === 'watch' ? 'asleep' : 'relight';
  if (h < CAMP_DAY.shade) return 'chore';
  if (h < CAMP_DAY.afternoon) return slot === 'watch' ? 'chore' : 'shade';
  if (h < CAMP_DAY.meal) return 'chore';
  if (h < CAMP_DAY.evening) return 'meal';
  return 'evening';
}

/** "{name} is mending the hurdles": the rest of that sentence, for one person and what they are doing. */
export function doingLine(kind: CampKind, slot: CampSlot, activity: CampActivity): string {
  const words = CAMP_WORDS[kind].doing[activity];
  if (activity === 'asleep') return 'is asleep in the shelter';
  if (!words) return 'is about the camp';
  return typeof words === 'string' ? words : words[slot];
}


/**
 * Where people can stand at a camp: walkable ground round the fire that no prop stands on and no
 * road, ford or rail runs over -- the near ring first, then the one beyond, each in the camp's own
 * seeded order.
 */
export function standingRoom(world: World, camp: Encampment): Point[] {
  const { around } = campSpots(world, camp);
  const props = new Set(around.slice(0, PROPS_AROUND[camp.kind]).map((p) => `${p.x},${p.y}`));
  props.add(`${camp.at.x},${camp.at.y}`);
  const out: { p: Point; ring: number; r: number }[] = [];
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const p = { x: camp.at.x + dx, y: camp.at.y + dy };
      if (props.has(`${p.x},${p.y}`)) continue;
      const t = world.tiles[p.y]?.[p.x];
      if (!t || !isWalkable(t) || t.road || t.ford || t.bridge || t.track) continue;
      out.push({ p, ring: Math.max(Math.abs(dx), Math.abs(dy)), r: tileHash(world.seed, p.x, p.y, `camp-room:${camp.id}`) });
    }
  }
  return out.sort((a, b) => a.ring - b.ring || a.r - b.r).map((o) => o.p);
}

/** Where one of a camp's people is, what they face, and what they are doing. `at` null while out of sight. */
export interface CampPlacement {
  id: string;
  slot: CampSlot;
  at: Point | null;
  /** The thing they are turned toward: the fire, their work, the shelter, or the way they walk. */
  facing: Point;
  activity: CampActivity;
}

/**
 * Everybody at a camp, placed for this hour.
 *
 * Each person stands on the free tile nearest what they are doing -- the fire, the shelter, their
 * own work -- and never on a tile somebody else already has. Asleep is out of sight, in the
 * shelter. A runner on an errand is on the way in instead, at the point along it the hour says.
 */
export function campPlacements(
  world: World,
  camp: Encampment,
  day: number,
  phase: number,
  errand: RunnerErrand | null = null
): CampPlacement[] {
  const { around } = campSpots(world, camp);
  const shelter = around[0] ?? camp.at;
  const things = around.slice(1, PROPS_AROUND[camp.kind]);
  const room = standingRoom(world, camp);
  const taken = new Set<string>();
  const near = (anchor: Point): Point | null => {
    let best: Point | null = null;
    let bestD = Infinity;
    for (const p of room) {
      if (taken.has(`${p.x},${p.y}`)) continue;
      const d = Math.max(Math.abs(p.x - anchor.x), Math.abs(p.y - anchor.y));
      if (d < bestD) {
        best = p;
        bestD = d;
      }
    }
    return best;
  };
  const choreAt: Record<CampSlot, Point> = {
    leader: things[0] ?? camp.at,
    runner: things[1] ?? camp.at,
    watch: things[0] ?? camp.at
  };

  return CAMP_SLOTS.map((slot) => {
    const id = `camp-${camp.id.split(':').pop() ?? '0'}-${slot}`;
    const activity = campActivity(camp, slot, day, phase, slot === 'runner' ? errand : null);
    if (activity === 'asleep') return { id, slot, at: null, facing: shelter, activity };
    if (errand && (activity === 'road' || activity === 'trade' || activity === 'home')) {
      const along = runnerAlong(world, errand, phase);
      return { id, slot, at: along.at, facing: along.facing, activity };
    }
    const anchor =
      activity === 'chore' ? choreAt[slot] : activity === 'shade' || activity === 'pitch' || activity === 'strike' ? shelter : camp.at;
    const at = near(anchor);
    if (at) taken.add(`${at.x},${at.y}`);
    return { id, slot, at, facing: anchor, activity };
  });
}

// ---------------------------------------------------------------------------------------------
// The road. A camp is supplied the way it would be: somebody walks out to meet the road.

/**
 * A runner's day on the road: out along the way in to meet a traveller where it leaves the road,
 * trade, and walk back. Hours are clock hours.
 */
export interface RunnerErrand {
  /** The road traveller they meet. */
  travellerId: string;
  /** The way, from the fire out to the tile beside the road. */
  way: Point[];
  /** The road tile the traveller stops on. */
  turnOff: Point;
  leave: number;
  arrive: number;
  part: number;
  back: number;
}

/** Where along the way a runner is at this hour, and which way they face. Slower where the ground is. */
function runnerAlong(world: World, errand: RunnerErrand, phase: number): { at: Point; facing: Point } {
  const h = hourOf(phase);
  const { way } = errand;
  const last = way.length - 1;
  if (h >= errand.arrive && h < errand.part) return { at: way[last]!, facing: errand.turnOff };
  const going = h < errand.arrive;
  const t = going ? (h - errand.leave) / (errand.arrive - errand.leave) : (h - errand.part) / (errand.back - errand.part);
  const i = indexAlong(world, way, going ? t : 1 - t);
  const next = way[Math.max(0, Math.min(last, going ? i + 1 : i - 1))]!;
  return { at: way[i]!, facing: next };
}

/** A traveller as `errands` needs one: who, their circuit's stops in order, and whether canon wrote them. */
export interface RoadTraveller {
  id: string;
  npcId: string | null;
  stops: readonly Point[];
}

/** Where a traveller's leg reaches a tile, as a clock hour, or null if it never does. */
function passesAt(world: World, t: RoadTraveller, day: number, tile: Point): { hour: number; from: Point; to: Point } | null {
  if (t.stops.length < 2) return null;
  const leg = ((day % t.stops.length) + t.stops.length) % t.stops.length;
  const from = t.stops[leg]!;
  const to = t.stops[(leg + 1) % t.stops.length]!;
  const way = wayBetween(world, from, to);
  if (way.length < 2) return null;
  const i = way.findIndex((p) => p.x === tile.x && p.y === tile.y);
  if (i < 0) return null;
  const hours = hoursFor(t.id);
  // The middle of the time `whereabouts` has them on that tile, ground and all.
  const along = alongAt(world, way, i);
  return { hour: hourOf(hours.out + along * (hours.in - hours.out)), from, to };
}

/**
 * Today's errand to the road for a camp's runner, or null.
 *
 * **Road company only**, on the owner's ruling of 2 October 2026: canon's named people walk the days
 * canon gave them, and a stop to trade with a dacoit runner is a claim about them. Of the road
 * company whose leg today passes the turn-off, the first -- by id, so it is stable -- whose meeting
 * the runner can make: leaving no earlier than first light, back before the camp sleeps, at
 * `RUNNER_PACE`. Not on the first morning, when everybody is pitching, nor after the last afternoon's
 * striking has begun.
 */
export function runnerErrand(
  world: World,
  camp: Encampment,
  way: WayIn | null,
  roster: readonly RoadTraveller[],
  day: number
): RunnerErrand | null {
  if (!way || way.tiles.length < 3) return null;
  const { first, last } = campDays(camp, day);
  // From the fire out to the tile beside the road: the turn-off itself is the traveller's.
  const out = [...way.tiles].reverse().slice(0, -1);
  const hours = (out.length - 1) / RUNNER_PACE;
  for (const t of [...roster].filter((r) => r.npcId === null).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const pass = passesAt(world, t, day, way.turnOff);
    if (!pass) continue;
    const leave = pass.hour - hours;
    const back = pass.hour + MEET_HOURS + hours;
    if (leave < CAMP_DAY.wake || back > CAMP_DAY.sleep) continue;
    if (first && leave < CAMP_DAY.pitched) continue;
    if (last && back > CAMP_DAY.strike) continue;
    return { travellerId: t.id, way: out, turnOff: way.turnOff, leave, arrive: pass.hour, part: pass.hour + MEET_HOURS, back };
  }
  return null;
}

/**
 * Where a traveller who stops to trade at a turn-off is: held there for the meeting, then on, that
 * much later. The phase to ask `whereabouts` with, given the real one.
 */
export function phaseAfterMeeting(errand: RunnerErrand | null, travellerId: string, phase: number): number {
  if (!errand || errand.travellerId !== travellerId) return phase;
  const start = atHour(errand.arrive);
  const end = atHour(errand.part);
  if (phase < start) return phase;
  if (phase < end) return start;
  return phase - (end - start);
}

/** A visitor's day: out to the camp, sitting a while, and on to where they were going. Clock hours. */
export interface Visit {
  travellerId: string;
  /** From their morning's stop to the fire, and from the fire to the evening's. */
  there: Point[];
  onward: Point[];
  setOut: number;
  arrive: number;
  leave: number;
  in: number;
}

/**
 * Today's visitors to a camp: road company who come to eat, and to do what their trade does there.
 *
 * **A visit replaces a traveller's leg**, so they still set out from one stop at their own hour and
 * are in at the next by their own evening: the day becomes stop, turn-off, the way in, the fire --
 * `VISIT_HOURS` sitting -- and back out the way they came. Offered only when that day can be walked
 * at no more than `VISIT_PACE_CAP`, the pace nine in ten travellers keep, which is what makes a visit
 * occasional on three maps and impossible on the Aravali (`docs/living-camps.md`). Not while the camp
 * is being pitched or struck, and never the runner's traveller of the day, who has an appointment of
 * their own. At most one visitor a day: a camp is three people at a fire. No coin is tossed on top:
 * a leg that can carry the visit is already only one day in two or three, since legs alternate.
 */
export function campVisitors(
  world: World,
  camp: Encampment,
  way: WayIn | null,
  roster: readonly RoadTraveller[],
  day: number,
  errand: RunnerErrand | null
): Visit[] {
  if (!way || way.tiles.length < 2) return [];
  const { first, last } = campDays(camp, day);
  const inward = way.tiles; // turn-off to fire
  for (const t of [...roster].filter((r) => r.npcId === null && r.id !== errand?.travellerId).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (t.stops.length < 2) continue;
    const leg = ((day % t.stops.length) + t.stops.length) % t.stops.length;
    const from = t.stops[leg]!;
    const to = t.stops[(leg + 1) % t.stops.length]!;
    const there = [...wayBetween(world, from, way.turnOff), ...inward.slice(1)];
    const onward = [...[...inward].reverse(), ...wayBetween(world, way.turnOff, to).slice(1)];
    const hours = hoursFor(t.id);
    const walking = (hourOf(hours.in) - hourOf(hours.out)) - VISIT_HOURS;
    const tiles = there.length + onward.length - 2;
    if (walking <= 0 || tiles / walking > VISIT_PACE_CAP) continue;
    const setOut = hourOf(hours.out);
    const arrive = setOut + walking * ((there.length - 1) / tiles);
    // Around the pitching and the striking: nobody sits down to eat in a camp still being put up,
    // or one being taken down.
    if (first && arrive < CAMP_DAY.pitched) continue;
    if (last && arrive + VISIT_HOURS > CAMP_DAY.strike) continue;
    return [{ travellerId: t.id, there, onward, setOut, arrive, leave: arrive + VISIT_HOURS, in: hourOf(hours.in) }];
  }
  return [];
}

/**
 * Where a visitor is at this hour, in the same shape `whereabouts` answers. `seat` is where they sit
 * at the camp, which is the caller's to choose -- the scene keeps the fire's free tiles.
 */
export function visitorAt(
  world: World,
  visit: Visit,
  phase: number,
  seat: Point
): { at: Point; heading: 'north' | 'east' | 'south' | 'west' | null; resting: boolean; from: Point; to: Point } {
  const h = hourOf(phase);
  const from = visit.there[0]!;
  const to = visit.onward[visit.onward.length - 1]!;
  if (h < visit.setOut) return { at: from, heading: null, resting: true, from, to };
  if (h >= visit.in) return { at: to, heading: null, resting: true, from, to };
  if (h >= visit.arrive && h < visit.leave) return { at: seat, heading: null, resting: false, from, to };
  const going = h < visit.arrive;
  const path = going ? visit.there : visit.onward;
  const t = going ? (h - visit.setOut) / (visit.arrive - visit.setOut) : (h - visit.leave) / (visit.in - visit.leave);
  const i = indexAlong(world, path, t);
  const at = path[i]!;
  const next = path[Math.min(path.length - 1, i + 1)]!;
  const dx = next.x - at.x;
  const dy = next.y - at.y;
  const heading = dx === 0 && dy === 0 ? null : Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : dy > 0 ? 'south' : 'north';
  return { at, heading, resting: false, from, to };
}

/** A visitor's reason, in a sentence's middle: "come for goat hair", by the camp's kind. */
export function visitingFor(kind: CampKind): string {
  return CAMP_WORDS[kind].trades;
}
