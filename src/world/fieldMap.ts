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

import { easeRoutes, tourOrder } from './routes';
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
 *
 * **This table is the weakest thing in the generator and it should be replaced.** It is not a
 * standard technique -- classification by elevation, moisture and temperature is Whittaker's and
 * the drainage model in `rivers.ts` is the usual one, but generating a whole continent and then
 * remapping it into a palette is bespoke to this codebase. Every one of these entries is a
 * guess about a substitution nobody asked for, and three separate faults in one afternoon came
 * out of it: marsh reclassified to watercourse, a plateau's rim reclassified to watercourse, and
 * before that the same rim reclassified to hill. The map that suffers most is the one whose
 * palette is least like a whole world.
 *
 * The standard answer is to constrain the classifier instead -- hand `classifyBiome` the biomes
 * the map is allowed to use, so the thresholds divide the range among *those* and nothing is ever
 * generated that has to be substituted afterwards. That is a real piece of work and is written
 * down in `database/TODO.md`; until it happens, treat every ordering here as load-bearing and
 * measure all three maps after touching one.
 */
const BECOMES: Record<string, BiomeId[]> = {
  // **Dry land before a channel.** `normalize` guarantees the generator makes low ground on
  // every map, so even a plateau comes out with sea around its rim -- and with `river` ahead of
  // the dry options, a map whose palette had no shoreline turned its entire rim into
  // watercourse. That is what put the Narmada at 55.8% river the moment canon gave it the
  // `river` it should always have had. A map with no coast and no marsh in its palette has no
  // water at its edge; it has ground.
  sea: ['coast', 'wetland'],
  coast: ['wetland', 'river', 'plains'],
  plains: ['wetland', 'coast', 'forest'],
  forest: ['wetland', 'river', 'plains'],
  hills: ['plains', 'coast', 'forest'],
  mountains: ['hills', 'plains', 'coast'],
  desert: ['plains', 'coast', 'wetland'],
  river: ['wetland', 'coast'],
  // **Standing water is not a channel**, and putting `river` first here said it was. On a map
  // whose palette has no `wetland`, every marsh the generator made became a watercourse: giving
  // the Narmada plateau its river back turned 57.7% of it into river and left 2% hills, which is
  // not a plateau with a river through it, it is a flood. Wet ground becomes wet *ground* where
  // the palette has any, and only falls to a channel when it has none.
  wetland: ['coast', 'forest', 'river', 'plains'],
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

  // A river the palette just erased is not a river any more, and `world.rivers` must not go on
  // naming it. The Narmada carried ten of these: channels carved by the generator, reclassified
  // to hill and plain because that map's palette had no `river` in it, and still listed as
  // watercourses with names. Nothing read them, which is exactly why it survived so long.
  //
  // Canon has since given that map its river back -- it is named for one -- but the guard stays,
  // because the next palette to omit a biome the generator produces will do this again silently.
  world.rivers = world.rivers
    .map((r) => ({ ...r, path: r.path.filter((p) => world.tiles[p.y]?.[p.x]?.biome === 'river') }))
    .filter((r) => r.path.length >= 2);

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

  const world = generateWorld({ seed, width, height, relief: fieldMap.relief });

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

  // Ease the ground between the places, now that we know where they ended up.
  //
  // The third rule of a field map: the rim is hard, the middle is easier, and **the places are
  // reachable however far out they sit**. The first two are functions of position and the shapers
  // in `landform.ts` handle them. This one is not -- it depends on where the content landed -- so
  // it cannot happen while generating terrain and has to happen here, after placement.
  //
  // The effect is that a valley is literally the path between two places rather than a landform a
  // place happens to sit in. Narmada can keep cliffs in the middle of the plateau, because the
  // route between the University and the quarry is a walkable line through them.
  //
  // Before the landmark stamp, so the landmark's own tile is never softened, and before the fog
  // and species passes so nothing has read the ground yet.
  const route = tourOrder(placed.map((p) => p.at), world.start);
  // Wet landforms get a wider corridor -- see `radius` in routes.ts for why.
  const wet = fieldMap.relief === 'delta' || fieldMap.relief === 'island';
  easeRoutes(world.tiles, world.width, world.height, [world.start, ...route], {
    radius: wet ? 2 : 1,
    // Never soften the ground a place is standing on, or the landmark's tile.
    keep: new Set([
      ...placed.map((p) => `${p.at.x},${p.at.y}`),
      `${world.landmark.x},${world.landmark.y}`
    ])
  });

  // Put the landmark back, *after* placement has read the ground.
  //
  // No field map lists `landmark` in its palette -- and none should, since it is a place rather
  // than a climate and canon's `seed_biomes` describe the country -- so `applyPalette` reclassifies
  // it along with everything else and the destination of the journey was drawn as ordinary marsh.
  //
  // The stamp has to come last. `walkable` and every candidate list above are gathered by biome,
  // and `pick` indexes them with `tileHash(...) % candidates.length` -- so taking one tile out of
  // the pool shifts the modulo for every point of interest, not just the one that lost its tile.
  // Stamping inside `applyPalette` moved five of Lothal's six places and put The Eastern Field
  // thirteen rows off the walk the browser suite makes to reach it.
  const landmark = world.tiles[world.landmark.y]?.[world.landmark.x];
  if (landmark) landmark.biome = 'landmark';

  return { fieldMap, world, placed, unplaced };
}

/** The point of interest standing on a tile, if any. */
export function poiAt(built: FieldMapWorld, at: Point): PlacedPoi | null {
  return built.placed.find((p) => p.at.x === at.x && p.at.y === at.y) ?? null;
}
