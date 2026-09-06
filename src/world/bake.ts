// The world, resolved once and kept.
//
// The game used to rebuild its world from the seed on every single load, which meant
// **determinism was doing the job persistence normally does**. That works right up until the
// generator changes -- and then the same seed produces different ground, so the fog and the
// sketches in a saved journey describe a world that is no longer there. Every such change had to
// be paid for with a `SAVE_VERSION` bump that threw the journey away. Three of them (7, 10 and
// 11) altered no data shape at all; they existed purely because the ground had moved.
//
// This is the standard answer and every chunk-based game uses some form of it: resolve a tile
// once, store the result, and thereafter read it. Generator changes then reach only ground
// nobody has visited -- which here means only new journeys, since a field map is generated whole
// rather than in chunks. Minecraft goes further and stores the generator's own version in the
// world so old worlds keep generating under the generator they were born under, accepting a
// visible seam at the chunk boundary as the price. There are no chunks here, so there is no seam
// to accept: a journey keeps the world it started in, and a new seed gets the current generator.
//
// **The size objection is closed by measurement.** A field map is 48x48 or 64x64 -- at most 4,096
// tiles -- and of everything a `Tile` carries only `biome` and the elevation *band* are read
// after generation finishes. `moisture`, `temperature` and `riverBias` are inputs to the
// generator and nothing downstream touches them; `elevation` is read in exactly one place,
// `planCliffs`, and only through `band()`, which quantises it to 0, 1 or 2. So a tile bakes to
// two characters. Packed that way a whole map is about **8 KB**, against 635 KB for a naive dump
// of `Tile[][]` and a localStorage budget of roughly 5 MB.

import { poisOn, type FieldMap, type PointOfInterest } from '../content/places';
import { THRESHOLDS, band } from './classify';
import { buildFieldMap, type FieldMapWorld, type PlacedPoi } from './fieldMap';
import type { BiomeId, LandmarkTerrain, Point, River, Tile, World } from './types';

/**
 * The bake format's version -- **not the generator's**, and the distinction is the whole point.
 *
 * Bump this only when the shape written below changes, never because terrain generation changed.
 * A generator change is precisely what this file exists to stop being a breaking change.
 *
 * Because a format bump does force every world to be generated afresh, and a journey's fog and
 * sketches are tied to its ground, bumping this means bumping `SAVE_VERSION` too. That should be
 * rare; it is no longer the ordinary cost of changing the generator.
 */
export const BAKE_VERSION = 2;

/**
 * Biomes in a fixed order, so a tile is one character.
 *
 * **Append only, and never reorder.** This is the one array in the project whose position really
 * is load-bearing -- it is an on-disk encoding rather than a content list -- and unlike the pools
 * that caused so much trouble, it is closed: it changes when the engine gains a biome, not when
 * canon gains a plant. Reordering it silently reinterprets every stored world.
 */
export const BIOME_CODES: readonly BiomeId[] = [
  'sea',
  'coast',
  'plains',
  'forest',
  'wetland',
  'hills',
  'mountains',
  'desert',
  'river',
  'settlement',
  'landmark',
  // Appended when the engine learned to draw ground it has no art for. Order above is frozen.
  'lava_field',
  'sky_island',
  'sky_underside',
  'open_sky',
  'underworld',
  // Appended, not inserted. This list is positional -- a code is an index into it -- and every
  // baked world on disk was written against the order above, so putting 'snow' next to
  // 'mountains' where it belongs conceptually would silently re-terrain every saved map.
  'snow'
];

const codeOf = new Map<BiomeId, string>(BIOME_CODES.map((b, i) => [b, i.toString(36)]));
const biomeOf = new Map<string, BiomeId>(BIOME_CODES.map((b, i) => [i.toString(36), b]));

/**
 * An elevation that reads back as the given band.
 *
 * Derived from `THRESHOLDS` rather than restated, and that is not fussiness: writing the numbers
 * out by hand here got them wrong on the first attempt -- 0.55 instead of `HILLS`, which is 0.66
 * -- and every upland tile on the Narmada plateau came back one terrace lower. The one honest
 * check is `band(BAND_ELEVATION[n]) === n`, which the tests assert directly.
 *
 * The midpoint of each span, so nothing sits on a boundary. `band` compares with `>`, so the
 * lowland span is [0, HILLS] and its midpoint is safely inside.
 *
 * The raw elevation is not recoverable and does not need to be: nothing reads it except `band`,
 * and storing decimals per tile to reproduce a number that is immediately quantised would be
 * four thousand wasted floats.
 */
const BAND_ELEVATION: readonly number[] = [
  THRESHOLDS.HILLS / 2,
  (THRESHOLDS.HILLS + THRESHOLDS.MOUNTAINS) / 2,
  (THRESHOLDS.MOUNTAINS + 1) / 2
];

export interface BakedWorld {
  bakeVersion: number;
  seed: string;
  fieldMapId: string;
  width: number;
  height: number;
  /** One string per row, one base-36 character per tile, indexing `BIOME_CODES`. */
  biomes: string[];
  /** One string per row, one character per tile: the elevation band, '0' to '2'. */
  bands: string[];
  start: Point;
  settlement: { x: number; y: number; name: string } | null;
  landmark: { x: number; y: number; name: string; terrain: LandmarkTerrain };
  /** `[name, x, y, x, y, ...]` per river -- flat, because the paths are the bulk of this file. */
  rivers: (string | number)[][];
  /** `[poiId, x, y]` per placed point of interest. */
  placed: [string, number, number][];
  /**
   * The nomad camp, as `[x, y, radius]`, or null.
   *
   * **This is what bumped the format to 2.** Its tiles bake as `settlement` like any other, so a
   * world restored under version 1 would draw a camp of mud-brick huts -- correct ground, wrong
   * buildings, and no way to tell from the stored bytes. A version bump regenerates rather than
   * mis-reads.
   */
  camp: [number, number, number] | null;
  unplaced: string[];
}

/** Freeze a built world into something that can be written to storage. */
export function bakeWorld(built: FieldMapWorld): BakedWorld {
  const { world } = built;
  const biomes: string[] = [];
  const bands: string[] = [];

  for (let y = 0; y < world.height; y += 1) {
    let biomeRow = '';
    let bandRow = '';
    for (let x = 0; x < world.width; x += 1) {
      const tile = world.tiles[y]![x]!;
      biomeRow += codeOf.get(tile.biome) ?? '2';
      bandRow += String(band(tile.elevation));
    }
    biomes.push(biomeRow);
    bands.push(bandRow);
  }

  return {
    bakeVersion: BAKE_VERSION,
    camp: world.camp ? [world.camp.at.x, world.camp.at.y, world.camp.radius] : null,
    seed: world.seed,
    fieldMapId: built.fieldMap.id,
    width: world.width,
    height: world.height,
    biomes,
    bands,
    start: { ...world.start },
    settlement: world.settlement ? { ...world.settlement } : null,
    landmark: { ...world.landmark },
    rivers: world.rivers.map((r) => [r.name, ...r.path.flatMap((p) => [p.x, p.y])]),
    placed: built.placed.map((p): [string, number, number] => [p.poi.id, p.at.x, p.at.y]),
    unplaced: built.unplaced.map((p) => p.id)
  };
}

/**
 * Rebuild a world from its bake, or `null` if the bake cannot be trusted.
 *
 * Returning null rather than throwing is deliberate: every caller's fallback is to generate the
 * world, which is exactly what the game did before this existed. A bake that cannot be read is
 * an inconvenience, never a crash.
 */
export function restoreWorld(baked: BakedWorld, fieldMap: FieldMap): FieldMapWorld | null {
  if (baked.bakeVersion !== BAKE_VERSION) return null;
  if (baked.fieldMapId !== fieldMap.id) return null;
  if (!Array.isArray(baked.biomes) || !Array.isArray(baked.bands)) return null;
  if (baked.biomes.length !== baked.height || baked.bands.length !== baked.height) return null;

  const tiles: Tile[][] = [];
  for (let y = 0; y < baked.height; y += 1) {
    const biomeRow = baked.biomes[y]!;
    const bandRow = baked.bands[y]!;
    if (biomeRow.length !== baked.width || bandRow.length !== baked.width) return null;
    const row: Tile[] = [];
    for (let x = 0; x < baked.width; x += 1) {
      const biome = biomeOf.get(biomeRow[x]!);
      if (!biome) return null;
      row.push({
        x,
        y,
        biome,
        elevation: BAND_ELEVATION[Number(bandRow[x])] ?? BAND_ELEVATION[0]!,
        // Generator inputs. Nothing reads these once the ground exists -- see the note at the top
        // of this file -- so they are neither stored nor reconstructed.
        moisture: 0,
        temperature: 0,
        riverBias: 0
      });
    }
    tiles.push(row);
  }

  const rivers: River[] = baked.rivers.map((flat) => {
    const [name, ...coords] = flat;
    const path: Point[] = [];
    for (let i = 0; i + 1 < coords.length; i += 2) {
      path.push({ x: Number(coords[i]), y: Number(coords[i + 1]) });
    }
    return { name: String(name), path };
  });

  const world: World = {
    seed: baked.seed,
    camp: baked.camp
      ? { at: { x: baked.camp[0], y: baked.camp[1] }, radius: baked.camp[2] }
      : null,
    width: baked.width,
    height: baked.height,
    tiles,
    start: baked.start,
    settlement: baked.settlement,
    landmark: baked.landmark,
    rivers
  };

  // Points of interest are resolved by id rather than stored whole: canon owns what a place *is*,
  // and only where it landed belongs to the world. A place canon has since removed drops out,
  // which is the honest reading -- the alternative is a stored world holding a ghost that exists
  // nowhere else in the game.
  const known = new Map<string, PointOfInterest>(poisOn(fieldMap.id).map((p) => [p.id, p]));
  const placed: PlacedPoi[] = [];
  for (const [id, x, y] of baked.placed) {
    const poi = known.get(id);
    if (poi) placed.push({ poi, at: { x, y } });
  }
  const unplaced = baked.unplaced
    .map((id) => known.get(id))
    .filter((p): p is PointOfInterest => Boolean(p));

  return { fieldMap, world, placed, unplaced };
}

/** Round-trip a world through the bake format, as storage would. Exported for tests. */
export function rebake(built: FieldMapWorld): FieldMapWorld | null {
  return restoreWorld(JSON.parse(JSON.stringify(bakeWorld(built))) as BakedWorld, built.fieldMap);
}

const PREFIX = 'south-of-tethys:world';

function key(seed: string, fieldMapId: string): string {
  return `${PREFIX}:${seed}:${fieldMapId}`;
}

/**
 * The world for this seed and this map: the one already resolved, or a fresh one, baked and kept.
 *
 * The only function the scene needs. Storage failing -- private browsing, a full quota, a corrupt
 * payload -- costs nothing but the guarantee: the world is generated exactly as it always was.
 */
export function worldFor(fieldMap: FieldMap, seed: string): FieldMapWorld {
  try {
    const raw = localStorage.getItem(key(seed, fieldMap.id));
    if (raw) {
      const restored = restoreWorld(JSON.parse(raw) as BakedWorld, fieldMap);
      if (restored) return restored;
      // Unreadable, or written under an older format. Drop it rather than leaving it to fail
      // every load from here on.
      localStorage.removeItem(key(seed, fieldMap.id));
    }
  } catch {
    // Fall through and generate.
  }

  const built = buildFieldMap(fieldMap, { seed });
  try {
    localStorage.setItem(key(seed, fieldMap.id), JSON.stringify(bakeWorld(built)));
  } catch {
    // A world that cannot be stored is still a world that can be walked.
  }
  return built;
}

/** Forget the stored world for a seed and map, so the next load generates it afresh. */
export function forgetWorld(seed: string, fieldMapId: string): void {
  try {
    localStorage.removeItem(key(seed, fieldMapId));
  } catch {
    /* nothing to do */
  }
}
