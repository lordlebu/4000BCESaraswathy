// Place names and landmarks.
//
// Naming is the difference between "Settlement at 26, 6" and Hairuvati, so it is worth holding to
// the same standard as the terrain: deterministic, varied, and never embarrassing in front of a
// player.

import { describe, expect, it } from 'vitest';
import { placeName, riverName } from '../src/world/names';
import { generateWorld } from '../src/world/generate';
import { landmarkKindFor, landmarkKinds, landmarkTitle } from '../src/content/landmarks';
import { arrivalPage, describeTile, landmarkHint } from '../src/content/journal';
import type { PlaceKind } from '../src/world/names';
import type { TerrainBiomeId } from '../src/world/types';

const SEEDS = Array.from({ length: 20 }, (_, i) => `guardrail-${i}`);
const worlds = SEEDS.map((seed) => generateWorld({ seed }));

const KINDS: PlaceKind[] = ['settlement', 'river', 'landmark', 'region'];

describe('place names', () => {
  it('are deterministic for a given seed and tile', () => {
    for (const kind of KINDS) {
      expect(placeName('fixed', kind, { x: 4, y: 9 })).toBe(placeName('fixed', kind, { x: 4, y: 9 }));
    }
  });

  it('change with the seed and with the tile', () => {
    expect(placeName('one', 'settlement', { x: 4, y: 9 })).not.toBe(
      placeName('two', 'settlement', { x: 4, y: 9 })
    );
    const across = new Set(
      Array.from({ length: 40 }, (_, i) => placeName('spread', 'settlement', { x: i, y: i * 2 }))
    );
    // Not all 40 need be unique, but a handful of repeats would mean the hash is barely moving.
    expect(across.size).toBeGreaterThan(25);
  });

  it('are readable: capitalised, no doubled vowels at the join, sensible length', () => {
    for (const kind of KINDS) {
      for (let i = 0; i < 200; i += 1) {
        const name = placeName('legibility', kind, { x: i, y: (i * 7) % 31 });
        expect(name, name).toMatch(/^[A-Z][a-z]+$/);
        expect(name.length, name).toBeGreaterThanOrEqual(5);
        expect(name.length, name).toBeLessThanOrEqual(14);
        // Three of the same letter in a row is a generator artefact, not a name.
        expect(name, name).not.toMatch(/(.)\1\1/);
      }
    }
  });

  it('gives rivers an article', () => {
    expect(riverName('seed', { x: 1, y: 1 })).toMatch(/^the [A-Z]/);
  });
});

describe('named world', () => {
  it('names the settlement, the landmark and every river', () => {
    for (const world of worlds) {
      expect(world.landmark.name, world.seed).toMatch(/^[A-Z]/);
      if (world.settlement) expect(world.settlement.name, world.seed).toMatch(/^[A-Z]/);
      for (const river of world.rivers) {
        expect(river.name, world.seed).toMatch(/^the [A-Z]/);
        expect(river.path.length).toBeGreaterThan(0);
      }
    }
  });

  it('titles a named tile by its name rather than its coordinates', () => {
    for (const world of worlds) {
      const landmarkTile = world.tiles[world.landmark.y]![world.landmark.x]!;
      expect(describeTile(landmarkTile, world).title).toContain(world.landmark.name);

      if (world.settlement) {
        const tile = world.tiles[world.settlement.y]![world.settlement.x]!;
        expect(describeTile(tile, world).title).toContain(world.settlement.name);
      }
    }
  });
});

describe('landmarks', () => {
  // The whole point of the terrain field on Landmark: a shell beach must not appear in the
  // mountains. If this fails, `landmarkKindFor` is falling through to its emergency fallback.
  it('every terrain the generator can place a landmark on has a suited kind', () => {
    const placeable: TerrainBiomeId[] = [
      'forest',
      'hills',
      'mountains',
      'wetland',
      'plains',
      'desert',
      'coast'
    ];
    for (const terrain of placeable) {
      const suited = landmarkKinds.filter((k) => k.terrain.includes(terrain));
      expect(suited.length, `no landmark kind suits ${terrain}`).toBeGreaterThan(0);
    }
  });

  it('picks a kind that actually suits the ground it stands on', () => {
    for (const world of worlds) {
      const kind = landmarkKindFor(world.landmark, world.seed);
      // `river` is placeable but has no dedicated kind list beyond heron-pool; assert only that a
      // suited kind was chosen whenever one exists.
      const suited = landmarkKinds.filter((k) => k.terrain.includes(world.landmark.terrain));
      if (suited.length) {
        expect(
          suited.map((k) => k.id),
          `${world.seed}: ${kind.id} on ${world.landmark.terrain}`
        ).toContain(kind.id);
      }
    }
  });

  // This started at "more than 2 kinds", which a playtest walked straight past: three of five
  // showcase seeds were handing out the same salt pan, one of them on a monsoon shore with no
  // desert anywhere on the map. The cause was in placement rather than in this data — the landmark
  // went to the furthest reachable tile, which is nearly always map edge, so coast and plains took
  // 39 of 60 seeds between them while standing stones never appeared at all. Levelling the terrains
  // before picking a tile fixed it; this threshold is what stops it drifting back.
  it('varies across seeds rather than always choosing the same kind', () => {
    const chosen = new Set(worlds.map((w) => landmarkKindFor(w.landmark, w.seed).id));
    expect(chosen.size, `only saw ${[...chosen].join(', ')}`).toBeGreaterThanOrEqual(4);
  });

  it('spreads the landmark over varied ground, not just the coastline', () => {
    const ground = new Set(worlds.map((w) => w.landmark.terrain));
    expect(ground.size, `only stood on ${[...ground].join(', ')}`).toBeGreaterThanOrEqual(4);
  });

  it('every authored kind has prose worth stopping for', () => {
    for (const kind of landmarkKinds) {
      expect(kind.id).toMatch(/^[a-z-]+$/);
      expect(kind.name, kind.id).toBeTruthy();
      expect(kind.terrain.length, kind.id).toBeGreaterThan(0);
      expect(kind.description.length, kind.id).toBeGreaterThan(60);
      expect(kind.arrival.length, kind.id).toBeGreaterThan(120);
    }
  });

  it('writes an arrival page naming the place and the seed', () => {
    for (const world of worlds) {
      const page = arrivalPage(world);
      expect(page.title).toBe(landmarkTitle(world.landmark, world.seed));
      expect(page.body).toBe(landmarkKindFor(world.landmark, world.seed).arrival);
      expect(page.closing).toContain(world.landmark.name);
      expect(page.closing).toContain(world.seed);
      expect(page.closing).not.toMatch(/undefined|null/);
    }
  });

  it('names the landmark in the hint from the very first step', () => {
    for (const world of worlds) {
      expect(landmarkHint(world, world.start)).toContain(world.landmark.name);
    }
  });
});
