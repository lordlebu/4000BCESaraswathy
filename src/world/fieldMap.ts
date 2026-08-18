// Turning a canon field map into ground the player can walk.
//
// This is the join the whole two-repo split was built for. Canon names Lothal, gives it a
// biome palette and lists six points of interest; it says nothing about where the wetland
// goes, because layout is the engine's business. The generator lays terrain from the seed,
// and this places the authored points onto it.
//
// Authored anchors, procedural connective tissue. Nobody hand-draws a tilemap, and
// Garudasaur's Ledge is still a specific place rather than a cave the generator invented.
//
// Free of React and Phaser, like everything in `world/`, so the tests exercise what ships.

import { generateWorld } from './generate';
import { tileHash } from './rng';
import type { BiomeId, Point, Tile, World } from './types';
import { type FieldMap, type PointOfInterest, poisOn } from '../content/places';

/** A point of interest, once it has ground under it. */
export interface PlacedPoi {
  poi: PointOfInterest;
  at: Point;
}

export interface FieldMapWorld {
  fieldMap: FieldMap;
  world: World;
  placed: PlacedPoi[];
  /** Points of interest canon lists that found no suitable tile. Empty is the goal. */
  unplaced: PointOfInterest[];
}

/**
 * A tile is suitable for a point of interest if its biome is one the point accepts.
 *
 * A point with no `terrain` accepts anywhere walkable — that is the honest reading of
 * canon staying quiet, rather than a reason to drop it.
 */
function suitable(tile: Tile, poi: PointOfInterest, walkable: Set<BiomeId>): boolean {
  if (!walkable.has(tile.biome)) return false;
  return poi.terrain.length === 0 || poi.terrain.includes(tile.biome);
}

/**
 * Where a point of interest lands.
 *
 * Deterministic, and derived from the same `tileHash` the species picker uses, so a seed
 * produces the same Lothal every time. Candidates are gathered in row-major order and
 * indexed by a hash of the seed and the point's own id — not by position in the list — so
 * adding a point to canon does not move the ones already placed.
 *
 * Spacing is enforced by rejection rather than by a grid: the first candidate far enough
 * from everything already placed wins, and the search wraps so a crowded map still lands
 * everything rather than silently dropping the last few.
 */
/**
 * What an out-of-palette biome becomes, in order of preference.
 *
 * `generateWorld` builds a whole continent: highlands, desert, open sea. A field map is one
 * corner of one, and canon says which corner by listing its palette. Without this, Lothal
 * generates 686 tiles of plains and 752 of sea and almost none of the delta it is supposed
 * to be — and the six authored places end up fighting over a handful of tiles.
 *
 * Reclassifying rather than re-generating keeps `generateWorld` and its seed contract
 * untouched: elevation, moisture and the rivers are all still the generator's, and only the
 * biome label moves.
 */
const BECOMES: Record<string, BiomeId[]> = {
  sea: ['coast', 'river', 'wetland'],
  coast: ['wetland', 'river', 'plains'],
  plains: ['wetland', 'coast', 'forest'],
  forest: ['wetland', 'river', 'plains'],
  hills: ['plains', 'coast', 'forest'],
  mountains: ['hills', 'plains', 'coast'],
  desert: ['plains', 'coast', 'wetland'],
  river: ['wetland', 'coast'],
  wetland: ['river', 'coast'],
  settlement: ['plains', 'coast'],
  landmark: ['plains', 'forest']
};

/**
 * Redraw the generated world in the field map's own materials.
 *
 * Settlement is grown as a patch rather than allowed to spread by affinity: a city is a
 * place, not a climate, and Lothal needs enough of it that a camp and a tower are not
 * competing for the same square metre. The patch centre is seeded, so it lands in the same
 * place every time.
 */
function applyPalette(world: World, palette: Set<BiomeId>): void {
  const fallback = [...palette][0]!;
  for (const row of world.tiles) {
    for (const tile of row) {
      if (palette.has(tile.biome)) continue;
      const preferred = (BECOMES[tile.biome] ?? []).find((b) => palette.has(b));
      tile.biome = preferred ?? fallback;
    }
  }

  // Put the landmark back. No field map lists `landmark` in its palette -- and none should, since
  // it is a place rather than a climate and canon's `seed_biomes` describe the country -- so the
  // loop above reclassifies it along with everything else. The destination of the whole journey
  // was being drawn as ordinary marsh on every one of the four maps.
  //
  // Restamped here for the same reason the settlement patch below is stamped rather than seeded:
  // both are things put *on* the land after the land exists.
  const landmark = world.tiles[world.landmark.y]?.[world.landmark.x];
  if (landmark) landmark.biome = 'landmark';

  if (!palette.has('settlement')) return;

  // A ruined city, in tiles. Small enough to walk out of, large enough to hold its own
  // landmarks -- roughly a twelfth of the map across.
  const radius = Math.max(2, Math.round(Math.min(world.width, world.height) / 12));
  const cx = tileHash(world.seed, 0, 0, 'settlement-x') % world.width;
  const cy = tileHash(world.seed, 0, 0, 'settlement-y') % world.height;
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (Math.abs(dx) + Math.abs(dy) > radius) continue;
      const tile = world.tiles[cy + dy]?.[cx + dx];
      if (tile) tile.biome = 'settlement';
    }
  }
}

function gather(world: World, accept: (tile: Tile) => boolean): Point[] {
  const out: Point[] = [];
  for (const row of world.tiles) {
    for (const tile of row) {
      if (accept(tile)) out.push({ x: tile.x, y: tile.y });
    }
  }
  return out;
}

function pick(seed: string, poi: PointOfInterest, candidates: Point[], reject: (at: Point) => boolean): Point | null {
  if (candidates.length === 0) return null;
  const start = tileHash(seed, 0, 0, poi.id) % candidates.length;
  for (let step = 0; step < candidates.length; step += 1) {
    const at = candidates[(start + step) % candidates.length]!;
    if (!reject(at)) return at;
  }
  return null;
}

function placeOne(
  world: World,
  poi: PointOfInterest,
  walkable: Set<BiomeId>,
  palette: Set<BiomeId>,
  taken: Point[],
  minDistance: number
): Point | null {
  const occupied = (at: Point) => taken.some((t) => t.x === at.x && t.y === at.y);
  const crowded = (at: Point) =>
    taken.some((t) => Math.abs(t.x - at.x) + Math.abs(t.y - at.y) < minDistance);

  const exact = gather(world, (t) => suitable(t, poi, walkable));

  // Best case: the terrain canon asked for, with room around it.
  const spaced = pick(world.seed, poi, exact, crowded);
  if (spaced) return spaced;

  // The map is tight but the terrain is right. Crowding is a cosmetic loss; two places on
  // one tile is a correctness one, so give up spacing before giving up the ground.
  const tight = pick(world.seed, poi, exact, occupied);
  if (tight) return tight;

  // The terrain canon asked for is used up. This happens when the generator makes a biome
  // scarce -- `settlement` comes out as a single tile, because the old one-map game had one
  // village in it. Widening to the field map's own palette keeps the place on ground the
  // map is made of rather than dropping it, and `unplaced` stays meaningful for the case
  // where even that fails.
  const anywhereOnTheMap = gather(world, (t) => palette.has(t.biome));
  return pick(world.seed, poi, anywhereOnTheMap, occupied);
}

export interface BuildOptions {
  seed?: string;
  width?: number;
  height?: number;
  /** Manhattan distance points of interest are kept apart, where the map allows. */
  spacing?: number;
}

/**
 * Build the playable ground for a canon field map.
 *
 * The seed defaults to the field map's own id, so Lothal is the same Lothal for every
 * player — this is a documented island, not a roguelike. Pass a seed to vary it.
 */
export function buildFieldMap(fieldMap: FieldMap, options: BuildOptions = {}): FieldMapWorld {
  const {
    seed = fieldMap.id,
    width = fieldMap.scale === 'large' ? 64 : 48,
    height = fieldMap.scale === 'large' ? 64 : 48,
    spacing = 6
  } = options;

  const world = generateWorld({ seed, width, height });

  // Canon's palette is what the place is *made of*; the generator produces what it
  // produces. Points of interest are held to the intersection, so a marsh shrine cannot
  // end up on a mountain that the generator happened to raise.
  const palette = new Set(fieldMap.seedBiomes);
  applyPalette(world, palette);
  const walkable = new Set<BiomeId>(
    world.tiles.flat().map((t) => t.biome).filter((b) => palette.has(b))
  );

  const placed: PlacedPoi[] = [];
  const unplaced: PointOfInterest[] = [];
  const taken: Point[] = [];

  for (const poi of poisOn(fieldMap.id)) {
    const at = placeOne(world, poi, walkable, palette, taken, spacing);
    if (at) {
      placed.push({ poi, at });
      taken.push(at);
    } else {
      unplaced.push(poi);
    }
  }

  return { fieldMap, world, placed, unplaced };
}

/** The point of interest standing on a tile, if any. */
export function poiAt(built: FieldMapWorld, at: Point): PlacedPoi | null {
  return built.placed.find((p) => p.at.x === at.x && p.at.y === at.y) ?? null;
}
