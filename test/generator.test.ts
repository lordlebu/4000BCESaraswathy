// Guardrails for the world generator.
//
// These exist because the vanilla prototype shipped a generator that silently could not produce
// hills, mountains, desert or rivers for months, and its smoke test still passed — it asserted
// "at least five biomes" while counting `settlement` and `landmark` as biomes, so a map with no
// terrain relief at all scored seven. Every assertion below is aimed at that class of failure:
// the game runs, nothing throws, and a third of the content is unreachable.

import { describe, expect, it } from 'vitest';
import { generateWorld, isWalkable, reachableFrom } from '../src/world/generate';
import { classifyBiome, THRESHOLDS } from '../src/world/classify';
import { normalize } from '../src/world/field';
import type { BiomeId, World } from '../src/world/types';

/** A spread of seeds, fixed so a failure is always reproducible. */
const SEEDS = Array.from({ length: 20 }, (_, i) => `guardrail-${i}`);

const worlds = SEEDS.map((seed) => generateWorld({ seed }));

function histogram(world: World): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const tile of world.tiles.flat()) {
    counts[tile.biome] = (counts[tile.biome] ?? 0) + 1;
  }
  return counts;
}

function tileAt(world: World, p: { x: number; y: number }) {
  return world.tiles[p.y]![p.x]!;
}

describe('elevation and moisture fields', () => {
  it('normalize stretches a field to span the full 0-1 range', () => {
    const cramped = [
      [0.4, 0.42],
      [0.44, 0.46]
    ];
    const spread = normalize(cramped).flat();
    expect(Math.min(...spread)).toBe(0);
    expect(Math.max(...spread)).toBe(1);
  });

  it('normalize survives a perfectly flat field without dividing by zero', () => {
    const flat = normalize([
      [0.5, 0.5],
      [0.5, 0.5]
    ]).flat();
    expect(flat.every((v) => v === 0.5)).toBe(true);
  });

  // The original bug in one assertion: elevation collapsed to roughly 0.09-0.48, so nothing ever
  // cleared the 0.66 hills threshold.
  it('every seed produces elevation above the mountains threshold', () => {
    for (const world of worlds) {
      const peak = Math.max(...world.tiles.flat().map((t) => t.elevation));
      expect(peak, `seed ${world.seed} peaked at ${peak}`).toBeGreaterThan(THRESHOLDS.MOUNTAINS);
    }
  });
});

describe('biome coverage', () => {
  const TERRAIN: BiomeId[] = [
    'sea',
    'coast',
    'plains',
    'forest',
    'wetland',
    'hills',
    'mountains',
    'desert'
  ];

  it.each(TERRAIN)('%s appears in at least one of the 20 sample seeds', (biome) => {
    const seedsWith = worlds.filter((w) => histogram(w)[biome]).length;
    expect(seedsWith, `${biome} appeared in ${seedsWith}/20 seeds`).toBeGreaterThan(0);
  });

  it('every seed has highlands — hills and mountains both present', () => {
    for (const world of worlds) {
      const counts = histogram(world);
      expect(counts.hills ?? 0, `seed ${world.seed}: ${JSON.stringify(counts)}`).toBeGreaterThan(0);
      expect(counts.mountains ?? 0, `seed ${world.seed}: ${JSON.stringify(counts)}`).toBeGreaterThan(0);
    }
  });

  it('every seed has at least one river tile', () => {
    for (const world of worlds) {
      const counts = histogram(world);
      expect(counts.river ?? 0, `seed ${world.seed} carved no river`).toBeGreaterThan(0);
    }
  });

  it('every seed has walkable land worth exploring', () => {
    for (const world of worlds) {
      const land = world.tiles.flat().filter(isWalkable).length;
      const total = world.width * world.height;
      expect(land / total, `seed ${world.seed} was ${Math.round((land / total) * 100)}% land`)
        .toBeGreaterThan(0.35);
    }
  });
});

describe('rivers', () => {
  it('every carved river ends beside water', () => {
    const water = new Set<BiomeId>(['sea', 'coast', 'wetland', 'river']);
    for (const world of worlds) {
      for (const { path } of world.rivers) {
        const mouth = path[path.length - 1]!;
        const neighbours = [
          { x: mouth.x + 1, y: mouth.y },
          { x: mouth.x - 1, y: mouth.y },
          { x: mouth.x, y: mouth.y + 1 },
          { x: mouth.x, y: mouth.y - 1 }
        ]
          .filter((p) => p.x >= 0 && p.x < world.width && p.y >= 0 && p.y < world.height)
          .map((p) => tileAt(world, p).biome);
        expect(
          neighbours.some((b) => water.has(b)),
          `seed ${world.seed}: river ending at ${mouth.x},${mouth.y} touches ${neighbours.join()}`
        ).toBe(true);
      }
    }
  });

  it('rivers are more than a puddle', () => {
    for (const world of worlds) {
      for (const { path } of world.rivers) {
        expect(path.length, `seed ${world.seed}`).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('the journey', () => {
  it('starts on walkable ground, away from the border', () => {
    for (const world of worlds) {
      const start = tileAt(world, world.start);
      expect(isWalkable(start), `seed ${world.seed} started in the sea`).toBe(true);
      expect(world.start.x).toBeGreaterThan(0);
      expect(world.start.y).toBeGreaterThan(0);
      expect(world.start.x).toBeLessThan(world.width - 1);
      expect(world.start.y).toBeLessThan(world.height - 1);
    }
  });

  it('places the landmark somewhere the player can actually walk to', () => {
    for (const world of worlds) {
      const reachable = reachableFrom(world.tiles, world.width, world.height, world.start);
      expect(
        reachable.has(`${world.landmark.x},${world.landmark.y}`),
        `seed ${world.seed}: landmark at ${world.landmark.x},${world.landmark.y} is cut off`
      ).toBe(true);
    }
  });

  // A landmark two steps from the start camp is not a journey. The slice wants 5-10 minutes.
  it('places the landmark far enough away to be a walk', () => {
    for (const world of worlds) {
      const steps =
        Math.abs(world.landmark.x - world.start.x) + Math.abs(world.landmark.y - world.start.y);
      expect(steps, `seed ${world.seed}: landmark was ${steps} steps away`).toBeGreaterThanOrEqual(8);
    }
  });
});

describe('determinism', () => {
  it('the same seed produces an identical world twice', () => {
    const a = generateWorld({ seed: 'determinism-check' });
    const b = generateWorld({ seed: 'determinism-check' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('different seeds produce different worlds', () => {
    const a = generateWorld({ seed: 'one' });
    const b = generateWorld({ seed: 'two' });
    expect(JSON.stringify(a.tiles)).not.toBe(JSON.stringify(b.tiles));
  });
});

describe('classifyBiome', () => {
  it('reads the thresholds it documents', () => {
    expect(classifyBiome(THRESHOLDS.SEA - 0.01, 0.5, 0.5)).toBe('sea');
    expect(classifyBiome(THRESHOLDS.COAST - 0.01, 0.5, 0.5)).toBe('coast');
    expect(classifyBiome(THRESHOLDS.MOUNTAINS + 0.01, 0.5, 0.5)).toBe('mountains');
    expect(classifyBiome(THRESHOLDS.HILLS + 0.01, 0.5, 0.5)).toBe('hills');
    expect(classifyBiome(0.5, THRESHOLDS.WETLAND_MOISTURE + 0.01, 0.5)).toBe('wetland');
    expect(classifyBiome(0.5, THRESHOLDS.FOREST_MOISTURE + 0.01, 0.5)).toBe('forest');
    expect(classifyBiome(0.5, 0.1, THRESHOLDS.DESERT_TEMPERATURE + 0.01)).toBe('desert');
    expect(classifyBiome(0.5, 0.4, 0.4)).toBe('plains');
  });
});
