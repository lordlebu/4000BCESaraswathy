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
  DECOR_BY_BIOME,
  decorCount,
  decorFrame,
  EDGE_ORDER,
  EDGE_STEP,
  FENCE_FRAME,
  HUT_VARIANTS,
  ROW_SLOT,
  blends,
  cliffAt,
  cliffFrame,
  treelineAt,
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
import { band } from '../world/classify';
import { tileHash } from '../world/rng';
import type { FieldMapWorld } from '../world/fieldMap';

/** Which sheet a placement draws from. `marker` is the fallback glyph, which has no sheet. */
export type PlacementSheet =
  | 'terrain'
  | 'huts'
  | 'overdraw'
  | 'features'
  | 'places'
  | 'landmarks'
  | 'decor'
  | 'cliffs'
  | 'treeline'
  | 'marker';

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
   * Sub-tile offset, in fractions of a cell, present only on decor.
   *
   * The jitter is the entire point of that layer. A prop drawn at the centre of its cell puts every
   * stone on the same 128-pixel beat, which is the grid arriving by a third route after the tile
   * seams and the repeating texture were both dealt with.
   *
   * Fractions rather than pixels, because pixel positions are the scene's business -- the same
   * reason `x` and `y` are tile coordinates. Range is roughly -0.4 to 0.4, so a prop stays inside
   * the cell it belongs to and a tile's props do not drift onto a neighbour that may be water.
   */
  offset?: { x: number; y: number };
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
 * The rock face where a height terrace drops away.
 *
 * **Why this layer exists at all.** Phase 07 made the ground tile seamlessly and it still did not
 * look like hills, because a top-down ground texture cannot show a slope -- it shows what the
 * ground is *made of*, and a slope is a property of the boundary between two heights. Every
 * top-down game that reads as hilly does the same thing: keep the ground flat and quiet, and draw
 * a rock edge where high meets low. That edge is this.
 *
 * `band` comes from the elevation every tile has always carried, so nothing was added to the world
 * to make this possible -- see `classify.ts`.
 *
 * **Draw order is the one new problem here.** The torn blend sits inside its cell, so a flat depth
 * band was enough for it. A cliff cannot: a rock face has to hang over the tile *below* it or it
 * reads as a line painted on the ground rather than a wall standing on it. So a cliff is depth
 * sorted by row like the things that stand up, one slot under the traveller -- he walks along the
 * top of a ledge and in front of the face below him, which is what both of those should look like.
 */
export function planCliffs(world: FieldMapWorld['world']): Placement[] {
  const out: Placement[] = [];
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const tile = world.tiles[y]![x]!;
      const here = band(tile.elevation);
      if (here === 0) continue; // nothing to fall away from
      for (const edge of EDGE_ORDER) {
        const { dx, dy } = EDGE_STEP[edge];
        const nx = x + dx;
        const ny = y + dy;
        // A map edge is not a cliff. The world simply stops there, and drawing a face along it
        // would fence the player in with a wall that has nothing on the other side.
        if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
        const neighbour = world.tiles[ny]![nx]!;
        if (!cliffAt(here, band(neighbour.elevation), tile.biome, neighbour.biome)) continue;
        out.push({
          sheet: 'cliffs',
          frame: cliffFrame(edge, tileHash(world.seed, x, y, `cliff-${edge}`)),
          x,
          y,
          depth: depthFor(y, ROW_SLOT.undergrowth)
        });
      }
    }
  }
  return out;
}

/**
 * The wall of trees where a forest meets open ground.
 *
 * The same layer as `planCliffs` with a different predicate and a different sheet -- which is the
 * point rather than a coincidence. The reference that established this shape drew nine materials
 * into one rim slot, including a wooden palisade, so a rim is a slot and what fills it is
 * interchangeable. Cliffs fill it with rock where the height band drops; this fills it with crowns
 * where the forest stops.
 *
 * Same depth reasoning too: the south frames overhang the tile below, so this is row-sorted under
 * the walker rather than sitting in a flat band.
 */
export function planTreeline(world: FieldMapWorld['world']): Placement[] {
  const out: Placement[] = [];
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const here = world.tiles[y]![x]!.biome;
      if (here !== 'forest') continue;
      for (const edge of EDGE_ORDER) {
        const { dx, dy } = EDGE_STEP[edge];
        const nx = x + dx;
        const ny = y + dy;
        // The map edge is not a treeline, for the same reason it is not a cliff: the world stops
        // there rather than the forest.
        if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
        if (!treelineAt(here, world.tiles[ny]![nx]!.biome)) continue;
        out.push({
          sheet: 'treeline',
          frame: cliffFrame(edge, tileHash(world.seed, x, y, `treeline-${edge}`)),
          x,
          y,
          depth: depthFor(y, ROW_SLOT.undergrowth)
        });
      }
    }
  }
  return out;
}

/**
 * The scatter that lies on the ground: stones, pads, flowers, litter.
 *
 * One to three per tile on most ground, each placed at a jittered offset inside its cell. Drawn
 * *below* the traveller, which is what separates this from the other two scatter layers and what
 * lets it be dense: overdraw goes above him and must stay short, features stand up and must stay
 * rare and off-centre, and decor lies flat so it can go anywhere in the cell at any density.
 *
 * `builtOn` keeps props off hut tiles, for the reason paddy once grew through a roof: a stone drawn
 * under a building is either invisible or, worse, visible through a doorway it has no business in.
 */
export function planDecor(world: FieldMapWorld['world'], builtOn: ReadonlySet<string>): Placement[] {
  const out: Placement[] = [];
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      if (builtOn.has(`${x},${y}`)) continue;
      const biome = world.tiles[y]![x]!.biome;
      const props = DECOR_BY_BIOME[biome];
      if (!props || props.length === 0) continue;

      const count = decorCount(tileHash(world.seed, x, y, 'decor-count'));
      for (let i = 0; i < count; i += 1) {
        const prop = props[tileHash(world.seed, x, y, `decor-pick-${i}`) % props.length]!;
        const frame = decorFrame(prop, tileHash(world.seed, x, y, `decor-var-${i}`));
        if (frame === null) continue;
        out.push({
          sheet: 'decor',
          frame,
          x,
          y,
          // -0.4..0.4 of a cell, on both axes, from two independent hashes.
          offset: {
            x: (tileHash(world.seed, x, y, `decor-ox-${i}`) % 1000) / 1250 - 0.4,
            y: (tileHash(world.seed, x, y, `decor-oy-${i}`) % 1000) / 1250 - 0.4
          },
          // Underfoot, so the traveller walks over a stone rather than behind it. Row-sorted like
          // everything else that sits on the ground, so a prop on a southern row still draws after
          // one to the north.
          depth: depthFor(y, ROW_SLOT.underfoot)
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
  // Edges first: they are ground. Then cliffs, which are where that ground ends. Then decor, which
  // lies on it, then the huts and the overdraw that stand in it, and the markers above everything.
  return [
    ...planEdges(built.world),
    ...planCliffs(built.world),
    ...planTreeline(built.world),
    ...planDecor(built.world, builtOn),
    ...huts,
    ...planOverdraw(built.world, builtOn),
    ...planMarkers(built)
  ];
}
