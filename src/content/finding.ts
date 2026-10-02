// Where the nearest of something you need is, among the ground you have already seen.
//
// **The owner could not find bamboo on the Narmada** (`docs/satchel-and-hearth.md`, phase 7). On the
// default seed it stood one step from the start, among 707 tiles of forest, and nothing said which
// tile -- you learned what a tile held only by standing on it. Genshin Impact's Track button and
// Subnautica's scanner both answer the same question: where is the nearest one. This is that, with
// the one difference the owner ruled on: **only ground you have seen.** Walking is still how a map is
// known; this remembers what you walked past.
//
// Pure, and free of React and Phaser. React asks it each step and draws the line; the scene draws
// the mark.

import { yieldsAt } from './gathering';
import { type Material, material, materials } from './making';
import { leftAt, type Nodes } from './nodes';
import { bearingTo } from './journal';
import type { Point, World } from '../world/types';

/** How far to look, in steps: a morning's walk out. Further than this is a journey, not a find. */
export const FIND_REACH = 40;

/** Every tile of a world that holds each material, worked out once per world. */
const INDEX = new WeakMap<World, Map<string, Point[]>>();

function sourcesIn(world: World): Map<string, Point[]> {
  const known = INDEX.get(world);
  if (known) return known;
  const index = new Map<string, Point[]>();
  for (const row of world.tiles) {
    for (const t of row) {
      for (const m of yieldsAt(world.seed, t, t.biome)) {
        const list = index.get(m.id);
        if (list) list.push({ x: t.x, y: t.y });
        else index.set(m.id, [{ x: t.x, y: t.y }]);
      }
    }
  }
  INDEX.set(world, index);
  return index;
}

/** The nearest seen source of something wanted. */
export interface Pointer {
  /** The material that lies there. */
  id: string;
  name: string;
  at: Point;
  steps: number;
  /** "north-east", or "here". */
  bearing: string;
}

/**
 * The nearest tile you have seen that still holds something you want, or null.
 *
 * `want` is `goals.wantedNow`'s answer: materials by id, and kinds (`timber`) meaning any material of
 * the class. Steps are counted on the grid, as the landmark's bearing is. A tile somebody has
 * emptied does not count until it has grown back -- `leftAt` decides -- because pointing at bare
 * ground is worse than pointing at nothing.
 */
export function nearestSeen(
  world: World,
  from: Point,
  seen: ReadonlySet<string>,
  want: { materials: readonly string[]; kinds: readonly string[] },
  nodes: Nodes,
  today: number,
  reach = FIND_REACH
): Pointer | null {
  const ids = new Set(want.materials);
  for (const kind of want.kinds) for (const m of materials) if (m.classes.includes(kind as never)) ids.add(m.id);
  const index = sourcesIn(world);
  let best: Pointer | null = null;
  for (const id of ids) {
    const m: Material | null = material(id);
    if (!m) continue;
    for (const at of index.get(id) ?? []) {
      const steps = Math.abs(at.x - from.x) + Math.abs(at.y - from.y);
      if (steps > reach || (best && steps >= best.steps)) continue;
      if (!seen.has(`${at.x},${at.y}`)) continue;
      if (leftAt(nodes, world.seed, at, m, today) <= 0) continue;
      best = { id, name: m.name, at, steps, bearing: bearingTo(from, at) };
    }
  }
  return best;
}

/** "bamboo cane, 12 steps north-east" -- or "bamboo cane, here". */
export function pointerLine(p: Pointer): string {
  const name = p.name.toLowerCase();
  return p.steps === 0 ? `${name}, here` : `${name}, ${p.steps} step${p.steps === 1 ? '' : 's'} ${p.bearing}`;
}
