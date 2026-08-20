// What goes where on the map, decided without an engine.
//
// `WorldScene` used to work out *what* to draw and *how* to draw it in the same loop. Only the
// second half needs Phaser, and the first half is where every bug lived.
//
// Three were reported from play in one session, and all three were decisions rather than drawing:
// grass drew over the traveller because everything above him shared one depth; paddy sprouted
// through hut roofs because the two layers did not know about each other; and a marker vanished
// under salt grass because it kept an old fixed depth when the rest moved into a row-sorted band.
// Each took a dev server, a scripted walk and a screenshot to find, and each is one assertion here.
//
// So the placement is a pure function from a world to a list of `Placement` records. `WorldScene`
// walks that list and calls `add.image`. The split is the point: what to draw is testable under
// Node in milliseconds, and how to draw it is a dozen lines that a browser test can cover once.
//
// Order matters and is preserved. Huts run before overdraw because overdraw asks what was already
// built, and a plan is returned in the order things should be created.

import {
  EDGE_ORDER,
  EDGE_STEP,
  FENCE_FRAME,
  HUT_VARIANTS,
  ROW_SLOT,
  blends,
  depthFor,
  edgeMaskFrame,
  tileFrame,
  featureFrame,
  featureIsUnderfoot,
  landmarkFrame,
  overdrawIsUnderfoot,
  overdrawFrame,
  placeFrame,
  swayFrame
} from './frames';
import { landmarkKindFor } from '../content/landmarks';
import { tileHash } from '../world/rng';
import type { FieldMapWorld } from '../world/fieldMap';

/** Which sheet a placement draws from. `marker` is the fallback glyph, which has no sheet. */
export type PlacementSheet = 'terrain' | 'huts' | 'overdraw' | 'features' | 'places' | 'landmarks' | 'marker';

export interface Placement {
  sheet: PlacementSheet;
  /** Frame index within the sheet. -1 for the glyph marker, which has no frame. */
  frame: number;
  /** Tile coordinates. Pixel positions are the scene's business, not the plan's. */
  x: number;
  y: number;
  depth: number;
  /** Set on anything the scene needs to find again -- markers, for the fog to reveal. */
  name?: string;
  /**
   * Present only on things that sway. Carrying both frames and the phase here means `update` does
   * no lookups: it reads the number it was given.
   */
  sway?: { rest: number; lean: number; phase: number };
  /**
   * Present only on the edge-blend layer, which is the one placement that needs two frames.
   *
   * `frame` is the *neighbour's terrain* frame -- the ground bleeding in -- and `maskFrame` indexes
   * `assets/edges.png` for the torn shape it bleeds through. The scene draws the terrain sprite and
   * applies the mask; the plan decides which two, and stays free of Phaser.
   */
  maskFrame?: number;
}

/**
 * Where the edge blend sits: above the flat terrain, below everything that stands on it.
 *
 * Terrain is depth 0 and the row-sorted band starts at GROUND_DEPTH_BASE (100), so anything in
 * between works. One flat number rather than a row slot -- see `planEdges`.
 */
const EDGE_DEPTH = 50;

/** How long one sway takes. Slow: this is a game about a quiet walk, not a windy one. */
export const SWAY_PERIOD = 2000;

/** Two settlement tiles in three get a hut, which leaves courtyards and paths between them. */
const HUT_DENSITY = 3;

/** Two eligible tiles in three grow something, so a field has ways through it. */
const OVERDRAW_DENSITY = 3;

/**
 * The layer that hides the grid.
 *
 * Every tile is an opaque square, so two biomes meeting produce a straight line and a staircase.
 * For each tile this emits one placement per neighbour that differs: the *neighbour's* terrain
 * frame, to be drawn over this tile through a torn alpha mask, so their ground bleeds a third of a
 * cell inward along an irregular boundary instead of stopping at it.
 *
 * Both halves of the pair get one, and that is deliberate rather than wasteful. Blending only one
 * direction moves the straight line rather than removing it -- the seam ends up wherever the
 * one-sided bleed stops. Two overlapping tears leave no line anywhere.
 *
 * `blends` decides which boundaries qualify; a shoreline deliberately does not.
 *
 * Depth sits just above the terrain and below everything that stands on it. It is a flat band
 * rather than row-sorted because this *is* ground: sorting it by row would let a bleed from the
 * row below draw over a hut standing in the row above.
 */
export function planEdges(world: FieldMapWorld['world']): Placement[] {
  const out: Placement[] = [];
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const here = world.tiles[y]![x]!.biome;
      for (const edge of EDGE_ORDER) {
        const { dx, dy } = EDGE_STEP[edge];
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
        const there = world.tiles[ny]![nx]!.biome;
        if (!blends(here, there)) continue;
        out.push({
          sheet: 'terrain',
          frame: tileFrame(there),
          maskFrame: edgeMaskFrame(edge, tileHash(world.seed, x, y, `edge-${edge}`)),
          x,
          y,
          depth: EDGE_DEPTH
        });
      }
    }
  }
  return out;
}

/**
 * Every hut in a settlement.
 *
 * Buildings are objects over bare ground rather than art baked into the tile. Drawn into a
 * repeating texture they appear once per tile forever, in a perfect grid -- an endless orchard of
 * identical huts rather than a village.
 */
export function planHuts(world: FieldMapWorld['world']): Placement[] {
  const out: Placement[] = [];
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      if (world.tiles[y]![x]!.biome !== 'settlement') continue;
      if (tileHash(world.seed, x, y, 'hut-present') % HUT_DENSITY === 0) continue;
      out.push({
        sheet: 'huts',
        frame: tileHash(world.seed, x, y, 'hut-variant') % HUT_VARIANTS,
        x,
        y,
        // Huts sort by row like everything else that stands on the ground, in the undergrowth slot
        // so a traveller walking south of one passes in front of it.
        depth: depthFor(y, ROW_SLOT.undergrowth)
      });
    }
  }
  return out;
}

/**
 * The layer above the player: grass, reeds, fences, and the occasional tree.
 *
 * `builtOn` is the set of tiles the hut layer claimed. Passing it in rather than recomputing it is
 * what stops paddy growing through a roof -- the bug that shipped once because the two layers were
 * written a week apart and never told about each other.
 */
export function planOverdraw(world: FieldMapWorld['world'], builtOn: ReadonlySet<string>): Placement[] {
  const out: Placement[] = [];
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const biome = world.tiles[y]![x]!.biome;
      // Most of this layer stands in the ground and belongs above the traveller. A few entries are
      // the ground -- moss on stone, pads on water, stones you step across -- and drawing those
      // over his boots reads as him sinking into the tile.
      const canopy = depthFor(y, ROW_SLOT.canopy);
      const underfoot = depthFor(y, ROW_SLOT.underfoot);

      // Nothing is drawn over a roof -- checked before the fence, not after. A settlement's
      // southern edge is exactly where huts are, so putting the fence branch first meant five of
      // them on the Dry Harbour map had a fence rail across the thatch.
      if (builtOn.has(`${x},${y}`)) continue;

      // A settlement tile with open ground to the south gets a fence along that edge. Only the
      // southern edge: a traveller approaching from open country walks up behind it, which is the
      // whole reason the fence reads as a boundary rather than as decoration.
      const southern = y + 1 < world.height ? world.tiles[y + 1]![x]!.biome : null;
      if (biome === 'settlement' && southern !== null && southern !== 'settlement') {
        out.push({ sheet: 'overdraw', frame: FENCE_FRAME, x, y, depth: canopy });
        continue;
      }

      // A feature takes the tile instead of undergrowth, and is rare enough that meeting one is an
      // event. It may stand far taller than common overdraw because it is drawn offset to one
      // side, so the traveller passes beside it rather than behind it.
      const feature = featureFrame(
        biome,
        tileHash(world.seed, x, y, 'feature-present'),
        tileHash(world.seed, x, y, 'feature-pick')
      );
      if (feature !== null) {
        out.push({
          sheet: 'features',
          frame: feature,
          x,
          y,
          depth: featureIsUnderfoot(feature) ? underfoot : canopy
        });
        continue;
      }

      if (tileHash(world.seed, x, y, 'overdraw-present') % OVERDRAW_DENSITY === 0) continue;
      const rest = overdrawFrame(biome, tileHash(world.seed, x, y, 'overdraw-scatter'));
      if (rest === null) continue;
      out.push({
        sheet: 'overdraw',
        frame: rest,
        x,
        y,
        depth: overdrawIsUnderfoot(rest) ? underfoot : canopy,
        // Phase offset per tile, so a field ripples across rather than blinking in unison.
        sway: {
          rest,
          lean: swayFrame(rest),
          phase: tileHash(world.seed, x, y, 'overdraw-phase') % SWAY_PERIOD
        }
      });
    }
  }
  return out;
}

/**
 * The destination, and the authored places.
 *
 * Both sit in the `marker` slot, above the canopy of their own row. That is the one depth in the
 * stack that is not about physical height: grass in front of a shrine really would obscure it, but
 * a marker the player is walking towards must not be hidden by a tuft of salt grass.
 */
export function planMarkers(built: FieldMapWorld): Placement[] {
  const out: Placement[] = [];
  const { landmark } = built.world;

  const kind = landmarkFrame(landmarkKindFor(landmark, built.world.seed).id);
  if (kind !== null) {
    out.push({
      sheet: 'landmarks',
      frame: kind,
      x: landmark.x,
      y: landmark.y,
      depth: depthFor(landmark.y, ROW_SLOT.marker),
      name: 'landmark'
    });
  }

  // Canon's archaeological sites have their own art; everything else keeps the diamond. A generic
  // marker reads better than the wrong building, which is why `placeFrame` returns null rather
  // than falling back to a frame.
  for (const { poi, at } of built.placed) {
    const frame = placeFrame(poi.id, poi.kind);
    out.push({
      sheet: frame === null ? 'marker' : 'places',
      frame: frame ?? -1,
      x: at.x,
      y: at.y,
      depth: depthFor(at.y, ROW_SLOT.marker),
      name: `poi:${poi.id}`
    });
  }
  return out;
}

/**
 * Everything that stands on the ground, in the order it should be created.
 *
 * The set of built-on tiles is threaded from huts to overdraw here rather than held as scene
 * state, so the whole plan is a function of the world and nothing else. Two calls with the same
 * world return the same plan, which is what makes it worth asserting against.
 */
export function planScene(built: FieldMapWorld): Placement[] {
  const huts = planHuts(built.world);
  const builtOn = new Set(huts.map((h) => `${h.x},${h.y}`));
  // Edges first: they are ground, and everything after them stands on it.
  return [...planEdges(built.world), ...huts, ...planOverdraw(built.world, builtOn), ...planMarkers(built)];
}
