// World generation.
//
// Deliberately free of React and Phaser: this runs unchanged under Node, so `test/generator.test.ts`
// exercises the exact code the game ships. Nothing in here may use `Math.random()` or the clock —
// a seed is a promise that the journey is the same every time.

import { createRandom, clamp, shuffle, type Random } from './rng';
import { fractalField, highlandSpine, normalize, type Field } from './field';
import { classifyBiome, THRESHOLDS } from './classify';
import { carveRivers, orthogonalNeighbours } from './rivers';
import type { GenerateOptions, Point, Tile, World } from './types';

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
 * Shape the raw noise into a coastline.
 *
 * Two forces: land is pulled down toward every map edge so the grid reads as a region rather than
 * a cropped rectangle, and pulled down harder toward the west, where the Tethyan sea lies.
 */
function shapeElevation(base: Field, spine: Field, width: number, height: number): Field {
  const shaped: Field = [];
  for (let y = 0; y < height; y += 1) {
    const row: number[] = [];
    for (let x = 0; x < width; x += 1) {
      const edgeDistance = Math.min(x, y, width - 1 - x, height - 1 - y) / Math.min(width, height);
      const edgeFalloff = Math.min(1, edgeDistance * 3.2);
      const westSea = 0.3 * (1 - x / width) ** 2;
      row.push(base[y]![x]! * 0.55 + spine[y]![x]! + edgeFalloff * 0.42 - westSea);
    }
    shaped.push(row);
  }
  // Normalising last is what guarantees the classifier's upper thresholds are reachable — see the
  // header comment in field.ts for the bug this prevents.
  return normalize(shaped);
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
function placeLandmark(tiles: Tile[][], reachable: Set<string>, start: Point, random: Random): Tile {
  const interesting = new Set(['forest', 'hills', 'mountains', 'wetland', 'plains', 'desert', 'coast']);
  const candidates = tiles
    .flat()
    .filter((t) => reachable.has(`${t.x},${t.y}`) && interesting.has(t.biome));

  if (candidates.length === 0) return tiles[start.y]![start.x]!;

  const furthest = candidates.reduce((best, t) =>
    stepsBetween(t, start) > stepsBetween(best, start) ? t : best
  );
  const minimum = Math.max(8, Math.floor(stepsBetween(furthest, start) * 0.6));
  const distant = candidates.filter((t) => stepsBetween(t, start) >= minimum);

  const chosen = shuffle(distant.length ? distant : candidates, random)[0]!;
  chosen.biome = 'landmark';
  return chosen;
}

export function generateWorld({
  seed = 'jambhudweepa',
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT
}: GenerateOptions = {}): World {
  const random = createRandom(seed);

  // Field order is part of the seed contract: reordering these calls changes every existing map.
  const elevationBase = fractalField(width, height, random, { octaves: 4, baseCell: 11 });
  const spine = highlandSpine(width, height, random, { peaks: 6, radius: 6, strength: 0.6 });
  const elevation = shapeElevation(elevationBase, spine, width, height);
  const moisture = normalize(fractalField(width, height, random, { octaves: 3, baseCell: 9 }));

  const tiles: Tile[][] = [];
  for (let y = 0; y < height; y += 1) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x += 1) {
      // Warmer toward the south of the grid, cooler on high ground.
      const temperature = clamp(0.32 + (y / height) * 0.5 - elevation[y]![x]! * 0.22 + random() * 0.08);
      // Wetter to the east and in the cool uplands; heat dries the air out.
      const damp = clamp(moisture[y]![x]! * 0.86 + (x / width) * 0.16 - temperature * 0.14);
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
  const sources = tiles
    .flat()
    .filter((t) => t.elevation > THRESHOLDS.HILLS)
    .sort((a, b) => b.elevation - a.elevation)
    .slice(0, 24);
  const rivers = carveRivers(tiles, width, height, sources);

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
    landmark: { x: landmark.x, y: landmark.y },
    rivers
  };
}
