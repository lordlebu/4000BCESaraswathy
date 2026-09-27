// Settling: the ground, the person who holds it, and the building that goes up on it.
//
// **The endgame of the Settling In plan.** Arrive at a map, help its people, and build a homestead
// with their backing. Canon's `homestead_` says what is true of the world -- which grounds a map
// has, whose each one is, what worries the holder and what would answer it, what the building is
// made of. This module is the rules over that: what can be offered as an answer, whether it answers,
// what building a stage needs and whether it can be raised.
//
// **Talked, never fought.** An answer is one of four approaches -- a word of the holder's tongue, a
// discovery finished, somebody helped who will vouch, a thing carried -- and one that misses gets a
// reply in character and costs nothing. Listening is always open and eases nothing: it draws out
// the hint. Undertale's ACT without the dodging, which is what the owner asked for.
//
// **What the player did is kept in the journey's flags**, which the save's what-you-know half
// already holds: `homestead:<map>:ground:<id>`, `...:eased:<worry>`, `...:built:<stage>`,
// `...:settled`. No new save field and no version bump -- the same reason `sheltered:` is a flag.
//
// Pure: the caller says what the player holds.

import placesBundle from '../../data/canon/places.json';
import type { Point, World } from '../world/types';
import { isWalkable } from '../world/generate';
import { band } from '../world/classify';
import { discovery, offeredAt, vocabulary } from './knowledge';
import { fieldMap, npc, poi } from './places';
import { STANDINGS, type Standing } from './standing';

export type ApproachKind = 'listen' | 'tongue' | 'show' | 'vouch' | 'offer';

export interface Answer {
  approach: Exclude<ApproachKind, 'listen'>;
  word: string | null;
  discovery: string | null;
  person: string | null;
  material: string | null;
}

export interface Worry {
  id: string;
  says: string;
  hint: string;
  notThat: string;
  eased: string;
  metBy: Answer[];
}

export interface Ground {
  id: string;
  at: string;
  name: string;
  heldBy: string;
  prose: string;
  worries: Worry[];
  agrees: string;
}

export interface Stage {
  id: string;
  name: string;
  needs: { id: string; count: number }[];
  backers: number;
  prose: string;
}

export interface Homestead {
  id: string;
  name: string;
  fieldMapId: string;
  grounds: Ground[];
  stages: Stage[];
  settled: string;
}

interface RawAnswer {
  approach: Answer['approach'];
  word?: string;
  discovery?: string;
  person?: string;
  material?: string;
}
interface RawHomestead {
  id: string;
  name: string;
  field_map: string;
  grounds: {
    id: string;
    at: string;
    name: string;
    held_by: string;
    prose: string;
    worries: { id: string; says: string; hint: string; not_that: string; eased: string; met_by: RawAnswer[] }[];
    agrees: string;
  }[];
  stages: { id: string; name: string; needs: { id: string; count: number }[]; backers: number; prose: string }[];
  settled: string;
}

export const homesteads: readonly Homestead[] = (
  ((placesBundle as { homesteads?: RawHomestead[] }).homesteads ?? []) as RawHomestead[]
).map((h) => ({
  id: h.id,
  name: h.name,
  fieldMapId: h.field_map,
  grounds: h.grounds.map((g) => ({
    id: g.id,
    at: g.at,
    name: g.name,
    heldBy: g.held_by,
    prose: g.prose,
    worries: g.worries.map((w) => ({
      id: w.id,
      says: w.says,
      hint: w.hint,
      notThat: w.not_that,
      eased: w.eased,
      metBy: w.met_by.map((m) => ({
        approach: m.approach,
        word: m.word ?? null,
        discovery: m.discovery ?? null,
        person: m.person ?? null,
        material: m.material ?? null
      }))
    })),
    agrees: g.agrees
  })),
  stages: h.stages.map((s) => ({ ...s })),
  settled: h.settled
}));

/** The homestead a map has, or null -- the Aravali has none, on purpose: it is a crossing. */
export function homesteadOn(fieldMapId: string): Homestead | null {
  return homesteads.find((h) => h.fieldMapId === fieldMapId) ?? null;
}

/** The ground a place is, and the homestead it belongs to. */
export function groundAt(poiId: string): { homestead: Homestead; ground: Ground } | null {
  for (const homestead of homesteads) {
    const ground = homestead.grounds.find((g) => g.at === poiId);
    if (ground) return { homestead, ground };
  }
  return null;
}

// ------------------------------------------------------------------------------------------------
// What the player has done, read off the journey's flags.

const prefix = (fieldMapId: string) => `homestead:${fieldMapId}:`;

export interface HomesteadState {
  /** The ground chosen, once a holder has agreed -- or the one being talked about before that. */
  ground: string | null;
  eased: string[];
  built: string[];
  settled: boolean;
}

export function stateOf(fieldMapId: string, flags: readonly string[]): HomesteadState {
  const p = prefix(fieldMapId);
  const mine = flags.filter((f) => f.startsWith(p)).map((f) => f.slice(p.length));
  const of = (kind: string) => mine.filter((f) => f.startsWith(`${kind}:`)).map((f) => f.slice(kind.length + 1));
  return {
    ground: of('ground')[0] ?? null,
    eased: of('eased'),
    built: of('built'),
    settled: mine.includes('settled')
  };
}

/** Flags with one more fact added, never twice. */
function withFlag(flags: readonly string[], flag: string): string[] {
  return flags.includes(flag) ? [...flags] : [...flags, flag];
}

// ------------------------------------------------------------------------------------------------
// Asking.

/** How well a map must know you before a holder will hear you out. */
export const ASK_FROM: Standing = 'known';

/**
 * Whether the player may ask to build on this ground now, or why not.
 *
 * Refused while the map does not know you -- a holder hears out somebody the place vouches for --
 * and on a second ground once another has been agreed: one homestead a map.
 */
export function mayAsk(
  homestead: Homestead,
  ground: Ground,
  state: HomesteadState,
  standing: Standing
): { ok: true } | { ok: false; why: string } {
  const holder = npc(ground.heldBy)?.name ?? 'The holder';
  const other = state.ground && state.ground !== ground.id ? homestead.grounds.find((g) => g.id === state.ground) : null;
  if (other && agreed(other, state)) return { ok: false, why: `You are building at ${other.name} already.` };
  if (STANDINGS.indexOf(standing) < STANDINGS.indexOf(ASK_FROM)) {
    return { ok: false, why: `${holder} would hear you out once people here know you.` };
  }
  return { ok: true };
}

/** The worry the holder is on, or null once every one is answered. */
export function currentWorry(ground: Ground, state: HomesteadState): Worry | null {
  const onThisGround = state.ground === ground.id ? state.eased : [];
  return ground.worries.find((w) => !onThisGround.includes(w.id)) ?? null;
}

/** Whether every worry on this ground is answered. */
export function agreed(ground: Ground, state: HomesteadState): boolean {
  return state.ground === ground.id && ground.worries.every((w) => state.eased.includes(w.id));
}

/** What the player holds that could be offered as an answer. */
export interface Holdings {
  /** Word ids known. */
  words: readonly string[];
  /** Discovery ids finished. */
  finished: readonly string[];
  /** People helped, anywhere. */
  helped: readonly string[];
  /** Material and item ids carried, with counts. */
  carried: Readonly<Record<string, number>>;
}

/** Something the player can say or do in answer, as the card offers it. */
export interface Option {
  kind: ApproachKind;
  /** The discovery, person, word or thing, or null for listening and for a tongue in general. */
  id: string | null;
  label: string;
}

/** The discoveries a map offers, once each -- what can be shown on its grounds. */
function mapDiscoveries(fieldMapId: string): Set<string> {
  const ids = new Set<string>();
  for (const p of fieldMap(fieldMapId)?.pointsOfInterest ?? []) {
    for (const d of offeredAt(p, poi(p)?.discoveries ?? [])) ids.add(d);
  }
  return ids;
}

/**
 * Everything the player could answer with, whatever the worry.
 *
 * **Not only the right answers.** Offering just what would ease the worry would be a quiz with the
 * answer key printed on it; offering everything the player has is the conversation. So: listening;
 * the holder's tongue, if any word of it is known; every discovery finished on this map or one that
 * any answer here names; everybody helped who belongs to this map; and what is carried, a few at a
 * time. A wrong one costs nothing.
 */
export function optionsFor(homestead: Homestead, ground: Ground, holdings: Holdings, peopleHere: readonly string[]): Option[] {
  const holder = npc(ground.heldBy);
  const tongue = holder?.language ?? '';
  const out: Option[] = [{ kind: 'listen', id: null, label: 'Listen' }];
  if (tongue && holdings.words.some((w) => w.startsWith(`word_${tongue}_`))) {
    out.push({ kind: 'tongue', id: null, label: `Answer in ${tongue[0]!.toUpperCase()}${tongue.slice(1)}` });
  }
  const named = new Set(ground.worries.flatMap((w) => w.metBy.map((m) => m.discovery).filter((d): d is string => !!d)));
  const onMap = mapDiscoveries(homestead.fieldMapId);
  for (const d of holdings.finished) {
    if (!onMap.has(d) && !named.has(d)) continue;
    out.push({ kind: 'show', id: d, label: `Show: ${discovery(d)?.name ?? d}` });
  }
  for (const who of holdings.helped) {
    if (!peopleHere.includes(who) || who === ground.heldBy) continue;
    out.push({ kind: 'vouch', id: who, label: `Vouch: ${npc(who)?.name ?? who} speaks for you` });
  }
  for (const [id, n] of Object.entries(holdings.carried).slice(0, 4)) {
    if (n > 0) out.push({ kind: 'offer', id, label: `Offer: ${nameOf(id)}` });
  }
  return out;
}

const nameOf = (id: string): string => {
  const w = vocabulary.find((v) => v.id === id);
  if (w) return w.word;
  return id.replace(/^(material|item)_/, '').replace(/_/g, ' ');
};

/** Whether this option answers this worry. */
export function answers(worry: Worry, option: Option, holderTongue: string): boolean {
  return worry.metBy.some((m) => {
    if (m.approach !== option.kind) return false;
    // Any word of their tongue, or the one named: a general "answer in Kia" meets the first only.
    if (m.approach === 'tongue') return m.word === null || m.word === option.id;
    if (m.approach === 'show') return m.discovery === option.id;
    if (m.approach === 'vouch') return m.person === option.id;
    if (m.approach === 'offer') return m.material === option.id;
    return false;
  }) && (option.kind !== 'tongue' || holderTongue.length > 0);
}

export interface Reply {
  /** What the holder says back. */
  says: string;
  /** The flags after it, with the worry eased when it was answered. */
  flags: string[];
  /** Whether that answered the worry. */
  eased: boolean;
  /** Whether every worry is answered now. */
  agreed: boolean;
}

/**
 * Say or do something in answer to the worry the holder is on.
 *
 * Listening draws out the hint. An answer that meets the worry eases it, and the holder's line says
 * so; one that misses gets their `not_that`. Nothing is spent here: an offered thing is shown, not
 * handed over -- the building is what things are spent on.
 */
export function respond(homestead: Homestead, ground: Ground, flags: readonly string[], option: Option): Reply {
  const p = prefix(homestead.fieldMapId);
  let next = [...flags];
  // Talking about a ground makes it the one being talked about, until another is agreed.
  const state = stateOf(homestead.fieldMapId, next);
  if (state.ground !== ground.id && !(state.ground && agreedOn(homestead, state))) {
    next = next.filter((f) => !f.startsWith(`${p}ground:`) && !f.startsWith(`${p}eased:`));
    next = withFlag(next, `${p}ground:${ground.id}`);
  }
  const worry = currentWorry(ground, stateOf(homestead.fieldMapId, next));
  if (!worry) return { says: ground.agrees, flags: next, eased: false, agreed: true };
  if (option.kind === 'listen') return { says: worry.hint, flags: next, eased: false, agreed: false };
  if (!answers(worry, option, npc(ground.heldBy)?.language ?? '')) {
    return { says: worry.notThat, flags: next, eased: false, agreed: false };
  }
  next = withFlag(next, `${p}eased:${worry.id}`);
  const done = agreed(ground, stateOf(homestead.fieldMapId, next));
  return { says: done ? `${worry.eased} -- ${ground.agrees}` : worry.eased, flags: next, eased: true, agreed: done };
}

function agreedOn(homestead: Homestead, state: HomesteadState): boolean {
  const g = homestead.grounds.find((x) => x.id === state.ground);
  return g ? agreed(g, state) : false;
}

// ------------------------------------------------------------------------------------------------
// Building.

/** The next stage to raise, or null once everything stands. */
export function nextStage(homestead: Homestead, state: HomesteadState): Stage | null {
  return homestead.stages.find((s) => !state.built.includes(s.id)) ?? null;
}

/** How many of the homestead's stages stand. What the map draws. */
export function stagesBuilt(homestead: Homestead, state: HomesteadState): number {
  return homestead.stages.filter((s) => state.built.includes(s.id)).length;
}

/**
 * Whether the next stage can be raised now, or why not, in words.
 *
 * `helpedHere` is how many people of this map the player has helped: hands to raise it.
 */
export function mayBuild(
  homestead: Homestead,
  state: HomesteadState,
  carried: Readonly<Record<string, number>>,
  helpedHere: number
): { ok: true; stage: Stage } | { ok: false; why: string } {
  const ground = homestead.grounds.find((g) => g.id === state.ground);
  if (!ground || !agreed(ground, state)) return { ok: false, why: 'Nobody has agreed to it yet.' };
  const stage = nextStage(homestead, state);
  if (!stage) return { ok: false, why: 'It is built.' };
  const short = stage.needs.filter((n) => (carried[n.id] ?? 0) < n.count);
  if (short.length > 0) {
    return { ok: false, why: `Needs ${short.map((n) => `${n.count} ${nameOf(n.id)} (you carry ${carried[n.id] ?? 0})`).join(', ')}.` };
  }
  if (helpedHere < stage.backers) {
    const more = stage.backers - helpedHere;
    return { ok: false, why: `Needs ${more === 1 ? 'one more pair' : `${more} more pairs`} of hands: somebody here you have helped.` };
  }
  return { ok: true, stage };
}

/** Raise the next stage: the flags with it built, and what it spent. */
export function build(homestead: Homestead, flags: readonly string[], stage: Stage): { flags: string[]; spends: { id: string; count: number }[] } {
  return { flags: withFlag(flags, `${prefix(homestead.fieldMapId)}built:${stage.id}`), spends: stage.needs };
}

/** Whether everything stands, so the people can move in. */
export function readyToSettle(homestead: Homestead, state: HomesteadState): boolean {
  return !state.settled && nextStage(homestead, state) === null && homestead.stages.length > 0;
}

export function settle(homestead: Homestead, flags: readonly string[]): string[] {
  return withFlag(flags, `${prefix(homestead.fieldMapId)}settled`);
}

// ------------------------------------------------------------------------------------------------
// Where it stands on the map.

/**
 * The grounds a building may stand on: dry flat land, or hills.
 *
 * **The owner, 27 September: "hope we don't let people build it on swamp -- ideally on flat land or
 * hill, if there is no water or cliff or road."** The first version took any walkable tile beside
 * the place, and on the Eastern Field that was wetland: a mill standing in the marsh. Forest is
 * flat too, and left out because trees are drawn on it; the mill beside the trees is what rises out
 * of the canopy.
 */
export const BUILDABLE = new Set(['plains', 'settlement', 'desert', 'hills']);

/**
 * How far from its place a homestead may stand, in tiles.
 *
 * Measured on 40 Lothal seeds, the nearest two buildable tiles are one or two tiles from the ground
 * on most, and three to eight on the wet ones -- Lothal is a delta. Six covers 39 of 40 for the
 * Eastern Field and 38 of 40 for the granary. Where nothing dry is that close, the ground says so and
 * cannot be built on; the rule about swamp is not bent to fit.
 */
export const BUILD_RADIUS = 6;

/**
 * Whether a building can stand on this tile.
 *
 * Buildable ground, no road, ford, bridge or line, and **no cliff**: a cliff is drawn where a tile
 * stands a height band above a dry neighbour (`cliffAt` in `game/frames.ts`), so a tile whose dry
 * neighbours are all at its own band has no rock face on either side of it.
 */
export function buildable(world: World, at: Point): boolean {
  const tile = world.tiles[at.y]?.[at.x];
  if (!tile || !BUILDABLE.has(tile.biome) || !isWalkable(tile)) return false;
  if (tile.road || tile.ford || tile.bridge || tile.track) return false;
  const mine = band(tile.elevation);
  for (const d of [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }]) {
    const next = world.tiles[at.y + d.y]?.[at.x + d.x];
    if (!next || WATER_GROUND.has(next.biome)) continue;
    if (band(next.elevation) !== mine) return false;
  }
  return true;
}

/** Ground a cliff never draws against. The same set `cliffAt` refuses. */
const WATER_GROUND = new Set(['sea', 'river', 'coast', 'wetland', 'sky_water']);

/**
 * The tiles the mill and the greenhouse stand on, near the ground's place.
 *
 * **Near it, not on it**: the place's own marker is on its tile. The nearest buildable tile takes
 * the mill and the next the greenhouse, which is two tiles wide and so is kept off the mill's own
 * row beside it. Tiles are tried nearest first in a fixed order, so the answer is the same on every
 * machine for the same map. Null when nothing within `BUILD_RADIUS` will do.
 */
export function buildingTiles(world: World, at: Point, placed: readonly Point[]): { mill: Point; greenhouse: Point } | null {
  const taken = new Set(placed.map((p) => `${p.x},${p.y}`));
  const ring: Point[] = [];
  for (let r = 1; r <= BUILD_RADIUS; r += 1) {
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        ring.push({ x: at.x + dx, y: at.y + dy });
      }
    }
  }
  const fits = ring.filter((p) => !taken.has(`${p.x},${p.y}`) && buildable(world, p));
  const mill = fits[0];
  if (!mill) return null;
  const greenhouse = fits.find((p) => p !== mill && !(p.y === mill.y && Math.abs(p.x - mill.x) < 2));
  return greenhouse ? { mill, greenhouse } : null;
}

/** The place a ground is, by name, for a sentence. */
export const groundPlace = (ground: Ground): string => poi(ground.at)?.name ?? ground.name;
