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

export interface FieldMap {
  id: string;
  name: string;
  region: string;
  /** The palette the generator draws terrain from, roughly in order of dominance. */
  seedBiomes: BiomeId[];
  scale: 'small' | 'large';
  pointsOfInterest: string[];
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

export interface Npc {
  id: string;
  name: string;
  role: string;
  foundAt: string[];
  /** Whether they would join the settlement at the end, having been helped. */
  wouldSettle: boolean;
}

interface RawFieldMap {
  id: string; name: string; region: string; seed_biomes: string[];
  scale?: string; points_of_interest?: string[]; arrival?: string;
}
interface RawPoi {
  id: string; name: string; field_map: string; kind: string; terrain?: string[];
  description?: string; arrival?: string; discoveries?: string[]; npcs?: string[];
  sub_locations?: { id: string; name: string; description?: string; requires?: string[] }[];
  ruin_of?: string;
}
interface RawNpc {
  id: string; name: string; role?: string; found_at?: string[]; would_settle?: boolean;
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
  wouldSettle: n.would_settle === true
}));

const mapsById = new Map(fieldMaps.map((m) => [m.id, m]));
const poisById = new Map(pointsOfInterest.map((p) => [p.id, p]));

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

export function npcsAt(poiId: string): Npc[] {
  return npcs.filter((n) => n.foundAt.includes(poiId));
}
