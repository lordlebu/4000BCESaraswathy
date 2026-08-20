// The three bugs that used to need a screenshot.
//
// Every one of these was reported from play, found with a dev server and a scripted walk, and is
// one assertion here. That is the whole argument for `scenePlan.ts` existing: placement is a
// decision, decisions are testable, and only the drawing needs a browser.
//
// Run against every real field map rather than a fixture. A fixture would prove the rules hold
// somewhere; these prove they hold everywhere a player can actually stand.

import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMaps } from '../src/content/places';
import { planScene, planHuts, planOverdraw, SWAY_PERIOD } from '../src/game/scenePlan';
import { ROW_SLOT, depthFor, featureIsUnderfoot, overdrawIsUnderfoot } from '../src/game/frames';

const worlds = fieldMaps.map((map) => ({ id: map.id, built: buildFieldMap(map, {}) }));
const key = (p: { x: number; y: number }) => `${p.x},${p.y}`;

describe('nothing hides the traveller or what he is walking towards', () => {
  it('never puts undergrowth above a marker on the same tile', () => {
    // The Drowned Dockyard bug. Its marker was drawn under the salt grass growing on its own tile,
    // so a place that was correctly placed simply could not be seen.
    for (const { id, built } of worlds) {
      const plan = planScene(built);
      // Only the low layer. A tree may legitimately stand in front of a marker on its own tile --
      // it is taller than the marker and taller than the traveller -- but grass must not.
      const cover = new Map(
        plan
          .filter((p) => (p.sheet === 'overdraw' || p.sheet === 'features') && p.depth < depthFor(p.y, ROW_SLOT.walker))
          .map((p) => [key(p), p.depth])
      );
      for (const marker of plan.filter((p) => p.sheet === 'marker' || p.sheet === 'places' || p.sheet === 'landmarks')) {
        const over = cover.get(key(marker));
        if (over === undefined) continue;
        expect(over, `${id}: ${marker.name ?? 'marker'} at ${key(marker)} is under vegetation`).toBeLessThan(
          marker.depth
        );
      }
    }
  });

  it('never grows anything through a roof', () => {
    // Paddy sprouted across the thatch of every hut it was planted beside, because the hut layer
    // and the overdraw layer were written a week apart and never told about each other.
    for (const { id, built } of worlds) {
      const huts = new Set(planHuts(built.world).map(key));
      const growing = planOverdraw(built.world, huts).filter((p) => huts.has(key(p)));
      expect(growing.map((p) => key(p)), `${id}: vegetation on a hut tile`).toEqual([]);
    }
  });

  it('draws what lies flat below the traveller, not over his boots', () => {
    // Reported from play: some of this layer is a surface rather than something standing in one.
    // Moss crusts a hill stone, lily pads lie on water, stepping stones are crossed by standing on
    // them -- and all three were drawn above the player, which reads as him sinking into the tile.
    for (const { id, built } of worlds) {
      for (const item of planScene(built)) {
        const flat =
          (item.sheet === 'overdraw' && overdrawIsUnderfoot(item.frame)) ||
          (item.sheet === 'features' && featureIsUnderfoot(item.frame));
        if (!flat) continue;
        expect(item.depth, `${id}: flat ${item.sheet} at ${key(item)} drawn above the walker`)
          .toBeLessThan(depthFor(item.y, ROW_SLOT.walker));
      }
    }
  });

  it('still draws everything that grows above him', () => {
    // The other half, and the one that would break if the flat list ever swallowed a plant: grass
    // and reeds must stay above the walker, because that overlap is the entire point of the layer.
    for (const { id, built } of worlds) {
      for (const item of planScene(built)) {
        if (item.sheet !== 'overdraw' || overdrawIsUnderfoot(item.frame)) continue;
        expect(item.depth, `${id}: growing ${key(item)} fell below the walker`)
          .toBeGreaterThan(depthFor(item.y, ROW_SLOT.walker));
      }
    }
  });

  it('sorts everything that stands on the ground by the row it stands on', () => {
    // The bug that made grass a dozen rows south of the traveller draw across his face: one flat
    // depth for the whole layer, which knows nothing about position.
    //
    // The edge blend is exempt, and is the only thing that is: it *is* ground rather than something
    // standing on it, so it sits in one flat band below every row. See `planEdges`, and the two
    // assertions below that pin it there.
    for (const { id, built } of worlds) {
      for (const item of planScene(built)) {
        if (item.maskFrame !== undefined) continue;
        const lowest = depthFor(item.y, Math.min(...Object.values(ROW_SLOT)));
        const highest = depthFor(item.y, Math.max(...Object.values(ROW_SLOT)));
        expect(item.depth, `${id}: ${item.sheet} at ${key(item)} is outside its row's band`)
          .toBeGreaterThanOrEqual(lowest);
        expect(item.depth).toBeLessThanOrEqual(highest);
      }
    }
  });

  it('keeps each row band clear of the row in front', () => {
    for (const { built } of worlds) {
      const plan = planScene(built);
      const deepestByRow = new Map<number, number>();
      const shallowestByRow = new Map<number, number>();
      for (const p of plan) {
        if (p.maskFrame !== undefined) continue;
        deepestByRow.set(p.y, Math.max(deepestByRow.get(p.y) ?? -Infinity, p.depth));
        shallowestByRow.set(p.y, Math.min(shallowestByRow.get(p.y) ?? Infinity, p.depth));
      }
      for (const [row, deepest] of deepestByRow) {
        const next = shallowestByRow.get(row + 1);
        if (next === undefined) continue;
        expect(deepest, `row ${row} reaches into row ${row + 1}`).toBeLessThan(next);
      }
    }
  });
});

describe('the plan is a function of the world and nothing else', () => {
  it('returns the same plan twice', () => {
    // Placement is seeded from `tileHash`, so a journey stays shareable in a link. A plan that
    // varied between calls would mean the map redrew differently on a scene restart.
    for (const { built } of worlds) {
      expect(planScene(built)).toEqual(planScene(built));
    }
  });

  it('builds huts only on settlement ground, and leaves room between them', () => {
    for (const { id, built } of worlds) {
      const huts = planHuts(built.world);
      for (const hut of huts) {
        expect(built.world.tiles[hut.y]![hut.x]!.biome, `${id}: hut off settlement ground`).toBe('settlement');
      }
      const settlement = built.world.tiles.flat().filter((t) => t.biome === 'settlement').length;
      // Two in three, so a village has courtyards rather than being wall to wall.
      expect(huts.length).toBeLessThan(settlement);
      expect(huts.length).toBeGreaterThan(settlement / 2);
    }
  });

  it('gives every swaying sprite a phase inside one cycle', () => {
    // A phase past the period would clamp to one end and a whole field would blink in unison,
    // which is the thing the offset exists to prevent.
    for (const { built } of worlds) {
      for (const item of planScene(built)) {
        if (!item.sway) continue;
        expect(item.sway.phase).toBeGreaterThanOrEqual(0);
        expect(item.sway.phase).toBeLessThan(SWAY_PERIOD);
        expect(item.sway.lean).not.toBe(item.sway.rest);
      }
    }
  });

  it('keeps the edge blend under everything that stands on the ground', () => {
    // The exemption above is only safe if this holds. The blend draws a *neighbouring* biome over
    // part of this tile, so anything of it that escaped above the row band would paint over a hut
    // roof or a traveller's boots with a patch of the ground next door.
    for (const { id, built } of worlds) {
      for (const item of planScene(built)) {
        if (item.maskFrame === undefined) continue;
        const lowestStanding = depthFor(0, Math.min(...Object.values(ROW_SLOT)));
        expect(item.depth, `${id}: edge blend at ${key(item)} rose into the row band`)
          .toBeLessThan(lowestStanding);
        // And above the flat terrain it is bleeding into, or it would be invisible.
        expect(item.depth).toBeGreaterThan(0);
      }
    }
  });

  it('blends both sides of a boundary, and never a shoreline', () => {
    // Two rules that are easy to get half-right. Blending one side only moves the straight line
    // rather than removing it; blending water to land turns a definite coast into a vague one.
    for (const { id, built } of worlds) {
      const blends = planScene(built).filter((p) => p.maskFrame !== undefined);
      expect(blends.length, `${id}: no edge blending at all`).toBeGreaterThan(0);

      const water = new Set(['sea', 'river']);
      for (const item of blends) {
        const here = built.world.tiles[item.y]![item.x]!.biome;
        // The frame drawn is the neighbour's terrain, so recover which neighbour it was.
        const neighbours = [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0]
        ]
          .map(([dx, dy]) => built.world.tiles[item.y + dy!]?.[item.x + dx!]?.biome)
          .filter((b) => b !== undefined);
        const crossesWater = neighbours.some((n) => water.has(n) !== water.has(here));
        const differs = neighbours.some((n) => n !== here);
        expect(differs, `${id}: blend at ${key(item)} with no differing neighbour`).toBe(true);
        // If every differing neighbour were across water, this tile should have had no blend.
        if (!neighbours.some((n) => n !== here && water.has(n) === water.has(here))) {
          expect(crossesWater, `${id}: blended a shoreline at ${key(item)}`).toBe(false);
        }
      }
    }
  });
});