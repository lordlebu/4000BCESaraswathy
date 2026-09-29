// Which landmass a tile is on, so the right animals stand on it.
//
// **Canon says which edge of a map is another landmass; this finds the ground.** The Aravali is the
// crossing: its northern shore is Mainland Asia, where the elephants, the bears and the Laurasian
// wolf live, and its southern shore is Jambhudweep, where the relicts and the crocodylomorphs do.
// Canon's `landmass_edges` says `north: mainland_asia` and nothing about rows, the same way
// `renews` says an ordering and never a number of days.
//
// **The land joined to that edge, as far as the sea.** A flood from every land tile on the edge,
// through land, stopping at water and sky. A row count would be a second copy of the generator's
// shape and would drift the first time the map was regenerated; the flood reads the ground that is
// actually there, and on the Aravali it stops exactly at the strait.
//
// Keyed by the world seed, which for a field map is its id -- the same key `creatureFor` already
// takes, so no caller has to change. A seed that is not a field map, or a map with no edges, is
// its continent everywhere.
//
// Pure apart from the cache. No React, no Phaser.

import { fieldMaps } from '../content/places';
import { buildFieldMap } from './fieldMap';
import type { BiomeId, Landmass, Point } from './types';

/** What a landmass does not continue across. The sky islands are the crossing, not a shore. */
const NOT_LAND = new Set<BiomeId>(['sea', 'sky_island', 'sky_underside', 'sky_water'] as BiomeId[]);

interface Ground {
  continent: Landmass;
  /** Tile keys `x,y` that belong to another landmass, and which. */
  across: Map<string, Landmass>;
}

const grounds = new Map<string, Ground | null>();

function groundOf(seed: string): Ground | null {
  if (grounds.has(seed)) return grounds.get(seed)!;
  const map = fieldMaps.find((m) => m.id === seed) ?? null;
  const edges = map ? Object.entries(map.landmassEdges) : [];
  if (!map || edges.length === 0) {
    const plain = map ? { continent: map.continent, across: new Map<string, Landmass>() } : null;
    grounds.set(seed, plain);
    return plain;
  }
  const { world } = buildFieldMap(map);
  const H = world.tiles.length;
  const W = world.tiles[0]!.length;
  const land = (x: number, y: number) => !NOT_LAND.has(world.tiles[y]![x]!.biome);
  const across = new Map<string, Landmass>();
  for (const [edge, landmass] of edges) {
    const queue: Point[] = [];
    const seedTile = (x: number, y: number) => {
      const key = `${x},${y}`;
      if (!land(x, y) || across.has(key)) return;
      across.set(key, landmass as Landmass);
      queue.push({ x, y });
    };
    for (let i = 0; i < (edge === 'north' || edge === 'south' ? W : H); i++) {
      if (edge === 'north') seedTile(i, 0);
      else if (edge === 'south') seedTile(i, H - 1);
      else if (edge === 'west') seedTile(0, i);
      else seedTile(W - 1, i);
    }
    while (queue.length) {
      const { x, y } = queue.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H) seedTile(nx, ny);
      }
    }
  }
  const ground = { continent: map.continent, across };
  grounds.set(seed, ground);
  return ground;
}

/**
 * The landmass this tile is on, or null when the seed is not a field map -- which places
 * everything, as before landmasses existed.
 */
export function landmassAt(seed: string, at: Point): Landmass | null {
  const ground = groundOf(seed);
  if (!ground) return null;
  return ground.across.get(`${at.x},${at.y}`) ?? ground.continent;
}

/**
 * Whether a species may stand on this landmass.
 *
 * No `landmasses` means anywhere its biomes are, which is most species. A null landmass -- a
 * world that is not a field map -- admits everything.
 */
export function livesOn(landmasses: readonly Landmass[] | null, here: Landmass | null): boolean {
  return !landmasses || !here || landmasses.includes(here);
}
