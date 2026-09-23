// Roads that are easy to follow: seen ahead through the fog, and lit at night.
//
// The ask was that paths and bridges be "mostly lit and free from fog -- the most easily navigable
// ground". The owner's ruling on the fog was the narrower one: **the road is revealed ahead as you
// walk it**, not the whole network from the first morning, because showing every road shows roughly
// where every place is. So standing on or beside a road clears the fog along it for `ROAD_SIGHT`
// tiles in each direction it runs; everywhere else the fog is what it was.
//
// At night the road is lit by lamps: at each bridge end, at each junction, and spaced along longer
// runs. The glow is additive light laid over the night's tint, the standard way a 2D scene with no
// normal maps is lit, and it grows with the dark and is gone at noon.
//
// Free of Phaser, so `test/roadLight.test.ts` holds it without a browser.

import type { Point, Tile, World } from '../world/types';

/** How far along the road you can see from it, in tiles. Normal sight is 2. */
export const ROAD_SIGHT = 6;

/** Lamps are kept at least this far apart, Manhattan, so a run is lit in pools rather than a line. */
export const LAMP_GAP = 4;

/** Whether a tile is part of the road: paved, forded or bridged. */
export function worn(tile: Pick<Tile, 'road' | 'ford' | 'bridge'> | undefined): boolean {
  return Boolean(tile && (tile.road || tile.ford || tile.bridge));
}

const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

/**
 * The road tiles visible from `at`: every tile along the road within `reach` steps of any road tile
 * the traveller is standing on or beside. Keys are `x,y`.
 *
 * Along the road, not as the crow flies: a road that turns behind a hill is seen as far as it goes,
 * and a road three tiles away across a field that you are not on is not seen at all.
 */
export function roadAhead(world: Pick<World, 'tiles' | 'width' | 'height'>, at: Point, reach = ROAD_SIGHT): Set<string> {
  const { tiles, width, height } = world;
  const seen = new Map<string, number>();
  const queue: { x: number; y: number; d: number }[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const x = at.x + dx;
      const y = at.y + dy;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      if (!worn(tiles[y]![x])) continue;
      // The tile underfoot is 0 away and the ones beside it 1, so "six ahead" is six.
      const d = dx === 0 && dy === 0 ? 0 : 1;
      seen.set(`${x},${y}`, d);
      queue.push({ x, y, d });
    }
  }
  queue.sort((a, b) => a.d - b.d);
  for (let head = 0; head < queue.length; head += 1) {
    const { x, y, d } = queue[head]!;
    if (d >= reach) continue;
    for (const [sx, sy] of STEPS) {
      const nx = x + sx;
      const ny = y + sy;
      const key = `${nx},${ny}`;
      if (seen.has(key) || !worn(tiles[ny]?.[nx])) continue;
      seen.set(key, d + 1);
      queue.push({ x: nx, y: ny, d: d + 1 });
    }
  }
  return new Set(seen.keys());
}

/**
 * Where the lamps stand: on road tiles beside the water at each end of a bridge, at every junction,
 * and then along the rest of the road wherever no lamp is within `LAMP_GAP`.
 *
 * The gap holds for bridge ends and junctions too, so a short bridge gets one pool of light that
 * covers both of its ends rather than two lamps an arm's length apart.
 *
 * Deterministic -- raster order, bridge ends and junctions first -- so the same seed lights the same
 * road on every machine.
 */
export function lampSites(world: Pick<World, 'tiles' | 'width' | 'height'>): Point[] {
  const { tiles, width, height } = world;
  const road = (x: number, y: number) => tiles[y]?.[x]?.road === true;
  const out: Point[] = [];
  const clear = (x: number, y: number) =>
    out.every((p) => Math.abs(p.x - x) + Math.abs(p.y - y) >= LAMP_GAP);
  const take = (x: number, y: number) => {
    if (clear(x, y)) out.push({ x, y });
  };

  // Bridge ends: the road tile a bridge lands on.
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!road(x, y)) continue;
      if (STEPS.some(([sx, sy]) => tiles[y + sy]?.[x + sx]?.bridge === true)) take(x, y);
    }
  }
  // Junctions: three or more ways out.
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!road(x, y)) continue;
      const ways = STEPS.filter(([sx, sy]) => worn(tiles[y + sy]?.[x + sx])).length;
      if (ways >= 3) take(x, y);
    }
  }
  // The rest of the road, in pools.
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (road(x, y)) take(x, y);
    }
  }
  return out;
}

/**
 * How strongly the lamps glow for a given night tint, 0 to 1.
 *
 * The sky's alpha runs from 0 at noon to 0.3 at night (see `dayNight.ts`). Lamps come on through the
 * evening, from 0.12, and are full by dark.
 */
export function glowStrength(skyAlpha: number): number {
  return Math.max(0, Math.min(1, (skyAlpha - 0.12) / 0.18));
}
