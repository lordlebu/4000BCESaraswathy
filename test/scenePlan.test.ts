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
import {
  ROW_SLOT,
  depthFor,
  featureIsUnderfoot,
  overdrawIsUnderfoot,
  EDGE_ORDER,
  EDGE_STEP,
  EDGE_VARIANTS,
  FENCE_FIRST,
  FENCE_PIECES
} from '../src/game/frames';
import { band } from '../src/world/classify';

const worlds = fieldMaps.map((map) => ({ id: map.id, built: buildFieldMap(map, {}) }));
const key = (p: { x: number; y: number }) => `${p.x},${p.y}`;

/** Whether an overdraw frame is one of the sixteen fence pieces rather than something growing. */
const isFence = (frame: number): boolean =>
  frame >= FENCE_FIRST && frame < FENCE_FIRST + FENCE_PIECES;

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
    //
    // **Vegetation, not everything on the tile.** The check used to be "nothing at all on a hut
    // tile", which was the same thing while a fence could only be drawn on the settlement's
    // southern edge and hut tiles were skipped outright. Once the fence went round the whole
    // perimeter that stopped being true and stopped being wanted: two settlement tiles in three
    // hold a hut, so refusing them disqualified most of the boundary -- seventeen edge tiles
    // produced two fences on Lothal.
    //
    // A fence and a hut on one tile is right. The fence runs inside the tile's edge and the hut
    // stands in the middle of it; a boundary that stopped wherever somebody had built is not a
    // boundary. What must never share the tile is anything that *grows*.
    for (const { id, built } of worlds) {
      const huts = new Set(planHuts(built.world).map(key));
      const growing = planOverdraw(built.world, huts)
        .filter((p) => huts.has(key(p)))
        .filter((p) => !isFence(p.frame));
      expect(growing.map((p) => key(p)), `${id}: vegetation on a hut tile`).toEqual([]);
    }
  });

  it('fences every tile on the boundary, not one edge of it', () => {
    // **The bug this change exists to fix, and the assertion that catches it coming back.**
    //
    // The fence used to be drawn only where a settlement tile had open ground *to the south*,
    // because the single fence frame was a bottom rail and could not honestly be anything else.
    // Measured on the built maps that produced two fences against seventeen boundary tiles on
    // Lothal, and four on Dwarka -- about 88% of every settlement's perimeter open.
    //
    // Restoring the south-only rule passes every other test in this file, which is why this one
    // is here.
    for (const { id, built } of worlds) {
      const world = built.world;
      const wanted: string[] = [];
      for (let y = 0; y < world.height; y += 1) {
        for (let x = 0; x < world.width; x += 1) {
          if (world.tiles[y]![x]!.biome !== 'settlement') continue;
          const onEdge = [
            [0, 1],
            [0, -1],
            [1, 0],
            [-1, 0]
          ].some(([dx, dy]) => {
            const tile = world.tiles[y + dy!]?.[x + dx!];
            return !tile || tile.biome !== 'settlement';
          });
          if (onEdge) wanted.push(`${x},${y}`);
        }
      }

      const huts = new Set(planHuts(world).map(key));
      const fenced = new Set(
        planOverdraw(world, huts)
          .filter((p) => isFence(p.frame))
          .map(key)
      );

      expect(wanted.length, `${id}: no settlement perimeter to fence`).toBeGreaterThan(0);
      const missed = wanted.filter((at) => !fenced.has(at));
      expect(missed, `${id}: ${missed.length} of ${wanted.length} boundary tiles unfenced`).toEqual(
        []
      );
    }
  });

  it('does fence the tiles the huts stand on, which is the point of the change', () => {
    // The other half, and the one that would have caught the old behaviour: without it, a future
    // edit could restore "skip every hut tile" and only the coverage would suffer, silently.
    for (const { id, built } of worlds) {
      const huts = new Set(planHuts(built.world).map(key));
      const fenced = planOverdraw(built.world, huts).filter((p) => isFence(p.frame));
      const onHuts = fenced.filter((p) => huts.has(key(p)));
      expect(fenced.length, `${id}: no fence anywhere`).toBeGreaterThan(0);
      expect(onHuts.length, `${id}: the boundary stops wherever somebody built`).toBeGreaterThan(0);
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
    // Collect, then assert once. Two `expect` calls per placement is around forty thousand of
    // them across the three maps, and each one builds a matcher and formats a message whether or
    // not it fails -- the test took 27 seconds and timed out at five once the cliff and treeline
    // layers added their placements. Gathering the offenders and asserting on the list is the same
    // check and reports better: every bad placement at once, instead of the first.
    const bottom = Math.min(...Object.values(ROW_SLOT));
    const top = Math.max(...Object.values(ROW_SLOT));
    const strays: string[] = [];
    for (const { id, built } of worlds) {
      for (const item of planScene(built)) {
        if (item.maskFrame !== undefined) continue;
        if (item.depth >= depthFor(item.y, bottom) && item.depth <= depthFor(item.y, top)) continue;
        strays.push(`${id}: ${item.sheet} at ${key(item)} is outside its row's band`);
      }
    }
    expect(strays, strays.join('\n')).toEqual([]);
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

describe('the decor lies on the ground, never over the traveller', () => {
  it('draws every prop below the walker', () => {
    // The contract that lets this layer be dense. Overdraw and features both have to be careful --
    // one is drawn above him and one stands up -- and decor is neither, so it may go anywhere in
    // the cell at any count *provided* it stays underneath. A prop that climbed above the walker
    // would put a boulder across his chest.
    for (const { id, built } of worlds) {
      for (const item of planScene(built)) {
        if (item.sheet !== 'decor') continue;
        expect(item.depth, `${id}: decor at ${key(item)} rose above the walker`)
          .toBeLessThan(depthFor(item.y, ROW_SLOT.walker));
      }
    }
  });

  it('keeps every prop inside its own cell', () => {
    // The jitter is what breaks the grid beat, and it is also the thing that could put a stone on
    // the tile next door -- which on a shoreline means a pebble floating in open water.
    for (const { id, built } of worlds) {
      for (const item of planScene(built)) {
        if (item.sheet !== 'decor') continue;
        expect(item.offset, `${id}: decor at ${key(item)} has no offset`).toBeDefined();
        expect(Math.abs(item.offset!.x), `${id}: decor at ${key(item)} drifted off its tile`)
          .toBeLessThanOrEqual(0.45);
        expect(Math.abs(item.offset!.y)).toBeLessThanOrEqual(0.45);
      }
    }
  });

  it('never scatters onto a roof', () => {
    // The same coupling that once grew paddy through thatch, arriving by a third route.
    for (const { id, built } of worlds) {
      const plan = planScene(built);
      const roofs = new Set(plan.filter((p) => p.sheet === 'huts').map((p) => `${p.x},${p.y}`));
      for (const item of plan) {
        if (item.sheet !== 'decor') continue;
        expect(roofs.has(`${item.x},${item.y}`), `${id}: decor at ${key(item)} sits on a hut`)
          .toBe(false);
      }
    }
  });

  it('puts something on the ground without carpeting it', () => {
    // Both halves matter. Too little and the map is as empty as it was; too much and the scatter
    // becomes a texture, which is the thing the tile art is already doing.
    for (const { id, built } of worlds) {
      const decor = planScene(built).filter((p) => p.sheet === 'decor');
      const tiles = built.world.width * built.world.height;
      const perTile = decor.length / tiles;
      expect(perTile, `${id}: barely any decor`).toBeGreaterThan(0.3);
      expect(perTile, `${id}: decor has become a carpet`).toBeLessThan(2);
    }
  });
});
describe('a cliff is drawn where the ground drops away', () => {
  // Phase 07 made the ground tile seamlessly and it still did not look like hills, because a
  // top-down texture shows what the ground is *made of* and a slope is a property of the boundary
  // between two heights. These assert the boundary layer, which is where height now lives.

  it('draws a face on the high side only, never both', () => {
    // The failure this catches: emitting from both tiles, the way the torn blend correctly does,
    // would put a rock face at the top of a drop *and* at the bottom of the same drop.
    for (const { id, built } of worlds) {
      const cliffs = planScene(built).filter((p) => p.sheet === 'cliffs');
      for (const c of cliffs) {
        expect(
          band(built.world.tiles[c.y]![c.x]!.elevation),
          `${id}: a cliff at ${key(c)} stands on lowland`
        ).toBeGreaterThan(0);
      }
    }
  });

  it('only ever faces a genuinely lower neighbour', () => {
    for (const { id, built } of worlds) {
      const { tiles, width, height } = built.world;
      const cliffs = planScene(built).filter((p) => p.sheet === 'cliffs');
      for (const c of cliffs) {
        const here = band(tiles[c.y]![c.x]!.elevation);
        // At least one orthogonal neighbour must actually be lower, or the face is drawn against
        // flat ground and reads as a wall in the middle of a field.
        const lower = [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0]
        ].some(([dx, dy]) => {
          const nx = c.x + dx!;
          const ny = c.y + dy!;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) return false;
          return band(tiles[ny]![nx]!.elevation) < here;
        });
        expect(lower, `${id}: cliff at ${key(c)} faces nothing lower`).toBe(true);
      }
    }
  });

  it('never runs along the edge of the map', () => {
    // A map edge is not a cliff -- the world stops there. Drawing a face along it fences the
    // player in with a wall that has nothing on the other side of it.
    for (const { id, built } of worlds) {
      const { width, height } = built.world;
      for (const c of planScene(built).filter((p) => p.sheet === 'cliffs')) {
        const interior = c.x > 0 && c.y > 0 && c.x < width - 1 && c.y < height - 1;
        // A border tile may still carry a cliff facing inward; what must not happen is a cliff on
        // a border tile whose only lower neighbour would have been off the map.
        if (interior) continue;
        expect(c.x, `${id}: cliff at ${key(c)}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('sits below the traveller so he walks along the ledge, not behind it', () => {
    // The one genuinely new decision in this layer. The torn blend sits inside its cell and a flat
    // depth was enough; a rock face has to overhang the tile below it, so it is row-sorted like
    // things that stand up -- but under the walker, or it draws over him.
    for (const { id, built } of worlds) {
      for (const c of planScene(built).filter((p) => p.sheet === 'cliffs')) {
        expect(c.depth, `${id}: cliff at ${key(c)} is above the walker`).toBeLessThan(
          depthFor(c.y, ROW_SLOT.walker)
        );
        expect(c.depth, `${id}: cliff at ${key(c)} is not row-sorted`).toBeGreaterThanOrEqual(
          depthFor(c.y, ROW_SLOT.underfoot)
        );
      }
    }
  });
});

describe('a treeline stands where the forest stops', () => {
  it('draws only on forest tiles, only toward open ground', () => {
    for (const { id, built } of worlds) {
      const { tiles, width, height } = built.world;
      for (const t of planScene(built).filter((p) => p.sheet === 'treeline')) {
        expect(tiles[t.y]![t.x]!.biome, `${id}: treeline at ${key(t)} is not on forest`).toBe('forest');
        const open = [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0]
        ].some(([dx, dy]) => {
          const nx = t.x + dx!;
          const ny = t.y + dy!;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) return false;
          return tiles[ny]![nx]!.biome !== 'forest';
        });
        expect(open, `${id}: treeline at ${key(t)} faces only forest`).toBe(true);
      }
    }
  });

  it('leaves the forest interior alone', () => {
    // The whole reason this is affordable, and the reason the earlier tree layer was not. The
    // canopy texture already draws treetops; a rim adds a silhouette at the boundary and nothing
    // in the middle. If this ever starts covering interior tiles it has become the layer that was
    // rejected, at several times the sprite count.
    for (const { id, built } of worlds) {
      const { tiles, width, height } = built.world;
      let forest = 0;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) if (tiles[y]![x]!.biome === 'forest') forest += 1;
      }
      if (forest === 0) continue;
      const drawn = new Set(planScene(built).filter((p) => p.sheet === 'treeline').map(key));
      expect(drawn.size, `${id}: treeline covers most of the forest, not its edge`).toBeLessThan(forest);
    }
  });

  it('sits below the traveller, like the cliff it shares a layer with', () => {
    for (const { id, built } of worlds) {
      for (const t of planScene(built).filter((p) => p.sheet === 'treeline')) {
        expect(t.depth, `${id}: treeline at ${key(t)} draws over the walker`).toBeLessThan(
          depthFor(t.y, ROW_SLOT.walker)
        );
      }
    }
  });
});

describe('a cliff never fences in the water', () => {
  it('draws no rock face where either side is water', () => {
    // Rivers are carved after the elevation field is laid down, so a river keeps the height of the
    // ground it cut through and its neighbours do not. Height alone therefore asked for a rock face
    // along every bank -- and, between two river tiles at different heights, inside the water. On a
    // real map that was 83 of 234 faces, and it turned a valley into a stone-lined canal.
    const WATER = new Set(['sea', 'river']);
    for (const { id, built } of worlds) {
      const { tiles, width, height } = built.world;
      for (const c of planScene(built).filter((p) => p.sheet === 'cliffs')) {
        expect(WATER.has(tiles[c.y]![c.x]!.biome), `${id}: cliff standing in water at ${key(c)}`).toBe(false);
        // The edge this particular frame is for, not every neighbour the tile has. A first version
        // checked all four and failed on a hills tile that has a river to one side and correctly
        // draws its face on another -- the placement was right and the assertion was not.
        const edge = EDGE_ORDER[Math.floor(c.frame / EDGE_VARIANTS)]!;
        const { dx, dy } = EDGE_STEP[edge];
        const nx = c.x + dx;
        const ny = c.y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        expect(
          WATER.has(tiles[ny]![nx]!.biome),
          `${id}: cliff at ${key(c)} drops onto water to the ${edge}`
        ).toBe(false);
      }
    }
  });
});
