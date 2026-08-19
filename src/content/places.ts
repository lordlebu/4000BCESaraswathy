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
import type { BiomeId } from '../world/types';
import { type Climate, DELTA_CLIMATE } from '../world/weather';

export interface FieldMap {
  id: string;
  name: string;
  region: string;
  /** The palette the generator draws terrain from, roughly in order of dominance. */
  seedBiomes: BiomeId[];
  scale: 'small' | 'large';
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
  /** What the player reads on first arriving. */
  arrival: string;
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
  /** Discovery, vocabulary or field question ids this opens. */
  gives: string[];
}

export interface Npc {
  id: string;
  name: string;
  role: string;
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
  scale?: string; points_of_interest?: string[]; neighbours?: string[]; arrival?: string;
  climate?: Climate; coordinates?: { x: number; y: number }; relief?: string;
}
interface RawPoi {
  id: string; name: string; field_map: string; kind: string; terrain?: string[];
  description?: string; arrival?: string; discoveries?: string[]; npcs?: string[];
  sub_locations?: { id: string; name: string; description?: string; requires?: string[] }[];
  ruin_of?: string;
}
interface RawNpc {
  id: string; name: string; role?: string; found_at?: string[]; would_settle?: boolean;
  language?: string; knows?: string[];
  lines?: { text: string; requires?: string[]; gives?: string[] }[];
}

const raw = placesBundle as {
  field_maps: RawFieldMap[];
  points_of_interest: RawPoi[];
  npcs: RawNpc[];
};

export const fieldMaps: FieldMap[] = raw.field_maps.map((m) => ({
  id: m.id,
  name: m.name,
  region: m.region,
  seedBiomes: m.seed_biomes as BiomeId[],
  scale: (m.scale ?? 'small') as 'small' | 'large',
  pointsOfInterest: m.points_of_interest ?? [],
  neighbours: m.neighbours ?? [],
  climate: m.climate ?? DELTA_CLIMATE,
  coordinates: m.coordinates ?? null,
  relief: m.relief ?? null,
  arrival: m.arrival ?? ''
}));

export const pointsOfInterest: PointOfInterest[] = raw.points_of_interest.map((p) => ({
  id: p.id,
  name: p.name,
  fieldMap: p.field_map,
  kind: p.kind as PoiKind,
  terrain: (p.terrain ?? []) as BiomeId[],
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
  foundAt: n.found_at ?? [],
  wouldSettle: n.would_settle === true,
  language: n.language ?? '',
  knows: n.knows ?? [],
  lines: (n.lines ?? []).map((l) => ({
    text: l.text,
    requires: l.requires ?? [],
    gives: l.gives ?? []
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
 * The field maps reachable from one, resolved to entities.
 *
 * Silently drops an id canon names but does not define, so a half-authored edge cannot crash
 * the overworld — `neighbours` on the raw entity is still there if you need to see the gap.
 */
export function neighboursOf(fieldMapId: string): FieldMap[] {
  const from = fieldMap(fieldMapId);
  if (!from) return [];
  return from.neighbours.map((id) => fieldMap(id)).filter((m): m is FieldMap => m !== null);
}
