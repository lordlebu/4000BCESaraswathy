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

import { band } from './classify';
import { stampCamp, stampHighCamp, stampTableland } from './tableland';
import { shoreheads, stampIslands, stampLine, stampStrait, startOnTheSouthernShore } from './crossing';
import { stampBasalt } from './basalt';
import { easeRoutes, tourOrder } from './routes';
import { generateWorld, isWalkable } from './generate';
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
/**
 * How far from the edge a place must stand, in tiles.
 *
 * **A place on the outermost row is half off the map.** Nothing stopped one until the Aravali went
 * portrait: on a square map the edges are mostly sea and the terrain filter kept places inland by
 * accident, and on a 44-wide one The Second Line landed at 2,65 -- the bottom-left corner, against
 * two edges at once -- and the Nomad Ground at 42,51, with the water on one side and the end of
 * the world on the other, leaving its camp one tile of room to pitch two tents in.
 *
 * A weight would not do here. Being near the edge is not a preference like height or shore; the
 * camera cannot centre on it and the fence cannot be drawn round it. So it is a filter, with the
 * usual ladder underneath: if nothing at all qualifies, the last resort still places the thing.
 */
const MARGIN = 3;

/** Ground that only exists on a crossing, and that a fallback must never hand out. */
const SKY: ReadonlySet<BiomeId> = new Set<BiomeId>(['sky_island', 'sky_underside']);

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

  if (!palette.has('settlement')) {
    // **And the record goes with the ground.** `placeSettlement` picks a tile and names it before
    // the palette is ever consulted, so on a map with no town the name survived with nothing under
    // it -- the Aravali carried a settlement called Halghat at 57,22, which is open sea, and the
    // journal was ready to announce that the traveller had set out from it.
    world.settlement = null;

    // **And the tile it was naming.** `placeSettlement` runs in the generator, before any palette
    // is consulted, and stamps one tile `settlement` to be the village. Clearing the record left
    // that tile standing: a single square of village ground with a hut drawn on it, in the middle
    // of a map that has no village, and the multi-seed guard found it on the third seed it tried.
    //
    // Filled from whatever is around it, because that is what would have been there. There is only
    // ever one such tile, so its neighbours are ordinary country.
    for (const tile of world.tiles.flat()) {
      if (tile.biome !== 'settlement') continue;
      const around = [
        world.tiles[tile.y - 1]?.[tile.x],
        world.tiles[tile.y + 1]?.[tile.x],
        world.tiles[tile.y]?.[tile.x - 1],
        world.tiles[tile.y]?.[tile.x + 1]
      ].filter((t): t is Tile => !!t && t.biome !== 'settlement' && palette.has(t.biome));
      if (around.length > 0) tile.biome = around[0]!.biome;
    }
    return;
  }

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

  // **And the record names the city that is actually here.**
  //
  // `placeSettlement` picks a tile in the generator, before any palette is consulted, and names
  // it; this patch is then grown somewhere else entirely, from a different hash. So every map had
  // two settlements -- a named point with nothing on it, and forty tiles of city with no name --
  // and they were never in the same place. Measured across six seeds on Dwarka: one settlement
  // tile in forty ever fell within a tile of the record.
  //
  // Nothing had noticed because nothing had asked. The journal reads the record for "you set out
  // from Voshikoli" and the huts are drawn from the tiles, and neither one ever compares them. It
  // surfaced when the basalt tried to lay itself under the city and put the rock twenty tiles from
  // the streets.
  //
  // The name is kept -- it is the same seed and the same city -- and only the position is
  // corrected, to the middle of the ground the city is standing on.
  if (world.settlement) {
    world.settlement = { ...world.settlement, x: cx, y: cy };
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
function pick(
  world: World,
  poi: PointOfInterest,
  candidates: Point[],
  reject: (at: Point) => boolean
): Point | null {
  let best: Point | null = null;
  let bestScore = -Infinity;

  for (const at of candidates) {
    if (reject(at)) continue;
    const score =
      tileHash(world.seed, at.x, at.y, `poi:${poi.id}`) *
      heightBias(world, poi, at) *
      shoreBias(world, poi, at) *
      terrainBias(world, poi, at);
    if (score > bestScore || (score === bestScore && best !== null && (at.y < best.y || (at.y === best.y && at.x < best.x)))) {
      best = at;
      bestScore = score;
    }
  }

  return best;
}

/**
 * How much a place wants the height of the tile it is being offered.
 *
 * **A weight on the score, not a filter, and that distinction is the whole design.** A filter
 * would refuse every low tile to a place that wants height, and on a map whose palette has no
 * high ground at all -- or whose high ground is already taken -- that loses the place entirely.
 * A place that cannot have what it wants must still be somewhere.
 *
 * So a matching terrace multiplies the candidate's score and a mismatched one divides it. Since
 * `tileHash` is uniform, this makes the wanted band overwhelmingly likely to win wherever it
 * exists, and costs nothing where it does not: with no high ground on the map, every candidate
 * is scaled the same way and the ordering is exactly what it was.
 *
 * Deliberately not a large factor. Placement is still spread across the map by the hash rather
 * than clustering every high-standing place onto the single highest tile, which is what a
 * strict "highest wins" rule would do.
 */
/**
 * Keep a place on the shore canon puts it on.
 *
 * **The same shape as `heightBias`, and for the same reason.** On a map that is one country a
 * place can go anywhere the terrain allows; on a *crossing* there are two shores, and which one a
 * place sits on is as much a fact about it as what it stands on. Canon says so in `shore`.
 *
 * Without this the Rail-Head -- the place a player arrives at, where people wait for the carriage
 * -- landed at 17,11 on the **northern** bank, 54 tiles from the traveller and across the water it
 * exists to cross. Nomad Ground landed north too, while its own notes place it above a ford that
 * is forty tiles south.
 *
 * A multiplier rather than a filter, exactly as the height bias is: the wanted shore becomes
 * overwhelmingly likely without collapsing every near-shore place onto one tile. It costs nothing
 * on a map with no strait, where every place is `either` and every candidate scales the same.
 */
function shoreBias(world: World, poi: PointOfInterest, at: Point): number {
  if (poi.shore === 'either') return 1;
  const middle = middleOfTheWater(world);
  if (middle === null) return 1;
  return (poi.shore === 'near') === at.y > middle ? 4 : 0.25;
}

/**
 * The row the water is centred on, or null on a map with no water.
 *
 * Cached per world because `shoreBias` is called once per candidate tile and this walks all four
 * thousand of them. A world's sea is settled long before placement runs -- the strait, the islands
 * and the line are all stamped first -- so there is nothing to invalidate.
 */
const waterMiddle = new WeakMap<World, { row: number | null }>();
function middleOfTheWater(world: World): number | null {
  const cached = waterMiddle.get(world);
  if (cached) return cached.row;
  const water = world.tiles.flat().filter((t) => t.biome === 'sea');
  // A crossing is a map with a strait in it. Without one there is no near and no far, so canon's
  // opinion is simply not applicable rather than wrong.
  const row = water.length === 0 ? null : water.reduce((sum, t) => sum + t.y, 0) / water.length;
  waterMiddle.set(world, { row });
  return row;
}

/**
 * Whether this tile is on the side of the water canon puts the place on.
 *
 * **A filter, where `shoreBias` is only a weight -- and the difference is which of canon's two
 * opinions gives way first.** A place says what ground it wants (`terrain`) and which side of the
 * water it is on (`shore`), and when a map cannot satisfy both, one has to lose.
 *
 * It should be the ground. The Kept Stones wants hills and stands on the far shore; the far shore
 * of the Aravali has no hills on it, so with both as weights the place crossed the sea to find
 * some and ended up at 51,51 -- in Jambhudweepa, on the shore the player starts on, when the whole
 * point of it is that it is over there. Being on the wrong ground is a place that reads slightly
 * off. Being on the wrong shore is a different place.
 *
 * Only the Aravali says anything but `either`, so on the other three maps this is not reached.
 */
function onTheRightShore(world: World, poi: PointOfInterest, at: Point): boolean {
  if (poi.shore === 'either') return true;
  const middle = middleOfTheWater(world);
  if (middle === null) return true;
  return (poi.shore === 'near') === at.y > middle;
}

/**
 * How much a place wants the *first* ground canon named for it.
 *
 * **`terrain` is written in preference order and was being read as a set.** Canon says The Black
 * Pavement stands on `["lava_field", "coast"]` and describes it as "the ground everything here is
 * built on" -- it *is* the basalt. `suitable` only asks whether the tile's biome appears in the
 * list at all, so once the pavement existed the place was equally happy on any coast tile on the
 * map, and the hash put it on one: a place named for a rock, standing on sand, with the rock a
 * dozen tiles away.
 *
 * The same reading fixes The Scale Shore, whose trackways are cut *into* the stone.
 *
 * A weight rather than a filter, on the pattern `heightBias` sets and for its stated reason: a
 * map whose first-choice ground does not exist must still place the thing. Where the ground is
 * there, this makes it overwhelmingly likely to win; where it is not, every candidate is scaled
 * alike and the ordering is exactly what it was -- so the three maps with no `lava_field` in
 * their palette cannot notice.
 */
function terrainBias(world: World, poi: PointOfInterest, at: Point): number {
  if (poi.terrain.length < 2) return 1;
  const biome = world.tiles[at.y]?.[at.x]?.biome;
  return biome !== undefined && biome === poi.terrain[0] ? 4 : 1;
}

function heightBias(world: World, poi: PointOfInterest, at: Point): number {
  if (poi.stands === 'either') return 1;
  const tile = world.tiles[at.y]?.[at.x];
  if (!tile) return 1;
  const high = band(tile.elevation) >= 1;
  const wanted = poi.stands === 'high' ? high : !high;
  return wanted ? 4 : 0.25;
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

  const rightShore = (t: Tile) => onTheRightShore(world, poi, t);
  const inland = (t: Tile) =>
    t.x >= MARGIN && t.y >= MARGIN && t.x < world.width - MARGIN && t.y < world.height - MARGIN;
  const exact = gather(world, (t) => suitable(t, poi, walkable) && rightShore(t) && inland(t));

  // Best case: the terrain canon asked for, with room around it.
  const spaced = pick(world, poi, exact, crowded);
  if (spaced) return spaced;

  // The map is tight but the terrain is right. Crowding is a cosmetic loss; two places on
  // one tile is a correctness one, so give up spacing before giving up the ground.
  const tight = pick(world, poi, exact, occupied);
  if (tight) return tight;

  // The terrain canon asked for is used up. This happens when the generator makes a biome
  // scarce -- `settlement` comes out as a single tile, because the old one-map game had one
  // village in it. Widening to the field map's own palette keeps the place on ground the
  // map is made of rather than dropping it, and `unplaced` stays meaningful for the case
  // where even that fails.
  //
  // **Still ground, though.** A palette is a list of what the country is *made of* and `sea` is in
  // three of the four, so "anywhere in the palette" included open water -- and it put The Kept
  // Stones at 58,28 on the Aravali, which is a quarter mile out in the Shattered Sea. It surfaced
  // when the strait widened and took the far shore's high ground with it, but the fault was
  // always here: the last resort had no floor under it. `isWalkable` is the game's one answer to
  // what a person can stand on, and it is the same one `reachableFrom` walks by.
  //
  // **And not in the sky, unless canon asked for the sky.** The islands are the most distinctive
  // ground on the only map that has any, and a fallback is by definition placing something that
  // did not get what it wanted -- so it must not hand out the one ground a player will read as
  // deliberate. The Kept Stones wants hills and the far shore has none once the strait is at its
  // full width, so it fell through to here and landed on the northern island, on the railway,
  // beside the two places that are *supposed* to be up there.
  // **Walkable is not the same as ground, and the railway is the difference.** `isWalkable` says
  // yes to a track tile whatever is under it -- that is the whole point of the line -- so a
  // fallback filtered on it put The Kept Stones at 32,26, standing on the rails a dozen rows out
  // over open sea. Asking the same rule with the track taken away is asking "is there anything
  // here to stand on", which is the actual question.
  const ground = (t: Tile) =>
    palette.has(t.biome) &&
    isWalkable({ biome: t.biome, track: false }) &&
    (!SKY.has(t.biome) || poi.terrain.includes(t.biome));

  // **The ground gives way before the shore does.** See `onTheRightShore`: which side of the
  // water a place is on is a fact about which country it is in, and no amount of correct soil
  // makes up for being in the wrong one.
  const overThere = pick(
    world,
    poi,
    gather(world, (t) => ground(t) && rightShore(t) && inland(t)),
    occupied
  );
  if (overThere) return overThere;

  const anywhereOnTheMap = gather(world, ground);
  return pick(world, poi, anywhereOnTheMap, occupied);
}

/**
 * How big a map is, by the two things canon says about its shape.
 *
 * **Portrait is not a square with a crop.** A crossing is walked in one direction -- shore, water,
 * islands, far shore -- and drawn square it cannot be any of those properly at once: the sea has
 * to read as a sea across the full width, which leaves the shores too thin to raise hills on and
 * the islands too close to read as two. 44 by 66 is the reference's own two-to-three, and it is
 * *fewer* tiles than 64 by 64 rather than more, so nothing gets slower.
 */
const EXTENT: Record<'square' | 'portrait', Record<'small' | 'large', { width: number; height: number }>> = {
  square: { small: { width: 48, height: 48 }, large: { width: 64, height: 64 } },
  portrait: { small: { width: 34, height: 50 }, large: { width: 44, height: 66 } }
};

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
 * The seed defaults to the field map's own id, so a caller that asks for a map and nothing else
 * gets a stable one — the same Lothal every time, which is what a test wants.
 *
 * **The game never takes that default.** `worldFor` always passes the journey's seed, and the
 * journey's seed is `jambhudweepa-evening` unless a link says otherwise. So the world a player
 * walks and the world `buildFieldMap(map)` returns are *different worlds*, and both are correct.
 *
 * That is worth stating because it looks exactly like a bug when you meet it. A tile measured
 * under the default seed came out `snow` while the running game said `hills` at the same
 * coordinates, and the hunt went through the bake, the URL parameters and the scene wiring before
 * the answer turned out to be that they were two seeds. **A measurement of the world a player
 * sees has to pass the seed a player has.**
 */
export function buildFieldMap(fieldMap: FieldMap, options: BuildOptions = {}): FieldMapWorld {
  const {
    seed = fieldMap.id,
    width = EXTENT[fieldMap.proportion][fieldMap.scale].width,
    height = EXTENT[fieldMap.proportion][fieldMap.scale].height,
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
  // Drifts on the country the scarp encloses, if this map has one and canon allows snow on it.
  // After the palette, like the settlement patch: a drift is something that happened to the
  // ground rather than a climate the ground has, and the classifier deals only in climates.
  stampTableland(world, palette);
  // The rock Dwarka is built on: an old flow that reached the coast and hardened. Same reasoning
  // again, and the same omission that kept the drifts off the plateau for a while -- `lava_field`
  // is in canon's palette and has painted ground, decor and overdraw waiting for it, and until
  // now nothing put a single tile of it on the map.
  stampBasalt(world, palette);
  // The crossing: a strait across the map and two islands hanging over it. Same reasoning as the
  // drifts -- an island is a place rather than a climate, so the classifier cannot make one.
  stampStrait(world, palette);
  // The line last, and through the islands: they are its piers, and without it the far shore
  // cannot be reached at all.
  stampLine(world, palette, stampIslands(world, palette));
  // The strait is cut after the generator chose a start, so on a crossing that start can be left
  // standing in open water -- or, as it was, on the far shore. Only moves it when it must.
  if (palette.has('sky_island')) startOnTheSouthernShore(world);
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

  // **Places the line decides, rather than the terrain.**
  //
  // The Rail-Head is "where the line comes ashore", and scoring tiles by biome cannot express
  // that: its canon terrain is coast and plains, which is most of the near shore, so it landed at
  // 61,50 -- twenty-eight tiles along the beach from the rail it is named after, on a map whose
  // whole subject is the crossing. A player who starts beside the line walks *away* from it to
  // reach the place for boarding.
  //
  // So it is anchored, the same way the High Camp is anchored to canon's tile and the traveller is
  // anchored to the line's own column. Canon says which shore; the line says which tile on it.
  const anchors = new Map<string, Point>();
  // **Where the rope comes ashore, not where the rail ends.** `trackRoute` is now the rail alone --
  // island to island -- so its southern end is the middle of a floating island, and anchoring the
  // Rail-Head there put the place a player arrives at out over the sea. The Rail-Head is on the
  // beach: it is the shed and the buffers at the bottom of the ladder.
  const ashore = shoreheads(world).near;
  const railHead = poisOn(fieldMap.id).find((p) => p.id === 'poi_rail_head');
  if (ashore && railHead) {
    // Beside the buffers rather than on them, and on the ground canon says the place stands on.
    //
    // **The second half of that matters now that the shores differ.** The southern landmass is the
    // Aravali coming down to the sea, so its beach climbs into band 1 within a tile or two, and
    // taking the first free neighbour put a place canon marks `stands: low` on a hillside -- and
    // once, on band-2 mountains. The candidates are ranked by whether the height matches instead,
    // over a couple of tiles' reach, so the anchor still means "at the rail-head" and the choice
    // among the tiles there is canon's.
    const wantsHigh = railHead.stands === 'high';
    const nearby: Point[] = [];
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -3; dx <= 3; dx += 1) {
        if (Math.abs(dx) < 2 && dy === 0) continue; // never on the line itself
        nearby.push({ x: ashore.x + dx, y: ashore.y + dy });
      }
    }

    const usable = nearby.filter((p) => {
      const tile = world.tiles[p.y]?.[p.x];
      if (!tile || tile.track || !isWalkable(tile)) return false;
      return !(p.x === world.start.x && p.y === world.start.y);
    });
    const fits = usable.filter((p) => {
      const high = band(world.tiles[p.y]![p.x]!.elevation) > 0;
      return railHead.stands === 'either' || high === wantsHigh;
    });
    const beside = (fits.length > 0 ? fits : usable)[0];
    if (beside) anchors.set('poi_rail_head', beside);
  }

  for (const poi of poisOn(fieldMap.id)) {
    const at = anchors.get(poi.id) ?? placeOne(world, poi, walkable, palette, taken, spacing);
    if (at) {
      placed.push({ poi, at });
      taken.push(at);
    } else {
      unplaced.push(poi);
    }
  }

  // The High Camp, which canon now names.
  //
  // Two felt tents on the plateau, and the second settlement on this map: the University is nine
  // halls that have measured things for four hundred years, and this is a household that moves
  // with the grass. Marn stands at both, because the terraces are where his goats are in the day
  // and this is where he sleeps.
  //
  // Here rather than with the drifts above, for the same reason the easing is here: it depends on
  // where the content landed. An earlier version guessed a spot beside a drift, and then anchored
  // to the terraces; canon naming the place settles it properly.
  const highCamp = placed.find((p) => p.poi.id === 'poi_high_camp');
  stampHighCamp(world, highCamp?.at ?? null);

  // The Nomad Ground on the Aravali, which had no tents on it at all.
  //
  // The same felt as the High Camp and the same people -- canon has Terke's herd on both maps --
  // but the ground rule is this map's. A crossing is walked in bands, and the two things a tent
  // must not stand on here are the water and the railway.
  //
  // It got nothing for as long as `stampCamp` asked whether `settlement` was in the palette: the
  // Aravali has no town in it, correctly, and so the one household that *does* stop here was
  // refused on a question about cities. See `stampCamp`.
  const nomadGround = placed.find((p) => p.poi.id === 'poi_nomad_ground');
  stampCamp(
    world,
    nomadGround?.at ?? null,
    (tile) => tile.biome !== 'sea' && tile.biome !== 'sky_underside' && !tile.track
  );

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
