// World generation.
//
// Deliberately free of React and Phaser: this runs unchanged under Node, so `test/generator.test.ts`
// exercises the exact code the game ships. Nothing in here may use `Math.random()` or the clock —
// a seed is a promise that the journey is the same every time.

import { createRandom, clamp, shuffle, type Random } from './rng';
import { fractalField, highlandSpine, normalize, type Field } from './field';
import { classifyBiome, THRESHOLDS } from './classify';
import { placeOf, shapeFor, type Relief } from './landform';
import { carveRivers, orthogonalNeighbours } from './rivers';
import { placeName, riverName } from './names';
import type { BiomeId, GenerateOptions, LandmarkTerrain, Point, River, Tile, World } from './types';

export const DEFAULT_WIDTH = 36;
export const DEFAULT_HEIGHT = 24;

/**
 * Only the sea stops a traveller. This mirrors `walkable` in `data/biomes.json`; the duplication
 * is deliberate so that `world/` stays independent of the content layer, and
 * `test/species.test.ts` asserts the two agree.
 */
export function isWalkable(tile: Pick<Tile, 'biome'>): boolean {
  return tile.biome !== 'sea';
}

/**
 * Shape the raw noise into whatever landform canon says this map is.
 *
 * **This used to be one rule for every map and that was the bug.** It raised land toward the
 * centre so the grid would read as a region rather than a cropped rectangle — correct for a
 * continent, wrong for one corner of one. Every field map came out a dome: Lothal ran from
 * elevation 0.26 at the rim to 0.66 in the middle, and since high ground classifies as hills and
 * forest at travel cost 2, the average cost of a tile climbed from 1.15 at the edge to 1.98 at
 * the centre. The walking was hardest exactly where the walking happens.
 *
 * The landform decides now, and `world/landform.ts` holds the shapes. The western pull stays as
 * it was: the Tethyan sea lies west, and that is canon rather than shaping.
 */
function shapeElevation(
  base: Field,
  spine: Field,
  width: number,
  height: number,
  relief: Relief | null | undefined
): { elevation: Field; damp: Field } {
  const shaped: Field = [];
  const damp: Field = [];
  for (let y = 0; y < height; y += 1) {
    const row: number[] = [];
    const wet: number[] = [];
    for (let x = 0; x < width; x += 1) {
      const shape = shapeFor(relief, placeOf(x, y, width, height));
      const westSea = 0.3 * (1 - x / width) ** 2;
      row.push(base[y]![x]! * 0.55 + spine[y]![x]! + shape.elevation - westSea);
      wet.push(shape.moisture);
    }
    shaped.push(row);
    damp.push(wet);
  }
  // Normalising last is what guarantees the classifier's upper thresholds are reachable — see the
  // header comment in field.ts for the bug this prevents.
  return { elevation: normalize(shaped), damp };
}

/** Flood fill from `start` across walkable tiles. Returns the set of `"x,y"` keys reached. */
export function reachableFrom(tiles: Tile[][], width: number, height: number, start: Point): Set<string> {
  const visited = new Set<string>([`${start.x},${start.y}`]);
  const queue: Point[] = [start];
  while (queue.length) {
    const tile = queue.shift()!;
    for (const next of orthogonalNeighbours(tile, width, height)) {
      const key = `${next.x},${next.y}`;
      if (visited.has(key) || !isWalkable(tiles[next.y]![next.x]!)) continue;
      visited.add(key);
      queue.push(next);
    }
  }
  return visited;
}

/** Manhattan distance — movement is orthogonal, so this is the real number of steps. */
function stepsBetween(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function placeSettlement(tiles: Tile[][], random: Random): Tile | null {
  // A village wants flat, watered, non-border ground. Ordered by preference, first match wins.
  const preferences = [
    (t: Tile) => t.biome === 'river',
    (t: Tile) => t.biome === 'plains',
    (t: Tile) => t.biome === 'coast',
    (t: Tile) => t.biome === 'forest'
  ];
  const height = tiles.length;
  const width = tiles[0]!.length;
  const inland = tiles
    .flat()
    .filter((t) => t.x > 0 && t.y > 0 && t.x < width - 1 && t.y < height - 1);

  for (const matches of preferences) {
    const candidates = inland.filter(matches);
    if (candidates.length === 0) continue;
    const chosen = shuffle(candidates, random)[0]!;
    chosen.biome = 'settlement';
    return chosen;
  }
  return null;
}

/**
 * Put the landmark far enough away to be a journey.
 *
 * The vanilla generator picked uniformly at random from every reachable tile, which regularly
 * dropped the goal two steps from the start camp. The slice wants 5–10 minutes of walking, so
 * candidates are filtered to a minimum step count and the target is relaxed only if nothing
 * qualifies.
 */
function placeLandmark(
  tiles: Tile[][],
  reachable: Set<string>,
  start: Point,
  random: Random
): { tile: Tile; terrain: LandmarkTerrain } {
  // `river` is included so a heron pool can sit on one, but sea and settlement are not.
  const interesting = new Set<BiomeId>([
    'forest',
    'hills',
    'mountains',
    'wetland',
    'plains',
    'desert',
    'coast',
    'river'
  ]);
  const candidates = tiles
    .flat()
    .filter((t) => reachable.has(`${t.x},${t.y}`) && interesting.has(t.biome));

  const fallback = tiles[start.y]![start.x]!;
  if (candidates.length === 0) return { tile: fallback, terrain: 'plains' };

  const furthest = candidates.reduce((best, t) =>
    stepsBetween(t, start) > stepsBetween(best, start) ? t : best
  );
  const minimum = Math.max(8, Math.floor(stepsBetween(furthest, start) * 0.6));
  const distant = candidates.filter((t) => stepsBetween(t, start) >= minimum);
  const pool = distant.length ? distant : candidates;

  // Pick the *terrain* first, then a tile of it.
  //
  // Choosing a tile directly buries the interesting ground: the far band is mostly map edge, so a
  // survey of 60 seeds put the landmark on coast 22 times and plains 17, against one apiece for
  // hills, mountains and desert — and standing stones, which only belong on high or dry ground,
  // never appeared at all. Levelling the terrains first means every kind of landmark gets a turn.
  const byTerrain = new Map<LandmarkTerrain, Tile[]>();
  for (const tile of pool) {
    const ground = tile.biome as LandmarkTerrain;
    const group = byTerrain.get(ground);
    if (group) group.push(tile);
    else byTerrain.set(ground, [tile]);
  }

  // The terrain is remembered rather than re-read, because stamping the landmark overwrites it —
  // the content layer chooses which kind of landmark this is from the ground it stands on.
  const terrain = shuffle([...byTerrain.keys()], random)[0]!;
  const chosen = shuffle(byTerrain.get(terrain)!, random)[0]!;
  chosen.biome = 'landmark';
  return { tile: chosen, terrain };
}

export function generateWorld({
  seed = 'jambhudweepa',
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  relief = null
}: GenerateOptions = {}): World {
  const random = createRandom(seed);

  // Field order is part of the seed contract: reordering these calls changes every existing map.
  const elevationBase = fractalField(width, height, random, { octaves: 4, baseCell: 11 });
  const spine = highlandSpine(width, height, random, { peaks: 6, radius: 6, strength: 0.6 });
  const { elevation, damp: reliefDamp } = shapeElevation(
    elevationBase,
    spine,
    width,
    height,
    relief as Relief | null
  );
  const moisture = normalize(fractalField(width, height, random, { octaves: 3, baseCell: 9 }));

  const tiles: Tile[][] = [];
  for (let y = 0; y < height; y += 1) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x += 1) {
      // Warmer toward the south of the grid, cooler on high ground.
      const temperature = clamp(0.32 + (y / height) * 0.5 - elevation[y]![x]! * 0.22 + random() * 0.08);
      // Wetter to the east and in the cool uplands; heat dries the air out.
      // The landform's own moisture is added here rather than folded into the noise, so a
      // delta can be wet without the whole continent being wet.
      const damp = clamp(
        moisture[y]![x]! * 0.86 + (x / width) * 0.16 - temperature * 0.14 + reliefDamp[y]![x]!
      );
      const height01 = elevation[y]![x]!;
      row.push({
        x,
        y,
        elevation: height01,
        moisture: damp,
        temperature,
        biome: classifyBiome(height01, damp, temperature),
        riverBias: random() * 0.05
      });
    }
    tiles.push(row);
  }

  // Rivers rise on the highest ground and are spaced apart so they read as separate valleys.
  //
  // **A delta is the exception, and it is the whole point of one.** Sourcing only above
  // `HILLS` means a map with no highlands gets almost no river -- Lothal ran at 0.5% river,
  // which is absurd for a delta. And it matters beyond looks: `river` is one of only two wet
  // biomes that cost 1 to cross, so with no channels there is no cheap way through a marsh and
  // the map is uniformly expensive whatever shape the land is.
  //
  // So a delta sources from the highest ground it actually has, and carves many more of them.
  // The result is what a delta is: a braid of channels you follow, through reeds you would
  // rather not wade. The Phase 6 route line then draws itself -- the fast way is the water.
  const isDelta = relief === 'delta';
  const bar = isDelta ? THRESHOLDS.COAST : THRESHOLDS.HILLS;
  const sources = tiles
    .flat()
    .filter((t) => t.elevation > bar)
    .sort((a, b) => b.elevation - a.elevation)
    .slice(0, isDelta ? 90 : 24);
  // Delta channels sit closer together than mountain valleys do -- that is what braiding means --
  // so the spacing that keeps highland rivers reading as separate valleys is wrong here.
  const carved = carveRivers(tiles, width, height, sources, isDelta ? 2 : 5);
  // A river is named for where it rises, so the name holds even as the course is walked downstream.
  const rivers: River[] = carved.map((path) => ({ path, name: riverName(seed, path[0]!) }));

  const settlement = placeSettlement(tiles, random);
  const start = settlement ?? tiles[Math.floor(height / 2)]![Math.floor(width / 2)]!;
  if (!isWalkable(start)) start.biome = 'plains';

  const reachable = reachableFrom(tiles, width, height, start);
  const landmark = placeLandmark(tiles, reachable, start, random);

  return {
    seed,
    width,
    height,
    tiles,
    start: { x: start.x, y: start.y },
    settlement: settlement
      ? { x: settlement.x, y: settlement.y, name: placeName(seed, 'settlement', settlement) }
      : null,
    landmark: {
      x: landmark.tile.x,
      y: landmark.tile.y,
      terrain: landmark.terrain,
      name: placeName(seed, 'landmark', landmark.tile)
    },
    rivers
  };
}
