import {band} from '../world/classify';
import {pointKey} from '../world/pathfind';
import {tileHash} from '../world/rng';
import {inTwinHighlands} from '../world/twinHighlands';
import type {Point, Tile, World} from '../world/types';
import {depthFor, ROW_SLOT} from './frames';
import type {Placement} from './scenePlan';

export type ReliefStyle = 'rounded' | 'terraces' | 'alpine' | 'combined';
export const RELIEF_DIRECTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
export type ReliefCell = {joins: number; faces: number; material: 'hill' | 'rock' | 'snow'; style: ReliefStyle};

function material(tile: Tile | undefined): ReliefCell['material'] | undefined {
  if (!tile || !inTwinHighlands(tile) || tile.road || tile.track || tile.bridge) return;
  if (tile.biome === 'hills') return 'hill';
  if (tile.biome === 'mountains') return 'rock';
  if (tile.biome === 'snow') return 'snow';
}

export function reliefCell(world: World, tile: Tile, style: ReliefStyle): ReliefCell | undefined {
  const kind = material(tile);
  if (!kind) return;
  let joins = 0, faces = 0;
  for (const [side, [dx, dy]] of RELIEF_DIRECTIONS.entries()) {
    const neighbour = world.tiles[tile.y + dy]?.[tile.x + dx];
    if (material(neighbour)) joins |= 1 << side;
    // Water and stairs remain their own surface. The rock cap ends on this side of the bank.
    if (neighbour && neighbour.biome !== 'river' && !neighbour.road && !neighbour.track &&
      (band(tile.elevation) > band(neighbour.elevation) || kind !== 'hill' && neighbour.biome === 'hills')) {
      faces |= 1 << side;
    }
  }
  return {joins, faces, material: kind, style};
}

export const RELIEF_ROCK_SUMMIT = 0;
export const RELIEF_SNOW_SUMMIT = 1;
export const RELIEF_CAVE_SKIRT = 2;
export const RELIEF_CAVE_LEFT = 3;
export const RELIEF_CAVE_RIGHT = 4;

/** Pick crowns on interior, connected plateau cells using only data carried by a bake. */
export function planTwinSummits(world: World, reserved: ReadonlySet<string>): Placement[] {
  const plateaus = world.tiles.flat().filter(t => material(t) === 'rock' || material(t) === 'snow');
  const unvisited = new Map(plateaus.map(t => [pointKey(t), t]));
  const result: Placement[] = [];
  const rank = (t: Point) => tileHash(world.seed, t.x, t.y, 'twin-relief-crown');
  while (unvisited.size) {
    const root = unvisited.values().next().value!;
    const kind = material(root);
    const queue = [root];
    unvisited.delete(pointKey(root));
    for (const tile of queue) for (const [dx, dy] of RELIEF_DIRECTIONS) {
      const key = pointKey({x: tile.x + dx, y: tile.y + dy});
      const next = unvisited.get(key);
      if (!next || material(next) !== kind || band(next.elevation) !== band(root.elevation)) continue;
      unvisited.delete(key);
      queue.push(next);
    }
    const inset = (tile: Tile) => {
      let distance = 0;
      for (let r = 1; r <= 3; r++) {
        if (RELIEF_DIRECTIONS.some(([dx, dy]) => material(world.tiles[tile.y + dy * r]?.[tile.x + dx * r]) !== kind)) break;
        distance = r;
      }
      return distance;
    };
    const candidates = queue.filter(t => !reserved.has(pointKey(t)) && !reserved.has(pointKey({x:t.x, y:t.y - 1})))
      .map(tile => ({tile, inset: inset(tile)})).filter(p => p.inset > 0)
      .sort((a, b) => b.inset - a.inset || rank(a.tile) - rank(b.tile));
    const count = Math.min(3, Math.ceil(queue.length / 40));
    const crowns: Point[] = [];
    for (const {tile} of candidates) {
      if (crowns.length >= count) break;
      if (crowns.some(p => Math.abs(p.x - tile.x) + Math.abs(p.y - tile.y) < 6)) continue;
      crowns.push(tile);
      result.push({sheet:'twinRelief', frame:kind === 'snow' ? RELIEF_SNOW_SUMMIT : RELIEF_ROCK_SUMMIT,
        x:tile.x, y:tile.y, depth:depthFor(tile.y,ROW_SLOT.undergrowth), name:'highland:crown', twinShadow:'outcrop'});
    }
  }
  return result;
}
