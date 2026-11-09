// Where the nearest of something you need is, among ground already seen
// (`docs/satchel-and-hearth.md`, phase 7; the owner's ruling, 2 October 2026: seen ground only).

import { describe, expect, it } from 'vitest';
import { nearestSeen, pointerLine } from '../src/content/finding';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMaps } from '../src/content/places';
import { yieldsAt } from '../src/content/gathering';
import { draw, noNodes } from '../src/content/nodes';
import { findPath } from '../src/world/pathfind';
import { isWalkable } from '../src/world/generate';
import { stepCostOn } from '../src/content/species';
import { material } from '../src/content/making';

const world = buildFieldMap(fieldMaps.find((m) => m.id === 'field_map_narmada')!, {}).world;
const start = world.start;
const all = new Set(world.tiles.flat().map((t) => `${t.x},${t.y}`));
const bamboo = { materials: ['material_bamboo_cane'], kinds: [] };

describe('the nearest seen source', () => {
  it('finds the nearest tile that really gives it, with steps and a bearing', () => {
    const p = nearestSeen(world, start, all, bamboo, noNodes(), 0)!;
    expect(p).not.toBeNull();
    const tile = world.tiles[p.at.y]![p.at.x]!;
    expect(yieldsAt(world.seed, tile, tile.biome).map((m) => m.id)).toContain('material_bamboo_cane');
    const path = findPath(world.tiles, world.width, world.height, start, p.at, isWalkable, stepCostOn);
    expect(p.steps).toBe(path.length);
    expect(p.cost).toBe(path.reduce((sum, at) => sum + stepCostOn(world.tiles[at.y]![at.x]!), 0));
    expect(pointerLine(p)).toMatch(/^bamboo cane, (here|\d+ steps? [a-z-]+)$/);
  });

  it('points only at ground already seen', () => {
    expect(nearestSeen(world, start, new Set(), bamboo, noNodes(), 0)).toBeNull();
    const p = nearestSeen(world, start, all, bamboo, noNodes(), 0)!;
    const without = new Set(all);
    without.delete(`${p.at.x},${p.at.y}`);
    const next = nearestSeen(world, start, without, bamboo, noNodes(), 0);
    expect(next?.at).not.toEqual(p.at);
  });

  it('does not point at a tile somebody has emptied', () => {
    const p = nearestSeen(world, start, all, bamboo, noNodes(), 0)!;
    const m = material('material_bamboo_cane')!;
    let nodes = noNodes();
    for (let i = 0; i < 20; i++) nodes = draw(nodes, world.seed, p.at, [{ material: m, count: 1 }], 0);
    expect(nearestSeen(world, start, all, bamboo, nodes, 0)?.at).not.toEqual(p.at);
  });

  it('reads a kind as any material of it', () => {
    const p = nearestSeen(world, start, all, { materials: [], kinds: ['timber'] }, noNodes(), 0)!;
    expect(material(p.id)!.classes).toContain('timber');
  });
});

it('does not send the player across unknown ground to an isolated discovered source', () => {
  const p = nearestSeen(world, start, all, bamboo, noNodes(), 0)!;
  expect(nearestSeen(world, start, new Set([`${start.x},${start.y}`, `${p.at.x},${p.at.y}`]), bamboo, noNodes(), 0)).toBeNull();
});
it('applies the forty-step limit to the route rather than straight-line proximity', () => {
  const p = nearestSeen(world, start, all, bamboo, noNodes(), 0)!;
  const routes = new Map([[`${p.at.x},${p.at.y}`, { cost: 41, steps: 41, previous: null }]]);
  expect(nearestSeen(world, start, all, bamboo, noNodes(), 0, 40, routes)).toBeNull();
  routes.set(`${p.at.x},${p.at.y}`, { cost: 60, steps: 40, previous: null });
  expect(nearestSeen(world, start, all, bamboo, noNodes(), 0, 40, routes)?.steps).toBe(40);
});
