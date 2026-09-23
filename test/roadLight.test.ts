// Roads seen ahead through the fog, and lit at night. See `game/roadLight.ts`.

import { describe, expect, it } from 'vitest';
import { glowStrength, lampSites, LAMP_GAP, ROAD_SIGHT, roadAhead } from '../src/game/roadLight';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMaps } from '../src/content/places';
import type { Tile, World } from '../src/world/types';

/** `R` road, `B` bridge, `F` ford, anything else plain ground. */
function world(rows: string[]): Pick<World, 'tiles' | 'width' | 'height'> {
  const tiles: Tile[][] = rows.map((row, y) =>
    [...row].map((ch, x) => {
      const tile: Tile = { x, y, biome: 'plains', elevation: 0.3, moisture: 0.5, temperature: 0.5, riverBias: 0 };
      if (ch === 'R') tile.road = true;
      if (ch === 'B') tile.bridge = true;
      if (ch === 'F') tile.ford = true;
      return tile;
    })
  );
  return { tiles, width: rows[0]!.length, height: rows.length };
}

describe('the road ahead', () => {
  it('shows the road for six tiles each way from where you stand on it', () => {
    const w = world(['RRRRRRRRRRRRRRRRRRRR']);
    const seen = roadAhead(w, { x: 10, y: 0 });
    expect(seen.has('4,0')).toBe(true);
    expect(seen.has('16,0')).toBe(true);
    expect(seen.has('3,0'), 'seen further than ROAD_SIGHT').toBe(false);
    expect(seen.has('17,0'), 'seen further than ROAD_SIGHT').toBe(false);
    expect(ROAD_SIGHT).toBe(6);
  });

  it('follows the road over a bridge and a ford', () => {
    const seen = roadAhead(world(['RBBRFRR']), { x: 0, y: 0 });
    expect(seen.has('6,0')).toBe(true);
  });

  it('shows nothing from a field with no road beside it', () => {
    const w = world(['.....', '.....', 'RRRRR']);
    expect(roadAhead(w, { x: 2, y: 0 }).size).toBe(0);
    expect(roadAhead(w, { x: 2, y: 1 }).size).toBeGreaterThan(0);
  });
});

describe('the lamps', () => {
  it('light each end of a bridge and every junction first', () => {
    const w = world([
      '....R....',
      'RRRRRRRBBRRR',
      '....R.......'
    ].map((r) => r.padEnd(12, '.')));
    const sites = lampSites(w);
    const litWithin = (x: number, y: number) =>
      sites.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) < LAMP_GAP);
    expect(sites.map((p) => `${p.x},${p.y}`)).toContain('6,1'); // where the bridge lands, first
    // One pool covers a short bridge's far end and the junction beside it.
    expect(litWithin(9, 1), 'the far end of the bridge is dark').toBe(true);
    expect(litWithin(4, 1), 'the junction is dark').toBe(true);
  });

  it('keep their distance, so a road is lit in pools', () => {
    for (const map of fieldMaps) {
      const sites = lampSites(buildFieldMap(map, { seed: 'lamps' }).world);
      expect(sites.length, `${map.id}: no lamps at all`).toBeGreaterThan(5);
      for (let i = 0; i < sites.length; i += 1) {
        for (let j = i + 1; j < sites.length; j += 1) {
          const gap = Math.abs(sites[i]!.x - sites[j]!.x) + Math.abs(sites[i]!.y - sites[j]!.y);
          expect(gap, `${map.id}: two lamps ${gap} apart`).toBeGreaterThanOrEqual(LAMP_GAP);
        }
      }
    }
  });

  it('stand only on road', () => {
    for (const map of fieldMaps) {
      const { world: w } = buildFieldMap(map, { seed: 'lamps' });
      for (const p of lampSites(w)) expect(w.tiles[p.y]![p.x]!.road, `${map.id} ${p.x},${p.y}`).toBe(true);
    }
  });

  it('are dark at noon, come on through the evening, and are full at night', () => {
    expect(glowStrength(0)).toBe(0);
    expect(glowStrength(0.07)).toBe(0);
    expect(glowStrength(0.17)).toBeGreaterThan(0);
    expect(glowStrength(0.17)).toBeLessThan(1);
    expect(glowStrength(0.3)).toBe(1);
  });
});
