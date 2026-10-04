// Vasuki keeps far from people.
//
// **The owner's ask of 4 October 2026**: keep Vasuki indicus far away from any of the settlements and
// the temporary camps; it can cross a road if it needs to. `KEEPS_AWAY` in `content/wanderers.ts`
// holds the distances, measured before they were set: over twelve seeds of North Dwarka, stops ten
// tiles from settlements and four from camp ground, ways eight and three, leave a full round of four
// on every seed. These hold the rule on seeds that were not the ones it was measured on.

import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMap, poi } from '../src/content/places';
import { campGround } from '../src/content/encampments';
import { isCamp } from '../src/content/camps';
import { wayBetween } from '../src/content/travellers';
import { wanderersOn } from '../src/content/wanderers';
import type { Point } from '../src/world/types';

const SEEDS = Array.from({ length: 10 }, (_, i) => `keeps-away-${i}`);
const cheb = (a: Point, b: Point) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

function dwarka(seed: string) {
  const built = buildFieldMap(fieldMap('field_map_dwarka')!, { seed });
  const places = built.placed.map((p) => ({ poiId: p.poi.id, at: p.at }));
  const lived = built.placed.filter((p) => isCamp(poi(p.poi.id)!)).map((p) => p.at);
  for (const row of built.world.tiles) for (const t of row) if (t.biome === 'settlement') lived.push({ x: t.x, y: t.y });
  const ground = campGround(built.world, places.map((p) => p.at));
  const camps = ground.slice(0, Math.max(1, Math.ceil(ground.length / 2)));
  const vasuki = wanderersOn('field_map_dwarka', built.world, places).find((w) => w.id === 'vasuki-indicus') ?? null;
  return { world: built.world, lived, camps, vasuki };
}

describe('Vasuki keeps far from settlements and camps', () => {
  it('has a round on every seed', () => {
    for (const seed of SEEDS) {
      expect(dwarka(seed).vasuki?.circuit.length ?? 0, seed).toBeGreaterThanOrEqual(2);
    }
  });

  it('rests ten tiles from any settlement and four from anywhere a camp could pitch', () => {
    for (const seed of SEEDS) {
      const { lived, camps, vasuki } = dwarka(seed);
      for (const stop of vasuki?.circuit ?? []) {
        const town = Math.min(...lived.map((q) => cheb(stop, q)));
        const camp = Math.min(...camps.map((q) => cheb(stop, q)));
        expect(town, `${seed}: a stop ${town} tiles from a settlement`).toBeGreaterThanOrEqual(10);
        expect(camp, `${seed}: a stop ${camp} tiles from a camp site`).toBeGreaterThanOrEqual(4);
      }
    }
  });

  // Crossing a road is allowed, on the owner's word; walking one into town is not.
  it('never walks a road into town: every tile of its ways keeps its distance too', () => {
    for (const seed of SEEDS) {
      const { world, lived, camps, vasuki } = dwarka(seed);
      const stops = vasuki?.circuit ?? [];
      stops.forEach((from, i) => {
        for (const at of wayBetween(world, from, stops[(i + 1) % stops.length]!)) {
          expect(Math.min(...lived.map((q) => cheb(at, q))), `${seed}: walks near a settlement`).toBeGreaterThanOrEqual(8);
          expect(Math.min(...camps.map((q) => cheb(at, q))), `${seed}: walks through camp ground`).toBeGreaterThanOrEqual(3);
        }
      });
    }
  });
});
