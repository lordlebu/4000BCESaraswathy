// Places, adapted out of the canon bundle.
//
// The sibling to `canon.ts`, which does the same job for species. Canon owns what places
// exist and what is worth finding in them; this turns that into the shapes the engine
// walks. Nothing here knows about React, Phaser or tiles — placing a point of interest on
// actual ground is `world/fieldMap.ts`, and it takes these as input.
//
// Canon deliberately says nothing about layout. A field map carries a biome palette and a
// list of points of interest, and the generator decides where the wetland goes. That split
// is what lets Lothal be a real authored place without anyone hand-drawing a tilemap.

import placesBundle from '../../data/canon/places.json';
import type { BiomeId, Landmass } from '../world/types';
import { type Climate, DELTA_CLIMATE } from '../world/weather';

/**
 * A road off a map: what carries you, the painting, the way, and who sees you off. Canon's
 * `field_map.roads`, stated from both ends. The game owns how long it takes (`CROSSING_MS`).
 */
export interface Road {
  to: string;
  by: string;
  art: string;
  prose: string[];
  keeper: { npc: string; line: string };
}

/** A journey's opening: a saying alone, then painted plates. See canon's `field_map.prologue`. */
export interface Prologue {
  opening: string;
  plates: { art: string; lines: string[]; saying: string | null }[];
}

export interface FieldMap {
  id: string;
  name: string;
  region: string;
  /** The palette the generator draws terrain from, roughly in order of dominance. */
  seedBiomes: BiomeId[];
  scale: 'small' | 'large';
  /**
   * The shape of the ground, as distinct from its size. Absent in canon means square, which is
   * what every map was until the crossing needed otherwise. See the field map schema.
   */
  proportion: 'square' | 'portrait';
  pointsOfInterest: string[];
  /**
   * Field maps reachable from this one — the overworld's edges.
   *
   * Canon states each edge on both maps rather than making one direction authoritative, so
   * the overworld can be walked either way without inverting a relation. `neighboursOf`
   * checks that, since a one-sided edge is a dead end nobody notices until a player hits it.
   */
  neighbours: string[];
  /**
   * Where the cart, the boat or the line leaves this map from: the only places a traveller can go on
   * to a neighbour. The first is where somebody arriving is set down, unless `arrivesAt` says. The owner's ruling of 27
   * September -- maps are left from designated places, as a cart leaves a yard and not a field.
   */
  departsFrom: string[];
  /** Where a traveller arriving is set down, when canon names somewhere other than the first cart point. */
  arrivesAt: string | null;
  /**
   * The sky this place gets, as relative weights per weather.
   *
   * Canon owns it because a delta and a desert should not share one. Falls back to the
   * delta's when canon stays quiet, which is a guess rather than a reading — the day a map
   * without one lands somewhere arid, it will be obvious and wrong.
   */
  climate: Climate;
  /**
   * Where this map sits on the overworld, in abstract 0-100 units, or null if canon is quiet.
   *
   * Not latitude and longitude, and canon says why: a real basemap would make a claim about a
   * post-cataclysm continent that canon does not make. The drawing reads these; it does not
   * invent them, which is the noun/verb line this project runs on.
   */
  coordinates: { x: number; y: number } | null;
  /**
   * The landform, which decides how the generator shapes this map's ground.
   *
   * Canon still does not describe tiles — it says what kind of place this is. Null when canon
   * has not declared one, which the generator reads as a plain bowl.
   */
  relief: string | null;
  /**
   * Craft lying ready on this map when the traveller arrives, as canon vehicle ids. Empty for
   * every map but Lothal, which has the dugout.
   *
   * **Presence, not an unlock.** Canon says a dugout is *here*; everything about using one --
   * where it is moored, boarding, speed, that the traveller keeps it in the kit after stepping
   * ashore -- is play, and lives in the game. A vehicle can only travel over its own `crosses`
   * biomes, and canon's lint refuses one listed on a map with none of them in its palette.
   * See canon's `docs/decisions.md`, *A dugout at Lothal*.
   */
  vehicles: string[];
  /** What the player reads on first arriving. */
  arrival: string;
  /**
   * How a journey that begins here opens, or null. Canon's prose and sayings; the game owns the
   * pacing. Only Lothal has one. See `ui/Opening.tsx`.
   */
  prologue: Prologue | null;
  /** The roads off this map, one per neighbour. See `Road` and `ui/Journey.tsx`. */
  roads: Road[];
  /** The firsts this map marks with a card: a boat lent, a line first ridden. See `content/firsts.ts`. */
  firsts: First[];
  /** The landmass this map is on, from its region. Every map so far is on Jambhudweep. */
  continent: Landmass;
  /**
   * An edge of the map that belongs to another landmass: the land joined to that edge, as far
   * as the sea, is that landmass. Empty for every map but the Aravali, whose northern shore is
   * Mainland Asia. Canon says which edge; `world/landmass.ts` finds the ground.
   */
  landmassEdges: Partial<Record<MapEdge, Landmass>>;
}

export type MapEdge = 'north' | 'south' | 'east' | 'west';

/**
 * Canon's `field_map.firsts`: the first time a vehicle is lent or ridden here, said once with a card.
 * Canon says who and where and in what words; the game owns when -- `LEND_FROM_DAY` in `tiers.ts` --
 * and what the card does (`content/firsts.ts`).
 */
export interface First {
  id: string;
  /** A game-owned vehicle id, resolved by `test/gameOwned.test.ts`. */
  vehicle: string;
  npc: string;
  /** Where the person will do it. Empty means wherever the vehicle is boarded. */
  at: string[];
  art: string;
  prose: string[];
  line: string;
  /** What they say when asked before the game's time for it has come; null when there is no wait. */
  notYet: string | null;
}

export type PoiKind =
  | 'settlement'
  | 'wilderness'
  | 'eco_site'
  | 'archaeological_site'
  | 'anomaly'
  | 'travel_node';

export interface SubLocation {
  id: string;
  name: string;
  description: string;
  /** Discovery or vocabulary ids needed to get in. How a cave that is "too dark" opens later. */
  requires: string[];
}

export interface PointOfInterest {
  id: string;
  name: string;
  fieldMap: string;
  kind: PoiKind;
  /** Which of the map's biomes this can sit on. The placer needs somewhere plausible. */
  terrain: BiomeId[];
  /**
   * Whether the place wants height, which `terrain` cannot say.
   *
   * A biome is what the ground is made of; this is where on the slope it sits. Read against the
   * generator's three terraces -- the same ones cliffs are drawn between. A preference, never a
   * rule: a map with no high ground still has to put the place somewhere.
   */
  stands: 'high' | 'low' | 'either';
  /**
   * Which side of a crossing this place is on.
   *
   * `either` for every map that is one country rather than two shores, which is all of them but
   * the Aravali. See `shoreBias` for why a generator with no opinion put the rail-head on the
   * wrong side of the water.
   */
  shore: 'near' | 'far' | 'either';
  description: string;
  arrival: string;
  discoveries: string[];
  npcs: string[];
  subLocations: SubLocation[];
  /** The entity this place is the wreck of, if it is one. Lothal is a camp and a ruin at once. */
  ruinOf: string | null;
}

/** Something an NPC says, and what it takes to hear — or to understand — it. */
export interface Line {
  text: string;
  /**
   * Discovery or vocabulary ids needed first.
   *
   * Read as *observed* rather than finished, and it has to be: Thrali will only name the
   * silver water once you have seen it, and the word he gives is what the last rung of that
   * same discovery requires. Demanding completion would deadlock the pair.
   */
  requires: string[];
  /** Discovery, vocabulary, field question or recipe ids this opens. */
  gives: string[];
  /**
   * An item handed over to hear this, or null.
   *
   * The gift loop, and it is one item one person wants rather than a price. Canon has no
   * currency and inventing one would be a design decision made in a data file. Uma wants a
   * reed mat for the kiln shed and shows you a bedroll for it; Pell wants a hawser and shows
   * you the span he has needed for eleven years.
   */
  costs: string | null;
}

export interface Npc {
  id: string;
  name: string;
  role: string;
  /**
   * Male or female, or null where canon has not said.
   *
   * Canon records it because it tracks descent -- `descended_from` on people, reincarnation on
   * characters, and a Mask Family schism running four hundred years through named parents and
   * children. A lineage cannot be followed without knowing who can bear a child.
   *
   * Not a pronoun. An earlier field tried to be both and could be neither.
   */
  sex: 'male' | 'female' | null;
  foundAt: string[];
  /** Whether they would join the settlement at the end, having been helped. */
  wouldSettle: boolean;
  /** What they speak. Words they teach belong to it. */
  language: string;
  /** Discoveries and questions they can move along. A lead, not an answer. */
  knows: string[];
  /** In canon order. This is the only route by which a word can be learned. */
  lines: Line[];
}

interface RawFieldMap {
  id: string; name: string; region: string; seed_biomes: string[];
  scale?: string; proportion?: string; points_of_interest?: string[]; neighbours?: string[]; arrival?: string;
  climate?: Climate; coordinates?: { x: number; y: number }; relief?: string; vehicles?: string[];
  departs_from?: string[]; arrives_at?: string; prologue?: { opening: string; plates: { art: string; lines: string[]; saying?: string }[] }; roads?: Road[]; landmass_edges?: Record<string, string>;
  firsts?: { id: string; vehicle: string; npc: string; at?: string[]; art: string; prose: string[]; line: string; not_yet?: string }[];
}
interface RawPoi {
  id: string; name: string; field_map: string; kind: string; terrain?: string[]; stands?: string; shore?: string;
  description?: string; arrival?: string; discoveries?: string[]; npcs?: string[];
  sub_locations?: { id: string; name: string; description?: string; requires?: string[] }[];
  ruin_of?: string;
}
interface RawNpc {
  id: string; name: string; role?: string; sex?: string; found_at?: string[]; would_settle?: boolean;
  language?: string; knows?: string[];
  lines?: { text: string; requires?: string[]; gives?: string[]; costs?: string }[];
}

const raw = placesBundle as {
  regions: { id: string; continent?: string }[];
  field_maps: RawFieldMap[];
  points_of_interest: RawPoi[];
  npcs: RawNpc[];
  peoples?: { id: string; given_names: string[] }[];
};

/**
 * The names each of canon's living peoples gives its children, keyed by culture id.
 *
 * **Canon's, not the game's.** A name is a noun, and the strangers on the road were the first
 * people the game met that canon had not written -- so canon declared names for their peoples in
 * `cultures.json` rather than the engine inventing any. Only cultures that carry a list cross the
 * export. Absent entirely in a bundle older than 2.29.0, which reads as no names: strangers then
 * stay "a carrier", which is what they were.
 */
export const givenNames: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  (raw.peoples ?? []).map((p) => [p.id, Object.freeze([...p.given_names])])
);

/** Region id to the landmass it is on. */
const continentOf = new Map(raw.regions.map((r) => [r.id, r.continent ?? 'jambhudweepa']));

export const fieldMaps: FieldMap[] = raw.field_maps.map((m) => ({
  id: m.id,
  name: m.name,
  region: m.region,
  seedBiomes: m.seed_biomes as BiomeId[],
  scale: (m.scale ?? 'small') as 'small' | 'large',
  proportion: (m.proportion ?? 'square') as 'square' | 'portrait',
  pointsOfInterest: m.points_of_interest ?? [],
  neighbours: m.neighbours ?? [],
  climate: m.climate ?? DELTA_CLIMATE,
  coordinates: m.coordinates ?? null,
  relief: m.relief ?? null,
  vehicles: m.vehicles ?? [],
  departsFrom: m.departs_from ?? [],
  arrivesAt: m.arrives_at ?? null,
  arrival: m.arrival ?? '',
  prologue: m.prologue ? { opening: m.prologue.opening, plates: m.prologue.plates.map((p) => ({ art: p.art, lines: p.lines, saying: p.saying ?? null })) } : null,
  roads: (m.roads ?? []).map((r) => ({ to: r.to, by: r.by, art: r.art, prose: r.prose, keeper: { npc: r.keeper.npc, line: r.keeper.line } })),
  firsts: (m.firsts ?? []).map((f) => ({
    id: f.id,
    vehicle: f.vehicle,
    npc: f.npc,
    at: f.at ?? [],
    art: f.art,
    prose: f.prose,
    line: f.line,
    notYet: f.not_yet ?? null
  })),
  continent: (continentOf.get(m.region) ?? 'jambhudweepa') as Landmass,
  landmassEdges: (m.landmass_edges ?? {}) as Partial<Record<MapEdge, Landmass>>
}));

export const pointsOfInterest: PointOfInterest[] = raw.points_of_interest.map((p) => ({
  id: p.id,
  name: p.name,
  fieldMap: p.field_map,
  kind: p.kind as PoiKind,
  terrain: (p.terrain ?? []) as BiomeId[],
  stands: (p.stands ?? 'either') as 'high' | 'low' | 'either',
  shore: (p.shore ?? 'either') as 'near' | 'far' | 'either',
  description: p.description ?? '',
  arrival: p.arrival ?? '',
  discoveries: p.discoveries ?? [],
  npcs: p.npcs ?? [],
  subLocations: (p.sub_locations ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description ?? '',
    requires: s.requires ?? []
  })),
  ruinOf: p.ruin_of ?? null
}));

export const npcs: Npc[] = raw.npcs.map((n) => ({
  id: n.id,
  name: n.name,
  role: n.role ?? '',
  sex: (n.sex ?? null) as 'male' | 'female' | null,
  foundAt: n.found_at ?? [],
  wouldSettle: n.would_settle === true,
  language: n.language ?? '',
  knows: n.knows ?? [],
  lines: (n.lines ?? []).map((l) => ({
    text: l.text,
    requires: l.requires ?? [],
    gives: l.gives ?? [],
    costs: l.costs ?? null
  }))
}));

const mapsById = new Map(fieldMaps.map((m) => [m.id, m]));
const poisById = new Map(pointsOfInterest.map((p) => [p.id, p]));
const npcsById = new Map(npcs.map((n) => [n.id, n]));

export function fieldMap(id: string): FieldMap | null {
  return mapsById.get(id) ?? null;
}

export function poi(id: string): PointOfInterest | null {
  return poisById.get(id) ?? null;
}

/**
 * The points of interest on a map, in the order canon lists them.
 *
 * Order matters: the placer walks this list and takes ground as it goes, so a map's first
 * point of interest gets the best-fitting tile. Canon controls that by ordering the list.
 */
export function poisOn(fieldMapId: string): PointOfInterest[] {
  const m = mapsById.get(fieldMapId);
  if (!m) return [];
  return m.pointsOfInterest.map((id) => poisById.get(id)).filter((p): p is PointOfInterest => Boolean(p));
}

export function npc(id: string): Npc | null {
  return npcsById.get(id) ?? null;
}

export function npcsAt(poiId: string): Npc[] {
  return npcs.filter((n) => n.foundAt.includes(poiId));
}

/**
 * Everybody, for a caller that wants the whole cast rather than whoever is standing here.
 *
 * A copy, not the backing array — a Records tab or a test iterating this must not be able to
 * reorder the list the placer and `npcsAt` both read.
 */
export function allNpcs(): Npc[] {
  return [...npcs];
}

/**
 * The field maps reachable from one, resolved to entities.
 *
 * Silently drops an id canon names but does not define, so a half-authored edge cannot crash
 * the overworld — `neighbours` on the raw entity is still there if you need to see the gap.
 */
/**
 * Whether the traveller can leave this map from where they stand, or where they would have to go.
 *
 * A map with no cart points in canon can be left from anywhere, which is every map before the ruling
 * and any added without them; canon's lint now refuses a map with neighbours and none.
 */
export function mayLeaveFrom(fieldMapId: string, standingOn: string | null): { ok: true } | { ok: false; why: string } {
  const points = fieldMap(fieldMapId)?.departsFrom ?? [];
  if (points.length === 0 || (standingOn && points.includes(standingOn))) return { ok: true };
  const names = points.map((id) => (poi(id)?.name ?? id).replace(/^The /, 'the '));
  const where = names.length === 1 ? names[0]! : `${names.slice(0, -1).join(', ')} or ${names.at(-1)}`;
  return { ok: false, why: `The cart leaves from ${where}.` };
}

/**
 * Where somebody arriving on this map is set down: where canon says arrivals come in, else its first
 * cart point, else null for its start.
 *
 * The two differ on the Aravali, which is left from the First Pier and the Far Landing but arrived
 * at by the Rail-Head -- "the arrival, and the map's one ordinary place", which is what its arrival
 * prose describes. Reading only the cart points set every arriving traveller down on a floating
 * island in the middle of the strait.
 */
export function arrivalPoint(fieldMapId: string): string | null {
  return arrivalOf(fieldMapId);
}

/** The road from one map to another, or null when there is none. */
export function roadBetween(from: string, to: string): Road | null {
  return fieldMap(from)?.roads.find((r) => r.to === to) ?? null;
}

function arrivalOf(fieldMapId: string): string | null {
  const map = fieldMap(fieldMapId);
  return map?.arrivesAt ?? map?.departsFrom[0] ?? null;
}

export function neighboursOf(fieldMapId: string): FieldMap[] {
  const from = fieldMap(fieldMapId);
  if (!from) return [];
  return from.neighbours.map((id) => fieldMap(id)).filter((m): m is FieldMap => m !== null);
}
