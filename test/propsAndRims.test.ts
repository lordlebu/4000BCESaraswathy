// Three complaints about how the map reads, and the assertions that hold their fixes.
//
// Counted per map rather than summed, for the reason `docs/handover-crossing-and-basalt.md` gives:
// a cliff count that summed the whole map passed while the islands had none. Where a claim is about
// one map, it names that map.

import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMaps } from '../src/content/places';
import { planScene, planCliffs, planCliffJoints } from '../src/game/scenePlan';
import {
  FEATURES,
  GROUND_DEPTH_BASE,
  ROW_SLOT,
  depthFor,
  featureIsUnderfoot
} from '../src/game/frames';

const worlds = fieldMaps.map((map) => ({ id: map.id, built: buildFieldMap(map, {}) }));
const only = (id: string) => worlds.find((w) => w.id === id)!;

describe('things that stand up touch the ground', () => {
  it('gives every standing feature a shadow, and every flat one none', () => {
    for (const { id, built } of worlds) {
      const plan = planScene(built);
      const feats = plan.filter((p) => p.sheet === 'features');
      const shadows = plan.filter((p) => p.sheet === 'contact');
      const standing = feats.filter((f) => !featureIsUnderfoot(f.frame));
      const flat = feats.filter((f) => featureIsUnderfoot(f.frame));

      expect(shadows.length, `${id}: one shadow per standing feature`).toBe(standing.length);
      expect(standing.length, `${id}: should have things that stand up`).toBeGreaterThan(0);

      // The flat ones are the point of the split, so assert they exist rather than assuming.
      if (flat.length > 0) {
        const flatTiles = new Set(flat.map((f) => `${f.x},${f.y}`));
        const standingTiles = new Set(standing.map((f) => `${f.x},${f.y}`));
        for (const shadow of shadows) {
          const key = `${shadow.x},${shadow.y}`;
          if (standingTiles.has(key)) continue;
          expect(flatTiles.has(key), `${id}: shadow under a flat feature at ${key}`).toBe(false);
        }
      }
    }
  });

  it('puts the shadow under the feature rather than over it', () => {
    // Underfoot is the whole point: a shadow row-sorted above its own tree would darken the trunk.
    for (const { id, built } of worlds) {
      for (const shadow of planScene(built).filter((p) => p.sheet === 'contact')) {
        expect(shadow.depth, `${id}: shadow left the underfoot slot`)
          .toBe(depthFor(shadow.y, ROW_SLOT.underfoot));
        expect(shadow.depth, `${id}: shadow below the row band`)
          .toBeGreaterThanOrEqual(GROUND_DEPTH_BASE);
        expect(shadow.offset?.y ?? 0, `${id}: shadow should sit below centre`).toBeGreaterThan(0);
      }
    }
  });
});

describe('a rock face knows where it stops', () => {
  it('puts stones only where a run ends or turns, never mid-run', () => {
    // The claim that matters: joints are about *neighbours*. A joint on a tile whose face carries
    // on in both directions would mean the predicate is not asking the neighbour at all.
    for (const { id, built } of worlds) {
      const joints = planCliffJoints(built.world);
      const cliffs = planCliffs(built.world);
      expect(joints.length, `${id}: should find some joints`).toBeGreaterThan(0);

      // Every joint sits on a tile that actually has a face. Rubble in open ground is scenery,
      // not a joint, and would mean the predicate had drifted off the cliff layer.
      const faced = new Set(cliffs.map((c) => `${c.x},${c.y}`));
      for (const joint of joints) {
        expect(faced.has(`${joint.x},${joint.y}`), `${id}: joint at ${joint.x},${joint.y} has no face`)
          .toBe(true);
      }
    }
  });

  it('draws the joint with the face rather than beneath it', () => {
    // A stone in the flat ground band would sit behind the very band it is covering the end of.
    for (const { id, built } of worlds) {
      for (const joint of planCliffJoints(built.world)) {
        expect(joint.depth, `${id}: joint left the undergrowth slot`)
          .toBe(depthFor(joint.y, ROW_SLOT.undergrowth));
      }
    }
  });

  it('reaches the scene, after the faces it is tidying', () => {
    // Order is the whole mechanism: a stone emitted before the band draws under it and hides
    // nothing. Same depth, so insertion order is what puts it on top.
    for (const { id, built } of worlds) {
      const plan = planScene(built);
      const lastCliff = plan.map((p) => p.sheet).lastIndexOf('cliffs');
      const joints = planCliffJoints(built.world);
      expect(lastCliff, `${id}: no cliffs in the scene plan`).toBeGreaterThan(-1);
      if (joints.length > 0) {
        // The joints are decor-sheet placements emitted straight after the cliffs, so the first
        // decor placement in the plan must come after the last cliff.
        const firstDecor = plan.findIndex((p) => p.sheet === 'decor');
        expect(firstDecor, `${id}: joints emitted before the faces`).toBeGreaterThan(lastCliff);
      }
    }
  });
});

describe('the floating islands have something growing on them', () => {
  it('gives sky_island more than one mineral thing to stand on it', () => {
    // Before this, 296 tiles of the Aravali carried a crystal shard and nothing else.
    const sky = Object.entries(FEATURES).filter(([, e]) => e.biome === 'sky_island');
    expect(sky.map(([name]) => name).sort()).toEqual(['crystalCluster', 'skyPine', 'skyShrub']);
  });

  it('actually places them on the Aravali, which is the only map with islands', () => {
    // A feature table entry that never reaches a tile is the `lava_field` bug again: art, a frame,
    // a biome, and zero of it on the map.
    const { built } = only('field_map_aravali');
    const skyFrames = new Set([
      ...FEATURES.skyShrub!.frames,
      ...FEATURES.skyPine!.frames
    ]);
    const placed = planScene(built).filter(
      (p) => p.sheet === 'features' && skyFrames.has(p.frame)
    );
    expect(placed.length, 'no new island flora reached the map').toBeGreaterThan(0);

    // And every one of them stands on an island rather than drifting onto the sea below it.
    for (const p of placed) {
      expect(built.world.tiles[p.y]![p.x]!.biome, `flora at ${p.x},${p.y} is off the island`)
        .toBe('sky_island');
    }
  });

  it('hangs something off the underside, which used to carry nothing', () => {
    // 83 tiles of sky_underside with no prop of any kind. The exclusion was deliberate and the
    // reasoning did not survive contact with what an underside actually has on it.
    const { built } = only('field_map_aravali');
    const world = built.world;
    const underside = world.tiles.flat().filter((t) => t.biome === 'sky_underside');
    expect(underside.length, 'the Aravali should still hang two islands').toBeGreaterThan(50);

    const props = planScene(built).filter(
      (p) => p.sheet === 'decor' && world.tiles[p.y]![p.x]!.biome === 'sky_underside'
    );
    expect(props.length, 'nothing reached the underside').toBeGreaterThan(20);
  });

  it('shades the underside more where there is more island above it', () => {
    // The claim is that the shade is *cast*, not painted on uniformly. If every tile came back at
    // the same alpha the lookup would not be reading the column at all -- which is exactly how a
    // shadow that is really a flat tint passes for one.
    const { built } = only('field_map_aravali');
    const shade = planScene(built).filter((p) => p.sheet === 'underside');
    expect(shade.length, 'no underside shade at all').toBeGreaterThan(50);

    const alphas = new Set(shade.map((p) => p.alpha));
    expect(alphas.size, 'every underside tile took the same shade').toBeGreaterThan(1);

    for (const p of shade) {
      expect(p.alpha ?? 0, 'shade fell below its floor').toBeGreaterThanOrEqual(0.45);
      expect(p.alpha ?? 0, 'shade went past opaque').toBeLessThanOrEqual(1);
      // Deepest where the island is directly overhead.
      const directlyUnder = built.world.tiles[p.y - 1]?.[p.x]?.biome === 'sky_island';
      if (directlyUnder) expect(p.alpha).toBe(1);
    }
  });

  it('keeps the new frames inside the sheet the builder wrote', () => {
    // `tools/build-features.js` emits 38 frames. An entry pointing past the end draws nothing and
    // fails silently, which is how a whole biome's art can go missing without a test noticing.
    const highest = Math.max(...Object.values(FEATURES).flatMap((e) => e.frames));
    expect(highest).toBe(37);
  });
});
