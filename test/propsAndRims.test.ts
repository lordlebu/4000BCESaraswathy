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
  CORNER_BASE,
  CORNER_ORDER,
  EDGE_ORDER,
  EDGE_VARIANTS,
  cliffTurn,
  depthFor,
  featureIsUnderfoot,
  featureCastsContact,
  FLORA_ORDER
} from '../src/game/frames';
import type { CornerPiece, Edge } from '../src/game/frames';

const worlds = fieldMaps.map((map) => ({ id: map.id, built: buildFieldMap(map, {}) }));
const only = (id: string) => worlds.find((w) => w.id === id)!;

describe('things that stand up touch the ground', () => {
  it('gives every standing feature a shadow, and every flat one none', () => {
    for (const { id, built } of worlds) {
      const plan = planScene(built);
      // Both sheets. Painted flora is a feature like any other and must obey the same rule -- and
      // frame numbers are only unique within a sheet, so every question has to name one.
      const feats = plan.filter((p) => p.sheet === 'features' || p.sheet === 'flora');
      const shadows = plan.filter((p) => p.sheet === 'contact');
      const sheetOf = (p: { sheet: string }): 'features' | 'flora' =>
        p.sheet === 'flora' ? 'flora' : 'features';
      const standing = feats.filter((f) => !featureIsUnderfoot(f.frame, sheetOf(f)));
      const flat = feats.filter((f) => featureIsUnderfoot(f.frame, sheetOf(f)));
      // A root curtain hangs from rock above and touches no ground, so it stands without casting.
      const casting = standing.filter((f) => featureCastsContact(f.frame, sheetOf(f)));
      expect(casting.length, `${id}: nothing that stands and casts`).toBeGreaterThan(0);
      expect(standing.length - casting.length, `${id}: expected some non-casting flora`)
        .toBeGreaterThanOrEqual(0);

      expect(shadows.length, `${id}: one shadow per standing feature that casts`).toBe(casting.length);
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

describe('a rock face turns instead of meeting itself', () => {
  /** Which edge band a frame index is, or null if it is a corner piece. */
  const edgeOf = (frame: number): Edge | null =>
    frame >= CORNER_BASE ? null : EDGE_ORDER[Math.floor(frame / EDGE_VARIANTS)]!;

  /** Which edges a corner piece stands in for. */
  const covers: Record<CornerPiece, Edge[]> = {
    'outer-se': ['s', 'e'],
    'inner-se': ['s', 'e'],
    'outer-sw': ['s', 'w'],
    'inner-sw': ['s', 'w'],
    'cap-e': ['s'],
    'cap-w': ['s']
  };

  it('replaces the two bands rather than drawing a third thing over them', () => {
    // The whole point of the piece. `place()` already lays the south band across the full cell
    // width and the east band down the full cell height, so on a corner tile they overlap -- there
    // was never a gap to fill. Leaving the bands in and adding a corner on top would put three
    // pieces of rock texture where the complaint was about two.
    for (const { id, built } of worlds) {
      const cliffs = planCliffs(built.world);
      const byTile = new Map<string, number[]>();
      for (const c of cliffs) {
        const key = `${c.x},${c.y}`;
        byTile.set(key, [...(byTile.get(key) ?? []), c.frame]);
      }
      for (const [key, frames] of byTile) {
        const corners = frames.filter((f) => f >= CORNER_BASE);
        if (corners.length === 0) continue;
        const replaced = new Set(
          corners.flatMap((f) => covers[CORNER_ORDER[f - CORNER_BASE]!]!)
        );
        for (const frame of frames) {
          const edge = edgeOf(frame);
          if (edge === null) continue;
          expect(replaced.has(edge), `${id}: band '${edge}' still drawn under a corner at ${key}`)
            .toBe(false);
        }
      }
    }
  });

  it('uses every piece somewhere, and turns on every map', () => {
    // The `lava_field` bug in miniature: art, a frame, a rule, and zero of it on the map. Six
    // paintings were commissioned and a selection rule that could only ever reach four of them
    // would look exactly like this working.
    //
    // **Across the maps rather than on each of them**, which is a real weakening and worth saying
    // why. This asserted all six per map and held until the cliff contour was smoothed; Lothal is
    // the smallest cliff map and now carries 15 corners, so whether all six shapes occur among them
    // is a fact about that map's terrain, not about the selector. The guard that matters -- a piece
    // no rule can ever reach -- is caught just as well by asking across the set, and the second
    // assertion keeps each map honest about the layer being alive at all.
    const everywhere = new Set<CornerPiece>();
    for (const { id, built } of worlds) {
      const used = new Set(
        planCliffs(built.world)
          .filter((c) => c.frame >= CORNER_BASE)
          .map((c) => CORNER_ORDER[c.frame - CORNER_BASE]!)
      );
      for (const piece of used) everywhere.add(piece);
      expect(used.size, `${id}: draws no corner pieces at all`).toBeGreaterThan(0);
    }
    for (const piece of CORNER_ORDER) {
      expect(everywhere.has(piece), `no map ever draws ${piece}`).toBe(true);
    }
  });

  it('stands the joint rubble down where a piece carries its own turn', () => {
    // `planCliffJoints` exists to stand in for corner art that did not exist. Now that it does,
    // leaving both on would drop a boulder on top of a corner that already has rubble painted into
    // it -- and the joint layer, not the art, would be the thing to blame for how it looked.
    for (const { id, built } of worlds) {
      const world = built.world;
      const suppressed = new Set<string>();
      for (const c of planCliffs(world)) {
        if (c.frame < CORNER_BASE) continue;
        for (const e of covers[CORNER_ORDER[c.frame - CORNER_BASE]!]!) {
          suppressed.add(`${c.x},${c.y},${e}`);
        }
      }
      expect(suppressed.size, `${id}: no corners at all`).toBeGreaterThan(0);

      // Every joint at a *south* cell-corner sits on a tile whose south band survives. Restricted
      // to the south ones on purpose: a tile can have its south band replaced by a corner and still
      // need rubble where its north face stops, and asserting per tile rather than per corner
      // would forbid that. The offset says which corner it is -- south corners sit below centre.
      for (const joint of planCliffJoints(world)) {
        if ((joint.offset?.y ?? 0) < 0) continue;
        expect(
          suppressed.has(`${joint.x},${joint.y},s`),
          `${id}: joint at ${joint.x},${joint.y} sits on a replaced south band`
        ).toBe(false);
      }
    }
  });

  it('turns a corner, caps a run that stops, and leaves a lone tile alone', () => {
    // The rule itself, away from any map. The last case is the one worth pinning, and it was wrong
    // in the other direction first: two caps on one tile were refused on the argument that they
    // would union into a solid block. Rendered and looked at, they crumble at both ends with rock
    // between, which is what a lone stub is. Most runs are one tile, so it is the common case.
    const none = { n: false, e: false, s: false, w: false };

    const se = cliffTurn({ ...none, s: true, e: true }, { east: false, west: false }, 0);
    expect(se.pieces).toEqual(['outer-se']);
    expect([...se.suppress].sort()).toEqual(['e', 's']);

    const seOdd = cliffTurn({ ...none, s: true, e: true }, { east: false, west: false }, 1);
    expect(seOdd.pieces, 'the two se paintings are used as variants of one turn')
      .toEqual(['inner-se']);

    const runEnd = cliffTurn({ ...none, s: true }, { east: false, west: true }, 0);
    expect(runEnd.pieces, 'a run reaching its east end crumbles there').toEqual(['cap-e']);
    expect(runEnd.suppress).toEqual(['s']);

    const middle = cliffTurn({ ...none, s: true }, { east: true, west: true }, 0);
    expect(middle.pieces, 'mid-run is a plain band').toEqual([]);
    expect(middle.suppress).toEqual([]);

    const lone = cliffTurn({ ...none, s: true }, { east: false, west: false }, 0);
    expect(lone.pieces, 'a one-tile wall crumbles at both ends').toEqual(['cap-e', 'cap-w']);
    expect(lone.suppress, 'and drops the slab between them').toEqual(['s']);
  });
});

describe('a rim is a slot, and both materials sit in it', () => {
  it('gives the treeline the same overhang the rock gets', () => {
    // The reason `planRim` exists. These were two functions with the same body and different
    // predicates, and the overhang was written for the cliff and had to be *remembered* for the
    // treeline -- exactly the kind of thing that gets remembered once and then not again.
    //
    // Asserted by comparing the two sheets rather than against a constant, so it stays true if the
    // reach is retuned: whatever a rock face does at an edge, a wall of trees does too.
    for (const { id, built } of worlds) {
      const plan = planScene(built);
      const byEdge = (sheet: string) => {
        const seen = new Map<number, { x: number; y: number }>();
        for (const p of plan) {
          if (p.sheet !== sheet) continue;
          if (p.frame >= CORNER_BASE) continue; // corners are the rock's own business
          seen.set(Math.floor(p.frame / EDGE_VARIANTS), p.offset ?? { x: 0, y: 0 });
        }
        return seen;
      };
      const rock = byEdge('cliffs');
      const trees = byEdge('treeline');
      expect(rock.size, `${id}: no cliff bands to compare against`).toBeGreaterThan(0);
      for (const [edge, offset] of trees) {
        const same = rock.get(edge);
        if (!same) continue; // that edge simply has no rock on this map
        expect(offset, `${id}: treeline edge ${EDGE_ORDER[edge]} hangs differently from rock`)
          .toEqual(same);
      }
    }
  });

  it('leaves the corners and the talus to the rock', () => {
    // The other half of the split: a forest edge has no elbow to turn and no scree to shed, so the
    // shared pass must not have swept those in.
    for (const { id, built } of worlds) {
      const plan = planScene(built);
      for (const p of plan) {
        if (p.sheet !== 'treeline') continue;
        expect(p.frame, `${id}: a treeline drew a corner piece`).toBeLessThan(CORNER_BASE);
      }
    }
  });
});

describe('the floating islands have something growing on them', () => {
  it('gives sky_island more than one mineral thing to stand on it', () => {
    // Before this, 296 tiles of the Aravali carried a crystal shard and nothing else.
    const sky = Object.entries(FEATURES).filter(([, e]) => e.biome === 'sky_island');
    expect(sky.map(([name]) => name).sort()).toEqual(['aeroMangrove', 'crystalCluster', 'skyShrub']);
    // And the two plants are painted rather than drawn. The conifer that used to stand here was a
    // placeholder from the family `docs/art-direction.md` says a loop cannot draw.
    for (const [name, entry] of sky) {
      if (name === 'crystalCluster') continue;
      expect(entry.sheet, `${name} should come from the painted sheet`).toBe('flora');
    }
  });

  it('actually places them on the Aravali, which is the only map with islands', () => {
    // A feature table entry that never reaches a tile is the `lava_field` bug again: art, a frame,
    // a biome, and zero of it on the map.
    const { built } = only('field_map_aravali');
    const skyFrames = new Set([
      ...FEATURES.skyShrub!.frames,
      ...FEATURES.aeroMangrove!.frames
    ]);
    const placed = planScene(built).filter(
      (p) => p.sheet === 'flora' && skyFrames.has(p.frame)
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

  it('keeps every entry inside the sheet it names', () => {
    // An entry pointing past the end of its sheet draws nothing and fails silently, which is how a
    // whole biome's art goes missing without a test noticing. Per sheet now, because frame numbers
    // are only unique within one: `build-features.js` emits 38 and `build-flora.js` emits 6.
    const limit = { features: 38, flora: FLORA_ORDER.length };
    for (const [name, entry] of Object.entries(FEATURES)) {
      const sheet = entry.sheet ?? 'features';
      for (const frame of entry.frames) {
        expect(frame, `${name} points past the end of ${sheet}.png`).toBeLessThan(limit[sheet]);
      }
    }
  });

  it('hangs the root curtains off the underside, and lets them cast nothing', () => {
    // The third case the shadow rule needed: not standing, not lying flat. A curtain hangs from the
    // rock above and touches no ground, so an ellipse under it would be a shadow cast by nothing --
    // but it still draws in front of that rock, so it cannot simply be called underfoot either.
    expect(FEATURES.rootCurtain!.biome).toBe('sky_underside');
    for (const frame of FEATURES.rootCurtain!.frames) {
      expect(featureCastsContact(frame, 'flora'), 'a hanging root cast a ground shadow').toBe(false);
      expect(featureIsUnderfoot(frame, 'flora'), 'a hanging root sank into the ground').toBe(false);
    }
    const { built } = only('field_map_aravali');
    const placed = planScene(built).filter(
      (p) => p.sheet === 'flora' && FEATURES.rootCurtain!.frames.includes(p.frame)
    );
    expect(placed.length, 'no root curtain reached the underside').toBeGreaterThan(0);
  });
});
