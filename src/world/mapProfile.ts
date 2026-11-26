import type { Point, World } from './types';
import type { FieldMapWorld } from './fieldMap';

export interface MapProfile {
  id: string;
  generation: number;
  width: number;
  height: number;
  anchors: Readonly<Record<string, Point>>;
  palette: string;
}

export interface BoundarySample {
  elevation: number;
  river: boolean;
  road: boolean;
}

export type FieldEdge = 'north' | 'east' | 'south' | 'west';

export interface FieldBoundary {
  a: { mapId: string; edge: FieldEdge };
  b: { mapId: string; edge: FieldEdge };
  /** Samples are oriented west to east or north to south in each map. */
  samples: readonly BoundarySample[];
  reversed?: boolean;
}

/** An authored seam is read in each side's orientation. Travel links alone never create one. */
export function boundaryFor(profile: MapProfile, boundary: FieldBoundary) {
  const first = boundary.a.mapId === profile.id;
  const second = boundary.b.mapId === profile.id;
  if (first === second) return null;
  const { edge } = first ? boundary.a : boundary.b;
  const length = edge === 'north' || edge === 'south' ? profile.width : profile.height;
  if (boundary.samples.length !== length) throw new Error('Shared field edge length mismatch');
  return {
    edge,
    samples: second && boundary.reversed ? [...boundary.samples].reverse() : boundary.samples
  };
}

export function applyProfileBoundary(world: World, profile: MapProfile, boundary: FieldBoundary): void {
  const input = boundaryFor(profile, boundary);
  if (!input) return;
  const horizontal = input.edge === 'north' || input.edge === 'south';
  const end = input.edge === 'east' || input.edge === 'south';
  for (const [i, sample] of input.samples.entries()) {
    const x = horizontal ? i : end ? world.width - 1 : 0;
    const y = horizontal ? end ? world.height - 1 : 0 : i;
    const tile = world.tiles[y]![x]!;
    tile.elevation = sample.elevation;
    if (sample.river) tile.biome = 'river';
    if (sample.road) tile.road = true;
    if (sample.road && sample.river) tile.bridge = true;
  }
}

/** Runs the same ordered stages for a map and its test profiles. Stages can reject a layout. */
export function generateFromProfile(
  profile: MapProfile,
  base: (profile: MapProfile) => FieldMapWorld,
  stages: readonly ((built: FieldMapWorld, profile: MapProfile) => boolean)[]
): FieldMapWorld | null {
  const built = base(profile);
  if (built.world.width !== profile.width || built.world.height !== profile.height) return null;
  for (const { poi, at } of built.placed) {
    const anchor = profile.anchors[poi.id];
    if (!anchor || anchor.x !== at.x || anchor.y !== at.y) return null;
  }
  return stages.every(stage => stage(built, profile)) ? built : null;
}
