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
  trackFrame,
  EDGE_ORDER,
  EDGE_STEP,
  FENCE_SIDE,
  fenceFrame,
  hutFrame,
  ROW_SLOT,
  blends,
  shoreAt,
  bankSource,
  SHORE_PROPS,
  cliffAt,
  cliffFrame,
  cliffTurn,
  CLOUD_PATTERNS,
  cornerFrame,
  treelineAt,
  depthFor,
  edgeMaskFrame,
  tileFrame,
  featureFrame,
  featureIsUnderfoot,
  featureCastsContact,
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
import type { BiomeId } from '../world/types';
import type { CliffTurn, Edge } from './frames';

/** Which sheet a placement draws from. `marker` is the fallback glyph, which has no sheet. */
export type PlacementSheet =
  | 'terrain'
  | 'huts'
  | 'overdraw'
  | 'features'
  | 'flora'
  | 'places'
  | 'landmarks'
  | 'decor'
  | 'contact'
  | 'underside'
  | 'bank'
  | 'shore'
  | 'track'
  | 'cliffs'
  | 'treeline'
  | 'marker'
  | 'cloud'
  | 'shadow';

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
   * How solid to draw this, 0 to 1. Present only on the shadow, which is the one placement whose
   * whole content is how dark it is.
   */
  alpha?: number;
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
   * Which side of its own cell a band is pinned to. Present only on the shore band, which is the
   * one placement that is not a whole cell -- everything else is centred in one and needs no
   * answer to this.
   */
  edge?: Edge;
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

/**
 * How far below a cell's centre a feature's contact shadow sits, in fractions of a cell.
 *
 * Measured against the art rather than chosen: the feature sheet draws each object standing on the
 * lower third of its cell, so a shadow at the centre floats above the trunk and one at the cell
 * edge slides onto the tile below.
 */
const FEATURE_SHADOW_DROP = 0.28;

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
 * Where the shore band sits: above the ground and the blends on it, below anything standing.
 *
 * Six rather than the blend's fifty because it draws *over* a blend -- `sea` and `river` bleed
 * into each other, and a bank's shadow lies on whatever water is there. Flat rather than
 * row-sorted for the reason `planEdges` gives: this is ground, and sorting it by row would let a
 * shadow cast in one row draw over something standing in the next.
 */
const SHORE_DEPTH = 60;

/**
 * The shadow a bank casts on the water beside it.
 *
 * **The last hard edge on the map.** Every other boundary was given relief in phase 07 -- a torn
 * blend where two grounds meet, a rock face where a terrace drops, a wall of crowns where the
 * forest stops -- and water was left out of all three, so a coast is a staircase between two flat
 * colours with nothing on either side of it.
 *
 * What it is not is the dissolve `blends` refuses. That one makes the land's outline uncertain,
 * and a coastline is the one boundary here that is genuinely definite. This keeps the outline
 * exactly and moves it out of the plane: the water beside the land is drawn as a surface lying
 * below it, with a wet line at the contact and the bank's shade falling inward. Nothing crosses
 * the line, in either direction.
 *
 * The argument is already accepted elsewhere in this file. `planIslandShadow` darkens the sea
 * under a floating shelf because that is the only thing separating a floating shelf from a sea
 * stack -- light gets underneath one of them. A bank is the same claim at a metre.
 *
 * One placement per water-side edge, drawn inside the water cell: 643 at worst on Lothal, 163 of
 * them on screen at once in the densest window measured.
 */
export function planShore(world: FieldMapWorld['world']): Placement[] {
  const out: Placement[] = [];
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const here = world.tiles[y]![x]!.biome;
      for (const edge of EDGE_ORDER) {
        const { dx, dy } = EDGE_STEP[edge];
        const nx = x + dx;
        const ny = y + dy;
        // The map edge is not a shore, for the reason it is not a cliff: the world stops there
        // rather than the water.
        if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
        if (!shoreAt(here, world.tiles[ny]![nx]!.biome)) continue;
        out.push({
          sheet: 'shore',
          frame: edgeMaskFrame(edge, tileHash(world.seed, x, y, `shore-${edge}`)),
          edge,
          x,
          y,
          depth: SHORE_DEPTH
        });
      }
    }
  }
  return out;
}

/**
 * The beach a stretch of land puts down where it meets water.
 *
 * An ordinary edge blend, and deliberately so -- the same baked pair `planEdges` emits, the same
 * torn masks, the same depth. What is new is only the *source*: a third biome rather than either
 * neighbour, so `coast` bleeds into a plains cell and the water stays exactly where it was.
 *
 * It is the half of this that does the seamless work. The shadow alone gives the water a level;
 * without a lip the ground still runs to the waterline as grass, and a straight edge between two
 * flat greens is still a straight edge. `bankSource` decides which ground grows one, and three
 * answers are null on purpose -- see the table there.
 */
export function planBank(world: FieldMapWorld['world']): Placement[] {
  const out: Placement[] = [];
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const here = world.tiles[y]![x]!.biome;
      for (const edge of EDGE_ORDER) {
        const { dx, dy } = EDGE_STEP[edge];
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
        const material = bankSource(here, world.tiles[ny]![nx]!.biome);
        if (material === null) continue;
        out.push({
          // Its own name, though it draws from the terrain sheet and bakes through the same pair
          // as a blend. A blend says *these two grounds meet gradually*; a bank says *this ground
          // ends in sand*, and only one of those is allowed at a shoreline. A test that cannot
          // tell them apart has to either miss the second or forbid the first.
          //
          // And it is a band rather than a cell, which the name also buys: a blend can start
          // anywhere in its tile, a bank cannot start away from its own waterline. Measured, that
          // crop is the difference between this layer costing 12% of the frame and 8.
          sheet: 'bank',
          frame: tileFrame(material),
          maskFrame: edgeMaskFrame(edge, tileHash(world.seed, x, y, `bank-${edge}`)),
          edge,
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
 * Reeds and shells at the waterline -- the pass parked as the live half of endgame item 4.
 *
 * One prop on a land tile that touches water, chosen by the water it touches rather than by the
 * ground it stands on, and pushed toward the edge it faces instead of jittered across the cell.
 * That last part is the difference between a shore and a shore-shaped scattering: reeds stand in
 * the shallows, not four tenths of a tile up the bank.
 *
 * Separate from `planDecor` rather than folded into it, because the choice is about the neighbour
 * and every other prop on the map is about the tile.
 */
export function planShoreProps(
  world: FieldMapWorld['world'],
  builtOn: ReadonlySet<string>
): Placement[] {
  const out: Placement[] = [];
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      if (builtOn.has(`${x},${y}`)) continue;
      const here = world.tiles[y]![x]!.biome;
      // Only ground that grows a bank grows anything on it. The sky biomes and the water itself
      // are excluded by the same table, which is the point of having one.
      let facing: Edge | null = null;
      let water: 'sea' | 'river' | null = null;
      for (const edge of EDGE_ORDER) {
        const { dx, dy } = EDGE_STEP[edge];
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
        const there = world.tiles[ny]![nx]!.biome;
        if (there !== 'sea' && there !== 'river') continue;
        if (bankSource(here, there) === null && here !== 'wetland' && here !== 'coast') continue;
        facing = edge;
        water = there;
        break;
      }
      if (facing === null || water === null) continue;

      // Two shores in three, so a bank has gaps in it rather than a hedge of reeds.
      if (tileHash(world.seed, x, y, 'shore-prop') % 3 === 0) continue;

      const props = SHORE_PROPS[water];
      const prop = props[tileHash(world.seed, x, y, 'shore-pick') % props.length]!;
      const frame = decorFrame(prop, tileHash(world.seed, x, y, 'shore-var'));
      if (frame === null) continue;

      const { dx, dy } = EDGE_STEP[facing];
      const drift = (tileHash(world.seed, x, y, 'shore-drift') % 1000) / 5000 - 0.1;
      out.push({
        sheet: 'decor',
        frame,
        x,
        y,
        // Three tenths of a cell toward the water, and a tenth of drift along the edge.
        offset: { x: dx * 0.3 + (dx === 0 ? drift : 0), y: dy * 0.3 + (dy === 0 ? drift : 0) },
        depth: depthFor(y, ROW_SLOT.underfoot)
      });
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
/**
 * The elevation bands the cliff layer draws from: the world's own, run through one majority filter.
 *
 * **A drawing decision, not a terrain change.** `band()` quantises elevation to 0, 1 or 2, and the
 * boundary between two bands follows a noise contour, so at tile resolution it zigzags. Every zigzag
 * becomes an axis-aligned wall segment, and the result reads as a hedge maze rather than a landform:
 * a *low* tile ringed by higher neighbours gets four faces pointed at it by those neighbours, which
 * draws a pen around one square of grass. Across the four maps there were 20 tiles enclosed on three
 * sides or more; one majority pass leaves 2, and takes 11-24% of all faces with it.
 *
 * Nothing outside this file sees it. Biomes, walkability, travel cost and every saved journey are
 * decided from `world/classify.ts` at generation time and are untouched, so this needs no
 * `SAVE_VERSION` bump -- the same seed still generates the same world, and only the rock drawn on
 * its slopes moves.
 *
 * One pass rather than two on purpose. A second takes a further 3-6% of faces and starts rounding
 * off real headlands, which is paying landform for tidiness.
 */
const CLIFF_BANDS = new WeakMap<object, number[][]>();

function cliffBands(world: FieldMapWorld['world']): number[][] {
  const cached = CLIFF_BANDS.get(world);
  if (cached) return cached;
  const raw = world.tiles.map((row) => row.map((t) => band(t.elevation) as number));
  const out = raw.map((row) => [...row]);
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const votes = [0, 0, 0];
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const v = raw[y + dy]?.[x + dx];
          if (v !== undefined) votes[v]! += 1;
        }
      }
      out[y]![x] = votes.indexOf(Math.max(...votes));
    }
  }
  CLIFF_BANDS.set(world, out);
  return out;
}

function facesAt(world: FieldMapWorld['world'], x: number, y: number, edge: Edge): boolean {
  const tile = world.tiles[y]?.[x];
  if (!tile) return false;
  const here = band(tile.elevation);
  if (here === 0) return false; // nothing to fall away from
  const { dx, dy } = EDGE_STEP[edge];
  // A map edge is not a cliff. The world simply stops there, and drawing a face along it would
  // fence the player in with a wall that has nothing on the other side.
  const neighbour = world.tiles[y + dy]?.[x + dx];
  if (!neighbour) return false;
  if (!cliffAt(here, band(neighbour.elevation), tile.biome, neighbour.biome)) return false;

  // **The smooth contour only ever takes faces away, never adds them.** Asking the smoothed grid
  // instead of the real one is the obvious move and it invents rock: a majority filter will raise a
  // genuinely low tile to match its neighbours, and then a face gets drawn standing on lowland,
  // facing a neighbour that is not actually below it. Two tests said so immediately. Intersecting
  // the two keeps every face standing on ground that is really high and really drops away, and
  // still drops the ones that exist only because the contour wobbled by one tile.
  const smooth = cliffBands(world);
  return smooth[y]![x]! > smooth[y + dy]![x + dx]!;
}

/**
 * Loose stone at the foot of a rock face, on the tile below it.
 *
 * **The one thing that makes a wall stand on the ground rather than be pasted over it.** A south
 * face currently meets flat grass across a single pixel row -- the sharpest edge in the scene, and
 * the one the eye reads as "tile" first. Real rock sheds a talus, so the stone here is both what
 * softens the seam and what would actually be lying there, the same argument `planCliffJoints` won
 * on for run ends.
 *
 * It is the cheap half of "the rim should nudge into the surrounding tile": debris crossing the
 * boundary, with no new art and nothing drawn outside a cell. See `docs/continuous-edges-plan.md`.
 */
const TALUS_PROPS: readonly string[] = ['scree', 'pebbles', 'boulder-small'];

/** How far down the tile below a face the talus reaches, and how far across it spreads. */
const TALUS_DROP = -0.34;
const TALUS_SPREAD = 0.3;

export function planCliffTalus(
  world: FieldMapWorld['world'],
  builtOn: ReadonlySet<string>
): Placement[] {
  const out: Placement[] = [];
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      if (!facesAt(world, x, y, 's')) continue;
      const below = world.tiles[y + 1]?.[x];
      // Nothing is shed into water, for the reason `cliffAt` refuses a face there at all.
      if (!below || below.biome === 'sea' || below.biome === 'river') continue;
      // And nothing onto a roof, for the reason paddy once grew through one.
      if (builtOn.has(`${x},${y + 1}`)) continue;

      // Two or three stones, so a long run does not repeat as a stripe.
      const roll = tileHash(world.seed, x, y, 'talus');
      const count = 2 + (roll % 2);
      for (let i = 0; i < count; i += 1) {
        const pick = tileHash(world.seed, x, y, `talus-prop-${i}`);
        const prop = TALUS_PROPS[pick % TALUS_PROPS.length]!;
        const frame = decorFrame(prop, tileHash(world.seed, x, y, `talus-frame-${i}`));
        if (frame === null) continue;
        const jitter = (tileHash(world.seed, x, y, `talus-x-${i}`) % 100) / 100 - 0.5;
        out.push({
          sheet: 'decor',
          frame,
          x,
          y: y + 1,
          offset: { x: jitter * 2 * TALUS_SPREAD, y: TALUS_DROP + (i / count) * 0.18 },
          // On the tile it has fallen onto, in that tile's own undergrowth slot, so a player
          // standing there walks in front of it rather than behind.
          depth: depthFor(y + 1, ROW_SLOT.undergrowth)
        });
      }
    }
  }
  return out;
}

/**
 * What this tile's rock face does at its corners, and which of its bands that replaces.
 *
 * One function asked by both passes, so a corner cannot be drawn by one and tidied by the other.
 */
function turnAt(world: FieldMapWorld['world'], x: number, y: number): CliffTurn {
  const faces = {
    n: facesAt(world, x, y, 'n'),
    e: facesAt(world, x, y, 'e'),
    s: facesAt(world, x, y, 's'),
    w: facesAt(world, x, y, 'w')
  };
  return cliffTurn(
    faces,
    {
      east: facesAt(world, x + 1, y, 's'),
      west: facesAt(world, x - 1, y, 's')
    },
    tileHash(world.seed, x, y, 'cliff-turn')
  );
}

/**
 * How far a rim face reaches past the cell that owns it, as a fraction of a tile.
 *
 * **The rim's outline was the tile grid, and that is what made it read as tiles.** A band is drawn
 * inside its own cell and stops dead on the boundary, so every wall in the scene was an
 * axis-aligned segment exactly 128 pixels long, sixteen of them to a screen. Letting the face hang
 * over the tile it drops onto puts the silhouette off the grid, which is the whole of *"they need
 * to nicely nudge into surrounding tiles"*.
 *
 * **North is zero, and that is not an oversight.** The other three are faces -- you are looking at
 * a wall, and a wall overhangs what is below it. North is a *lip*: the top of the break, seen from
 * above. Hanging it over the tile above would lay rock across ground that is higher than the rock.
 *
 * The side faces get half of what the south face gets, because they are 28px wide against its 62
 * and the same absolute reach would push most of the strip out of its own cell.
 *
 * Depth already works out and was checked rather than assumed: a face on row *y* draws at
 * `depthFor(y, undergrowth)` = 10y+1, and a player standing on row *y*+1 draws at 10y+15, so the
 * player walks in front of an overhanging face rather than behind it.
 */
const OVERHANG: Record<Edge, { x: number; y: number }> = {
  n: { x: 0, y: 0 },
  e: { x: 0.06, y: 0 },
  s: { x: 0, y: 0.12 },
  w: { x: -0.06, y: 0 }
};

/**
 * One rim pass, which both the rock and the trees are.
 *
 * A **rim** is the edge of something drawn on the boundary tile: the rock face where a terrace drops
 * away, the wall of trees where a forest stops. They were two functions with the same body and
 * different predicates, and keeping them apart cost exactly what you would expect — the overhang was
 * written for the cliff and had to be *remembered* for the treeline, and the torn inner edge in
 * `build-rims.js` only reached both because the sheets happen to share a builder.
 *
 * The reference that established this shape proved it is a slot rather than a coincidence: it drew
 * the identical structure in nine materials, one of them a wooden palisade. So a third rim — a
 * settlement palisade is the obvious one — is a predicate and a sheet name, not a new pass.
 *
 * What stays outside: the corner and cap pieces, and the talus. Those are things the *rock* does,
 * and a forest edge has no elbow to turn or scree to shed.
 */
interface Rim {
  /** Which sheet the bands are drawn from. */
  sheet: PlacementSheet;
  /** Used for the per-tile variant hash, so two rims on one tile do not pick the same variant. */
  key: string;
  /** Whether this tile shows a face on this edge. */
  faces(x: number, y: number, edge: Edge): boolean;
}

function planRim(world: FieldMapWorld['world'], rim: Rim): Placement[] {
  const out: Placement[] = [];
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      for (const edge of EDGE_ORDER) {
        if (!rim.faces(x, y, edge)) continue;
        out.push({
          sheet: rim.sheet,
          frame: cliffFrame(edge, tileHash(world.seed, x, y, `${rim.key}-${edge}`)),
          x,
          y,
          offset: OVERHANG[edge],
          depth: depthFor(y, ROW_SLOT.undergrowth)
        });
      }
    }
  }
  return out;
}

export function planCliffs(world: FieldMapWorld['world']): Placement[] {
  // The bands, from the shared pass. A tile that turns suppresses the edges its corner stands in
  // for, so the predicate asks the turn as well as the drop.
  const out: Placement[] = planRim(world, {
    sheet: 'cliffs',
    key: 'cliff',
    faces: (x, y, edge) =>
      facesAt(world, x, y, edge) && !turnAt(world, x, y).suppress.includes(edge)
  });
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const turn = turnAt(world, x, y);
      // After the bands, so a corner overdraws anything a neighbour's band bleeds across the seam.
      for (const piece of turn.pieces) {
        out.push({
          sheet: 'cliffs',
          frame: cornerFrame(piece),
          x,
          y,
          // A corner carries a south band inside it, so it hangs the same way that band does, or
          // the wall would step at the very seam the corner exists to smooth.
          offset: OVERHANG.s,
          depth: depthFor(y, ROW_SLOT.undergrowth)
        });
      }
    }
  }
  return out;
}

/**
 * How far up an underside tile looks for the shelf that is shading it.
 *
 * Four, matching `SHADOW_REACH` -- the two are the same light and disagreeing about its reach
 * would be visible exactly where they meet, at the island's rim.
 */
const UNDERSIDE_REACH = 4;

/** The least shade any underside carries, however far it hangs from the shelf above it. */
const UNDERSIDE_FLOOR = 0.45;

/**
 * The shade under a floating shelf, on the shelf's own underside.
 *
 * `planIslandShadow` darkens the *sea* below an island, which is what says the island floats. This
 * is the other half of the same light: the underside rock itself is in shade, hard against the lip
 * it hangs from and fading downward, because nothing lights the bottom of a thing that is over you.
 *
 * Flat depth, just above the terrain and below anything hanging off it -- the roots and the nests
 * are on that rock, so they are in the shade rather than behind it.
 */
export function planUndersideShade(world: FieldMapWorld['world']): Placement[] {
  const out: Placement[] = [];
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      if (world.tiles[y]![x]!.biome !== 'sky_underside') continue;

      // **How much island is over this tile**, which is what decides how dark it is. Directly
      // under the shelf is the deepest shade; further down the hanging rock the light gets in
      // round the rim. Measured by looking up, which is the same lookup `planIslandShadow` does
      // from the sea -- one light, asked the same question from both sides of the rock.
      let above = 0;
      for (let up = 1; up <= UNDERSIDE_REACH; up += 1) {
        if (world.tiles[y - up]?.[x]?.biome !== 'sky_island') continue;
        above = up;
        break;
      }

      out.push({
        sheet: 'underside',
        frame: 0,
        x,
        y,
        depth: EDGE_DEPTH,
        // Full weight immediately under the shelf, easing off with distance from it. A tile with
        // no island above it at all still takes the floor: it is the underside of *something*,
        // and the far side of a shelf is never lit like the top.
        alpha: above === 0
          ? UNDERSIDE_FLOOR
          : UNDERSIDE_FLOOR + (1 - UNDERSIDE_FLOOR) * (1 - (above - 1) / UNDERSIDE_REACH)
      });
    }
  }
  return out;
}

/**
 * The stones where a rock face turns a corner or simply stops.
 *
 * **The rim layer draws one band per boundary tile and asks nothing about its neighbours**, which
 * is what makes a run of cliff end in mid-air. Two perpendicular faces on one tile meet at a right
 * angle with a notch in the elbow, and the last tile of a run finishes on a straight vertical cut
 * that no rock ever made. Measured on the real maps, roughly a third of cliff tiles are corners:
 * 84 of Narmada's 310, 42 of Lothal's 125.
 *
 * **The industry answer to this is autotiling** -- pick the frame from a bitmask of which
 * neighbours share the state, with inner and outer corner pieces drawn for the purpose. That is
 * what Godot's terrain sets, RPG Maker's autotiles and Tiled's Wang sets all are, and it is where
 * this should end up: `cliffFrame(edge, variant)` currently cannot express a corner because the
 * sheet has no corner to express.
 *
 * This is the half that needs no new art, and it is a real technique rather than a stopgap: **rubble
 * at the joint**. Scree gathers exactly where a face turns or ends, so a stone there is both what
 * hides the seam and what would actually be lying there. When corner frames are drawn, the
 * selection below already asks the right question and only the sheet changes.
 */
export function planCliffJoints(world: FieldMapWorld['world']): Placement[] {
  const out: Placement[] = [];

  /** Whether the tile at x,y drops away on this edge -- the same question `planCliffs` asks. */
  const faces = (x: number, y: number, edge: Edge): boolean => facesAt(world, x, y, edge);

  // The four cell corners, each named by the two edges that meet there.
  const CORNERS: readonly { a: Edge; b: Edge; x: number; y: number }[] = [
    { a: 'n', b: 'w', x: -0.36, y: -0.30 },
    { a: 'n', b: 'e', x: 0.36, y: -0.30 },
    { a: 's', b: 'w', x: -0.36, y: 0.34 },
    { a: 's', b: 'e', x: 0.36, y: 0.34 }
  ];

  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      // Which of this tile's bands a corner piece has taken over. The joint layer exists to stand
      // in for corner art that did not exist; where the art now covers an edge it carries its own
      // turn and its own crumbling end, so a boulder there would be rubble on top of painted-in
      // rubble -- and the joint, not the art, would be what looked wrong.
      //
      // Checked per *reason* rather than per tile. A tile can perfectly well have a replaced south
      // band and still need rubble where its north face stops, and a blanket "this tile has a
      // corner" test would drop that.
      const turned = turnAt(world, x, y).suppress;
      for (const corner of CORNERS) {
        const alongX = corner.b === 'e' ? 1 : -1;
        const alongY = corner.a === 's' ? 1 : -1;
        const hasA = faces(x, y, corner.a);
        const hasB = faces(x, y, corner.b);

        // An elbow: two faces meet here and leave a notch between them.
        const elbow = hasA && hasB;
        // A run that stops: this face reaches the corner and the next tile along does not carry
        // it on. Asked of the neighbour rather than of this tile, which is the whole difference
        // between a rim that knows it is a run and one that does not.
        const endOfRow = hasA && !hasB && !faces(x + alongX, y, corner.a);
        const endOfColumn = hasB && !hasA && !faces(x, y + alongY, corner.b);
        if (!elbow && !endOfRow && !endOfColumn) continue;
        // An elbow is covered when either of its bands is; a run's end is covered when the band
        // that run is made of is.
        if (elbow && (turned.includes(corner.a) || turned.includes(corner.b))) continue;
        if (endOfRow && turned.includes(corner.a)) continue;
        if (endOfColumn && turned.includes(corner.b)) continue;

        // Rubble, from the stones the decor sheet already carries. An elbow gathers more than a
        // run's end does, so it gets the bigger stone.
        const prop = elbow ? 'boulder-small' : 'scree';
        const frame = decorFrame(prop, tileHash(world.seed, x, y, `joint-${corner.a}${corner.b}`));
        if (frame === null) continue;

        out.push({
          sheet: 'decor',
          frame,
          x,
          y,
          offset: { x: corner.x, y: corner.y },
          // With the face rather than under it: the rubble is part of the rock, and drawing it in
          // the flat ground band would put it behind the very band it is covering the end of.
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
  return planRim(world, {
    sheet: 'treeline',
    key: 'treeline',
    faces: (x, y, edge) => {
      const here = world.tiles[y]?.[x]?.biome;
      if (here !== 'forest') return false;
      const { dx, dy } = EDGE_STEP[edge];
      // The map edge is not a treeline, for the same reason it is not a cliff: the world stops
      // there rather than the forest.
      const neighbour = world.tiles[y + dy]?.[x + dx];
      if (!neighbour) return false;
      return treelineAt(here, neighbour.biome);
    }
  });
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
      // **A nomad camp is felt and nothing else.** Its tiles are `settlement` like any other --
      // that is what earns them huts, fences and a name in the journal -- so the only thing
      // separating the two is which frames they may draw. People who are not from here do not
      // build in mud brick.
      const inCamp =
        world.camp !== null &&
        Math.abs(x - world.camp.at.x) <= world.camp.radius &&
        Math.abs(y - world.camp.at.y) <= world.camp.radius;
      out.push({
        sheet: 'huts',
        frame: hutFrame(tileHash(world.seed, x, y, 'hut-variant'), inCamp),
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
 * Which sides of this tile face out of the enclosure, or null if it is not on a boundary.
 *
 * The enclosure is a settlement: a place people built, as opposed to a climate they live in. A
 * tile is on the boundary when at least one of its four neighbours is something else -- including
 * the edge of the map, which is the honest reading of a settlement that runs off the map rather
 * than a village with an open side.
 *
 * Returns a bitmask for `fenceFrame`, so a corner tile gets one piece with two runs that join
 * rather than two sprites that cross.
 */
function fencedSides(world: FieldMapWorld['world'], x: number, y: number): number | null {
  if (world.tiles[y]![x]!.biome !== 'settlement') return null;

  let sides = 0;
  const outside = (dx: number, dy: number): boolean => {
    const tile = world.tiles[y + dy]?.[x + dx];
    return !tile || tile.biome !== 'settlement';
  };
  if (outside(0, -1)) sides |= FENCE_SIDE.north;
  if (outside(1, 0)) sides |= FENCE_SIDE.east;
  if (outside(0, 1)) sides |= FENCE_SIDE.south;
  if (outside(-1, 0)) sides |= FENCE_SIDE.west;
  return sides === 0 ? null : sides;
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

      // **The fence goes round, and it is drawn before the roof check rather than after.**
      //
      // It used to be southern-edge only, because the single fence frame *was* a bottom rail and
      // could not honestly be anything else. Now there is a piece per side mask, so a settlement
      // gets a boundary rather than a rail along its bottom.
      //
      // And it is no longer skipped on a hut tile. Two settlement tiles in three hold a hut, so
      // skipping them disqualified most of the perimeter before the fence rule was reached --
      // seventeen boundary tiles produced two fences on Lothal. A fence and a hut on one tile is
      // fine: the fence runs inside the tile edge and the hut stands in the middle of it.
      const outward = fencedSides(world, x, y);
      if (outward !== null) {
        out.push({ sheet: 'overdraw', frame: fenceFrame(outward), x, y, depth: canopy });
        // A fenced tile still gets its hut, but nothing else grows on it: paddy through a rail
        // reads as the fence being behind the field rather than round it.
        continue;
      }

      // Nothing else is drawn over a roof -- checked after the fence, not before. A settlement's
      // southern edge is exactly where huts are, so this order is what stops paddy growing
      // through thatch while still letting the boundary reach the tiles the huts stand on.
      if (builtOn.has(`${x},${y}`)) continue;

      // A feature takes the tile instead of undergrowth, and is rare enough that meeting one is an
      // event. It may stand far taller than common overdraw because it is drawn offset to one
      // side, so the traveller passes beside it rather than behind it.
      const feature = featureFrame(
        biome,
        tileHash(world.seed, x, y, 'feature-present'),
        tileHash(world.seed, x, y, 'feature-pick')
      );
      if (feature !== null) {
        // **A thing that stands up needs to touch the ground it stands on.** Without it a tree is
        // a sticker on the terrain: the eye reads no contact, so the trunk floats however well the
        // trunk is drawn. It is the cheapest depth cue in the book and the game already owns the
        // texture -- the traveller has had one since the phase that added him, and the reasoning
        // for keeping it is in `docs/rendering.md` under what survived the vignette.
        //
        // Only under the ones that stand. A fallen log, stepping stones and a tussock lie flat, and
        // a shadow drawn under a thing already lying on the ground is a smudge. A root curtain is
        // the third case -- it hangs from rock above and touches no ground, so it casts nothing
        // while still drawing in front of that rock, which is why this asks its own question rather
        // than inverting the depth slot's.
        if (!featureIsUnderfoot(feature.frame, feature.sheet) &&
            featureCastsContact(feature.frame, feature.sheet)) {
          out.push({
            sheet: 'contact',
            frame: 0,
            x,
            y,
            // Under the feature's base rather than its middle. The sprite fills its cell and stands
            // on the lower part of it, so the shadow belongs below centre.
            offset: { x: 0, y: FEATURE_SHADOW_DROP },
            // Underfoot: on the ground, over the terrain, beneath everything that stands in it --
            // including the feature it belongs to.
            depth: underfoot
          });
        }
        out.push({
          sheet: feature.sheet,
          frame: feature.frame,
          x,
          y,
          depth: featureIsUnderfoot(feature.frame, feature.sheet) ? underfoot : canopy
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
    // The bank is an edge blend and sits with them; the shadow it casts goes just above, because
    // it lies on water that may itself be a blend of river into sea.
    ...planBank(built.world),
    ...planShore(built.world),
    ...planUndersideShade(built.world),
    ...planCliffs(built.world),
    // After the faces, so a stone covers the end of the band it is tidying rather than sitting
    // behind it.
    ...planCliffJoints(built.world),
    ...planCliffTalus(built.world, builtOn),
    ...planTreeline(built.world),
    ...planDecor(built.world, builtOn),
    ...planShoreProps(built.world, builtOn),
    // After decor, before the huts: the line is laid *on* the ground and things stand beside it,
    // so a rail draws over a scattered stone and under a building.
    ...planIslandShadow(built.world),
    ...planTrack(built.world),
    // After the rails, because a cloud drifts over the line and not under it -- and after the
    // shadow, which is on the water rather than in the air above it.
    ...planClouds(built.world),
    ...huts,
    ...planOverdraw(built.world, builtOn),
    ...planMarkers(built)
  ];
}

/**
 * The railway, laid along whatever `Tile.track` marks.
 *
 * **Placed from the world rather than from the ground.** Every other scatter layer asks what a
 * tile is made of; this asks whether a line runs over it, which is a fact the generator stamped
 * and no biome can express. That is the same distinction `Tile.track` exists for: the sea under
 * the Aravali crossing is still sea, and the forest floor under the sunk cutting is still forest.
 *
 * The run's direction comes from the neighbours, because a single tile cannot know which way a
 * route goes -- a rail with track above and below it runs north-south whatever it is standing on.
 *
 * Drawn at `underfoot`, like decor: the traveller walks over the rails rather than behind them.
 */
/**
 * Ground that can take a line back: anything with something growing on it.
 *
 * Not `coast` or `desert` -- sand does not reclaim -- and not water or the sky biomes, where the
 * crossing is deliberately kept clear because it is the part still in use.
 */
const GROWS_OVER: ReadonlySet<BiomeId> = new Set<BiomeId>([
  'forest', 'hills', 'plains', 'wetland', 'mountains', 'river'
]);

/**
 * How far an island's shadow reaches across the water, in rows.
 *
 * Four. Far enough to read as a gap between the island and the sea, near enough that it is plainly
 * this island's shadow and not weather.
 */
const SHADOW_REACH = 4;

/** How dark the shadow is directly under the lip, before it fades out with distance. */
const SHADOW_DARKEST = 0.34;

/**
 * The shadow an island casts on the water under it.
 *
 * **The one thing that says the island is not simply an island.** Everything else about a floating
 * shelf -- the grass to the edge, the rock face hanging under the lip, the cliffs along the joint
 * -- is equally true of a sea stack. What separates them is that light gets underneath one of
 * them, and the water below goes dark.
 *
 * No art. It is a tinted quad over open water, which is what a shadow on the sea is, and the scene
 * special-cases it the way it already special-cases the marker glyph. Adding a sheet would mean
 * painting four frames of "dark blue" and keeping them in step with the sea texture.
 *
 * Only over `sea`, and only below the rock face, so it never darkens a shore, a rail or the next
 * island down. It fades with distance from the lip, because the edge of a hard-edged shadow is a
 * second silhouette and the eye reads it as an object.
 */
export function planIslandShadow(world: FieldMapWorld['world']): Placement[] {
  const out: Placement[] = [];
  const hangs = (x: number, y: number): boolean => {
    const biome = world.tiles[y]?.[x]?.biome;
    return biome === 'sky_island' || biome === 'sky_underside';
  };

  for (let x = 0; x < world.width; x += 1) {
    for (let y = 0; y < world.height; y += 1) {
      if (world.tiles[y]![x]!.biome !== 'sea') continue;

      // How far above this tile the island's lowest edge sits, if it is above at all.
      let below = 0;
      for (let up = 1; up <= SHADOW_REACH; up += 1) {
        if (hangs(x, y - up)) {
          below = up;
          break;
        }
      }
      if (below === 0) continue;

      out.push({
        sheet: 'shadow',
        frame: 0,
        x,
        y,
        depth: depthFor(y, ROW_SLOT.underfoot),
        alpha: SHADOW_DARKEST * (1 - (below - 1) / SHADOW_REACH)
      });
    }
  }
  return out;
}

/**
 * How far a cloud reaches from its heart, in tiles across and down.
 *
 * Wider than deep, because that is what a cloud seen from above and slightly in front looks like
 * and because the map is a portrait: a round cloud three tiles across is a sixth of the strait's
 * width and reads as a blot.
 */
const CLOUD_REACH_X = 3;
const CLOUD_REACH_Y = 2;

/** How solid a cloud is at its heart. */
const CLOUD_DENSEST = 0.62;

/** Below this a cloud tile is not worth a quad -- it is a pane of glass over the water. */
const CLOUD_FAINTEST = 0.1;

/**
 * One sea tile in this many is the heart of a cloud.
 *
 * **Not the reciprocal of the coverage, which is worth knowing before tuning it.** Each heart
 * covers a couple of dozen tiles and the ellipses overlap, so fewer hearts can cover *more* water:
 * one in seventy measures 397 tiles and one in a hundred measures 418, because the sparser hearts
 * overlap each other less. Tune by measuring, not by arithmetic.
 *
 * At one in a hundred the strait comes out **418 quads over 22.5% of the water**, in a scene of
 * 7,041 placements. `docs/rendering.md` records that blended fill is the budget and that a
 * full-cell translucent quad is the expensive kind, so the layer was measured rather than
 * reasoned about: `npm run perf` on the software rasteriser puts it inside the noise floor,
 * best frame 249.9 ms before and 250.0 ms after.
 */
const CLOUD_ONE_IN = 100;

/**
 * Weather over the strait: banks of voxel cloud on the open water, outside the islands.
 *
 * **Outside the silhouette, which is a decision rather than a limitation.** Cloud *inside* the
 * island -- vapour clinging under the shelf, a collar round the rim -- was the other option and it
 * is the one that fights everything already there: the shelf's shade, the shadow on the water and
 * the cliffs along the joint are three layers all saying "this thing floats", and a fourth drawn
 * on top of them says it less clearly rather than more. Out on the water a cloud says something
 * none of those do, which is that there is air between the island and the sea.
 *
 * So a cloud tile is only ever a *sea* tile. It never covers the island, the shelf, a shore or a
 * point of interest, and it cannot hide anything a player has to see. The one thing on open water
 * it does have to stay off is the railway, which is the only way across.
 *
 * **A cloud is a cluster, not a tile.** Scattering translucent cells one at a time gives a mist
 * with the map's own grid in it. Hearts are picked from the hash and a soft ellipse is stamped
 * around each, so alpha falls from the middle outward and the *shape* lives across tiles -- which
 * is also why the voxels inside a tile are not faded at its edge. See `cloudTextureKey`.
 *
 * Only on a map with islands on it. Cloud over Lothal's harbour is a different picture and a
 * different argument, and this one is about the sky.
 */
export function planClouds(world: FieldMapWorld['world']): Placement[] {
  const hasSky = world.tiles.some((row) => row.some((t) => t.biome === 'sky_island'));
  if (!hasSky) return [];

  // Density per tile, taken as the strongest of however many clouds overlap it. Adding them
  // instead lets two thin clouds make an opaque one, which is a fog bank rather than weather.
  const density = new Map<string, number>();
  const open = (x: number, y: number): boolean => {
    const tile = world.tiles[y]?.[x];
    return tile !== undefined && tile.biome === 'sea' && tile.track !== true;
  };

  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      if (!open(x, y)) continue;
      if (tileHash(world.seed, x, y, 'cloud') % CLOUD_ONE_IN !== 0) continue;

      for (let dy = -CLOUD_REACH_Y; dy <= CLOUD_REACH_Y; dy += 1) {
        for (let dx = -CLOUD_REACH_X; dx <= CLOUD_REACH_X; dx += 1) {
          const cx = x + dx;
          const cy = y + dy;
          if (!open(cx, cy)) continue;
          const ex = dx / (CLOUD_REACH_X + 1);
          const ey = dy / (CLOUD_REACH_Y + 1);
          const out = Math.sqrt(ex * ex + ey * ey);
          if (out > 1) continue;
          // Ragged at the edge by a tenth, so the ellipse is a cloud rather than a lens.
          const ragged = (tileHash(world.seed, cx, cy, 'puff') % 20) / 100;
          const alpha = CLOUD_DENSEST * (1 - out * out) - ragged;
          const key = `${cx},${cy}`;
          if (alpha > (density.get(key) ?? 0)) density.set(key, alpha);
        }
      }
    }
  }

  const out: Placement[] = [];
  for (const [key, alpha] of density) {
    if (alpha < CLOUD_FAINTEST) continue;
    const [x, y] = key.split(',').map(Number) as [number, number];
    out.push({
      sheet: 'cloud',
      frame: tileHash(world.seed, x, y, 'voxel') % CLOUD_PATTERNS,
      x,
      y,
      // Above the water, the island's shadow on it and the rails, and below anything that stands
      // up: a cloud between the eye and the sea, not one draped over the crossing.
      depth: depthFor(y, ROW_SLOT.undergrowth),
      alpha
    });
  }
  return out;
}

export function planTrack(world: FieldMapWorld['world']): Placement[] {
  const out: Placement[] = [];
  const tracked = (x: number, y: number): boolean => world.tiles[y]?.[x]?.track === true;

  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const tile = world.tiles[y]![x]!;
      if (!tile.track) continue;

      // East-west when the line's neighbours are to the sides rather than above and below. A
      // lone tile with neither falls to north-south, which is the direction the Aravali line runs.
      const alongX = tracked(x - 1, y) || tracked(x + 1, y);
      const alongY = tracked(x, y - 1) || tracked(x, y + 1);
      const eastWest = alongX && !alongY;

      // Overgrown where nothing runs: the strait crossing is kept and the land approaches are not.
      // Read off the ground rather than stored, so a line laid across new country needs no edit.
      //
      // **Anything growing, rather than a list of two biomes.** It named `forest` and `hills`,
      // which happened to be the whole of the land the line crossed while the line ran shore to
      // shore. The approaches are stubs on the near shore now, and the southern one runs mostly
      // through `plains` -- so two thirds of the derelict track was drawn as kept rail through
      // open grass, which is the one stretch nothing has run on for four hundred years.
      //
      // The real question is whether there is anything here to grow over it. Sand and bare rock
      // cannot; grass, scrub and trees can. That is a property of the ground, so it is asked of
      // the ground.
      const overgrown = GROWS_OVER.has(tile.biome);

      out.push({
        sheet: 'track',
        frame: trackFrame(eastWest, overgrown),
        x,
        y,
        depth: depthFor(y, ROW_SLOT.underfoot)
      });
    }
  }
  return out;
}
