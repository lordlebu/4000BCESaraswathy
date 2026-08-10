// Content and journal guardrails, ported from `src/smoke-test.js`.
//
// The data files are generated from `docs/bestiary.md` by `tools/build-species-data.js`, so these
// assertions are really assertions about the build script: they catch a species filed under a
// biome that does not exist, a biome left with nothing to see, and any `undefined` that would
// otherwise reach the player's journal.

import { describe, expect, it } from 'vitest';
import { biomes, creatures, creatureFor, creaturesIn, flora, floraFor, floraIn } from '../src/content/species';
import { creatureAction, describeSurroundings, describeTile, landmarkHint } from '../src/content/journal';
import { generateWorld, isWalkable } from '../src/world/generate';
import type { BiomeId } from '../src/world/types';

const world = generateWorld({ seed: 'play-test' });
const tiles = world.tiles.flat();
const biomeIds = new Set(biomes.map((b) => b.id));

describe('data shape', () => {
  it.each([
    ['creatures', creatures],
    ['flora', flora]
  ] as const)('every %s entry has an id, a name and a journal prompt', (_label, entries) => {
    for (const entry of entries) {
      expect(entry.id, JSON.stringify(entry)).toBeTruthy();
      expect(entry.name, entry.id).toBeTruthy();
      expect(entry.journalPrompt, entry.id).toBeTruthy();
    }
  });

  it.each([
    ['creatures', creatures],
    ['flora', flora]
  ] as const)('every %s entry references a biome that exists', (label, entries) => {
    for (const entry of entries) {
      for (const biome of entry.biomes) {
        expect(biomeIds.has(biome), `${label} "${entry.name}" references unknown biome "${biome}"`).toBe(true);
      }
    }
  });

  it.each([
    ['creatures', creatures],
    ['flora', flora]
  ] as const)('%s ids are unique', (_label, entries) => {
    const ids = entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // This is the "undefined presence" bug as a test: creatureAction interpolates `mood`.
  it('every encounterable creature has a mood', () => {
    for (const creature of creatures.filter((c) => c.placement === 'encounter')) {
      expect(creature.mood, `${creature.name} has no mood`).toBeTruthy();
    }
  });

  it('the generator and the data agree on what is walkable', () => {
    for (const biome of biomes) {
      expect(isWalkable({ biome: biome.id }), `${biome.id}`).toBe(biome.walkable);
    }
  });
});

describe('coverage', () => {
  it.each(biomes.filter((b) => b.walkable).map((b) => b.id))(
    '%s has something to see and something growing',
    (biome: BiomeId) => {
      expect(creaturesIn(biome).length, `${biome} has no encounterable creature`).toBeGreaterThan(0);
      expect(floraIn(biome).length, `${biome} has nothing growing`).toBeGreaterThan(0);
    }
  );
});

describe('rarity keeps the horrors rare', () => {
  // The Asura-tainted species are placed on purpose — they are meant to be met, occasionally,
  // and to unsettle. `rarity` is what keeps "occasionally" true. It sat in the data unread for
  // a long time while `pickFor` drew uniformly, and at that point half the settlement pool was
  // Asura-tainted: a horror in every second village. If these numbers ever climb back, weighting
  // has been bypassed rather than the content having changed.
  const sample = (biome: BiomeId) => {
    let horrors = 0;
    const runs = 4000;
    for (let i = 0; i < runs; i += 1) {
      const met = creatureFor({ x: i % 97, y: Math.floor(i / 97), biome }, `rarity-${i % 13}`);
      if (met?.region === 'asura-conjurations') horrors += 1;
    }
    return horrors / runs;
  };

  it('a village is unsettling, not overrun', () => {
    const rate = sample('settlement');
    expect(rate, `settlement horror rate ${(rate * 100).toFixed(1)}%`).toBeLessThan(0.2);
  });

  it('the open country is mostly ordinary', () => {
    for (const biome of ['forest', 'wetland', 'coast', 'mountains'] as BiomeId[]) {
      const rate = sample(biome);
      expect(rate, `${biome} horror rate ${(rate * 100).toFixed(1)}%`).toBeLessThan(0.06);
    }
  });

  it('a common species still outranks a mythic one in the same biome', () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 4000; i += 1) {
      const met = creatureFor({ x: i % 89, y: Math.floor(i / 89), biome: 'settlement' }, `mix-${i % 11}`);
      if (met) counts.set(met.rarity, (counts.get(met.rarity) ?? 0) + 1);
    }
    expect(counts.get('common') ?? 0).toBeGreaterThan(counts.get('mythic') ?? 0);
  });
});

describe('the journal', () => {
  it('fills every field on the starting tile', () => {
    const entry = describeTile(world.tiles[world.start.y]![world.start.x]!, world);
    expect(entry.title).toBeTruthy();
    expect(entry.description).toBeTruthy();
    expect(entry.creature).toBeTruthy();
    expect(entry.flora).toBeTruthy();
  });

  it('never leaks undefined into text the player reads', () => {
    for (const tile of tiles) {
      const entry = describeTile(tile, world);
      const text = [
        entry.title,
        entry.description,
        entry.creature,
        entry.flora,
        creatureAction(creatureFor(tile, world.seed)),
        describeSurroundings(world, tile),
        landmarkHint(world, tile)
      ].join(' ');
      expect(text, `at ${tile.x},${tile.y}`).not.toMatch(/undefined|null|NaN|\[object/);
    }
  });

  it('reads the same way on every revisit', () => {
    for (const tile of tiles) {
      const first = describeTile(tile, world);
      const second = describeTile(tile, world);
      expect(first).toEqual(second);
    }
  });

  // Sky beings and Asura conjurations are authored for lore and must never be encountered.
  it('never surfaces a lore-only species in play', () => {
    const loreNames = new Set(
      [...creatures, ...flora].filter((s) => s.placement === 'lore').map((s) => s.name)
    );
    for (const tile of tiles) {
      expect(loreNames.has(creatureFor(tile, world.seed)?.name ?? '')).toBe(false);
      expect(loreNames.has(floraFor(tile, world.seed)?.name ?? '')).toBe(false);
    }
  });

  it('points the player toward the landmark, and says so on arrival', () => {
    expect(landmarkHint(world, world.start)).toMatch(/elders spoke/);
    expect(landmarkHint(world, world.landmark)).toContain(world.landmark.name);
    expect(landmarkHint(world, world.landmark)).toMatch(/Sit a while/);
  });
});
