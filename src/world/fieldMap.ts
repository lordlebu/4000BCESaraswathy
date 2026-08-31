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

/**
 * Redraw the generated world in the field map's own materials.
 *
 * Settlement is grown as a patch rather than allowed to spread by affinity: a city is a
 * place, not a climate, and Lothal needs enough of it that a camp and a tower are not
 * competing for the same square metre. The patch centre is seeded, so it lands in the same
 * place every time.
 */
function applyPalette(world: World, palette: Set<BiomeId>): void {
  // **Nothing is substituted here any more, and that is the point of this rewrite.**
  //
  // This function used to redraw the whole map: the generator produced a continent against fixed
  // thresholds and then every tile whose biome the palette did not contain was swapped for a
  // fallback from a hand-written `BECOMES` table. That table was global but its effect was
  // per-map, so tuning a fallback for one map silently re-terrained the others -- the direct
  // answer to "why does changing one map affect the others" -- and it is what turned the Narmada
  // into 55.8% river the moment canon gave that map the river it is named after.
  //
  // `classifyBiome` now takes the palette and never produces anything outside it, so there is
  // nothing left to swap. What remains here is the work that genuinely happens *after* the ground
  // exists: pruning rivers the palette never allowed, and growing the settlement patch.

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

/**
 * Choose a tile for a place, by scoring the tiles rather than indexing the list.
 *
 * This used to be `tileHash(...) % candidates.length` with a linear probe from there, and the
 * position of a tile in the gathered list decided everything. `gather` walks the grid in row
 * order, so **any** change to the terrain -- a river moving one tile, a biome reclassified,
 * a single tile taken out of the pool -- shifted the list and moved every place on the map.
 *
 * The file already carries one post-mortem of that: stamping the landmark before placement
 * moved five of Lothal's six places and put The Eastern Field thirteen rows off the route the
 * browser suite walks. It has since gone stale twice more, taking four e2e seed fixtures with
 * it each time. It is the same defect that made adding a plant re-roll the world, in a second
 * place, and it deserves the same answer.
 *
 * Each candidate is now scored by hashing the *place* together with that tile's own
 * coordinates, and the best-scoring acceptable tile wins. A tile's score depends on nothing but
 * itself and the place being sited, so terrain changing elsewhere on the map cannot move a
 * place whose own ground is untouched. Rejected candidates are skipped rather than shifting
 * anything, and ties break on coordinate so the gather order is never read at all.
 */
function pick(seed: string, poi: PointOfInterest, candidates: Point[], reject: (at: Point) => boolean): Point | null {
  let best: Point | null = null;
  let bestScore = -Infinity;

  for (const at of candidates) {
    if (reject(at)) continue;
    const score = tileHash(seed, at.x, at.y, `poi:${poi.id}`);
    if (score > bestScore || (score === bestScore && best !== null && (at.y < best.y || (at.y === best.y && at.x < best.x)))) {
      best = at;
      bestScore = score;
    }
  }

  return best;
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

  // The palette goes *into* generation rather than being applied to its output. See
  // `terrainPaletteFor` -- this is the whole of the constrained-classifier change.
  const world = generateWorld({
    seed,
    width,
    height,
    relief: fieldMap.relief,
    palette: fieldMap.seedBiomes
  });

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
  // The tile the traveller wakes on is spoken for.
  //
  // Nothing ever said so, and nothing needed to while `pick` indexed the candidate list: the
  // modulo simply never landed there. That was luck rather than a rule, and scoring the tiles
  // spent it -- `play-test` put Kavik's Tower exactly on the start tile, so the journey opened
  // *inside* the place it was meant to walk to. The arrival beat fired before the player had
  // moved, which also set the camera's settled zoom at boot and left `0` no fit to return to.
  //
  // Seeding `taken` is the whole fix: `occupied` and `crowded` already read it, so the start
  // tile is excluded on the same terms as a tile another place is standing on.
  const taken: Point[] = [world.start];

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

/**
 * Where the traveller begins: the map's own start tile, or a tile named in the query string.
 *
 * `?at=poi_drowned_dockyard` starts on that place; `?at=12,30` starts on those coordinates. This
 * is the same kind of hook as `?hour=21`, and it exists for the same reason: to check something
 * without first arranging the world so that it happens.
 *
 * **It is here to stop the browser suite depending on generated layout.** Four e2e fixtures were
 * *searched* seeds -- worlds found by brute force because a place happened to land two steps from
 * the start -- and every change to `src/world/` invalidated all four at once. They went stale
 * four times, cost twelve CI failures on one occasion, and the last re-search found no seed at
 * all with the walk the spec wanted. A test that needs to stand somewhere should say where it
 * wants to stand, which is what shipped debug commands are for in every game that has them.
 *
 * An unparseable or unplaced value falls back to the real start rather than throwing: this is a
 * convenience for testing and must never be able to break the game for a player who types one in.
 */
export function startTileFor(built: FieldMapWorld, search: string): Point {
  const asked = new URLSearchParams(search).get('at');
  if (!asked) return { ...built.world.start };

  const named = built.placed.find((p) => p.poi.id === asked);
  if (named) return { ...named.at };

  const [x, y] = asked.split(',').map((n) => Number.parseInt(n, 10));
  const inside =
    Number.isInteger(x) && Number.isInteger(y) &&
    x >= 0 && y >= 0 && x < built.world.width && y < built.world.height;
  return inside ? { x: x!, y: y! } : { ...built.world.start };
}
