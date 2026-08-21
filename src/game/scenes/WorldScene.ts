// The map: everything the player sees on the canvas.
//
// This is the only file in the project that knows Phaser exists, apart from `PhaserGame.tsx` and
// `tileTextures.ts`. World generation, species lookup and journal prose all live in `world/` and
// `content/`, which run under plain Node — so the tests exercise the real game logic and swapping
// engine versions touches this folder alone.

import Phaser from 'phaser';
import varunaUrl from '../../../assets/varuna-overworld.png';
import terrainUrl from '../../../assets/terrain.png';
import landmarksUrl from '../../../assets/landmarks.png';
import placesUrl from '../../../assets/places.png';
import hutsUrl from '../../../assets/huts.png';
import overdrawUrl from '../../../assets/overdraw.png';
import featuresUrl from '../../../assets/features.png';
import edgesUrl from '../../../assets/edges.png';
import decorUrl from '../../../assets/decor.png';
import { EventBus } from '../EventBus';
import {
  FEATURE_SHEET,
  FOG_TEXTURE,
  HUT_SHEET,
  OVERDRAW_SHEET,
  LANDMARK_SHEET,
  PLACE_SHEET,
  TERRAIN_SHEET,
  DECOR_SHEET,
  SHADOW_TEXTURE,
  VIGNETTE_TEXTURE,
  TILE_SIZE,
  blendTextureKey,
  createTileTextures,
  loadTileSheets,
  tileFrame,
  traceFrameFor
} from '../tileTextures';
import { SWAY_PERIOD, planScene, type PlacementSheet } from '../scenePlan';
import { ROW_SLOT, depthFor } from '../frames';
import { beatFor, beatKey, settleZoom, type ArrivalPlace } from '../arrival';

/** Which loaded texture each kind of placement draws from. `marker` is a glyph and has none. */
const SHEET_KEY: Record<Exclude<PlacementSheet, 'marker'>, string> = {
  terrain: TERRAIN_SHEET,
  huts: HUT_SHEET,
  overdraw: OVERDRAW_SHEET,
  features: FEATURE_SHEET,
  places: PLACE_SHEET,
  landmarks: LANDMARK_SHEET,
  decor: DECOR_SHEET
};
import {
  CHARACTERS,
  PLAYER_FRAME,
  actionFor,
  animFor,
  createCharacterAnimations,
  facingFromStep,
  loadCharacterSheet,
  type Facing
} from '../player';
import { phaseAt, skyAt, startPhaseFor, travelTimeMs } from '../dayNight';
import { fatigueAt, fatigueEnabled, fatigueNote, paceFor, restUntilMorning } from '../fatigue';
import { duskNote, isDark, lightLeft, shelterAt, spendNight, type Shelter } from '../night';
import { momentAt } from '../moment';
import {
  arrivalPage,
  describeSurroundings,
  describeTile,
  landmarkHint,
  whereNextHint
} from '../../content/journal';
import { travelCost } from '../../content/species';
import { isWalkable } from '../../world/generate';
import { buildFieldMap, poiAt, type FieldMapWorld } from '../../world/fieldMap';
import { fieldMap } from '../../content/places';
import { isCamp } from '../../content/camps';
import { findPath } from '../../world/pathfind';
import { tileHash } from '../../world/rng';
import type { Point, Tile, World } from '../../world/types';

/**
 * How the fog reads: clear underfoot, dimmed where you have been, dark where you have not.
 *
 * Lowered from 0.92 and 0.4, and that part survived an attempt at soft-edged fog that did not --
 * see `createTileTextures`. The target frame has no fog at all, so where this used to hide the map
 * it now shades it, and unexplored ground reads as being beyond the lamp rather than behind a wall.
 */
const FOG_UNKNOWN = 0.6;
const FOG_REMEMBERED = 0.2;
const FOG_VISIBLE = 0;

/** How far the traveller can see. */
const SIGHT_RADIUS = 2;

/**
 * The fixed layers, below and above the row-sorted band in `frames.ts`.
 *
 * Named rather than written inline because that band is unbounded -- a 48-row map reaches depth
 * 580 -- so anything meant to sit over the whole world needs a number that clears it. Fog and the
 * sky tint were 10 and 30, which the row band silently overtook the moment it existed: grass drew
 * over the fog and escaped the light of the hour.
 */
const DEPTH_TILE = 0;
/** Above every row: a field map is 48 rows, so the band tops out far below this. */
const DEPTH_FOG = 2000;
const DEPTH_SKY = 3000;


/**
 * How long a footprint stays before it is gone.
 *
 * Long enough to look back and see three or four steps of your own trail, short enough that a
 * long walk does not leave the whole map scribbled on.
 */
const TRACE_FADE_MS = 6000;

/**
 * Roughly how many tiles should be visible across the screen, whatever its size.
 *
 * Sixteen, rather than the forty a desktop showed at zoom 1: at that size the traveller is a
 * postage stamp in a sea of map, and the tile art has nothing to say.
 */
const TILES_ACROSS = 16;

/**
 * Zoom limits, as multiples of the automatic fit rather than absolute numbers.
 *
 * These used to be absolute — `MAX_ZOOM = 4`, `MIN_ZOOM = 1` — and that was correct while a tile
 * was 32 pixels of art, because the fit landed on 3 and the useful range around it happened to be
 * the integers 1 to 4. Integers also mattered then for their own sake: a fractional zoom on pixel
 * art puts texels between screen pixels and the whole map shimmers.
 *
 * At 128 both reasons are gone. The fit is now 0.625 on a 1280 viewport, so an absolute floor of 1
 * clamps *every* desktop to a zoom that shows a quarter of the tiles it should — which is exactly
 * what happened: the map drew at a quarter scale into the corner. And painted art at a fractional
 * zoom is fine, which is the whole reason the direction changed.
 *
 * So the limits are relative. The player may stand twice as close as the fit, or four times as far
 * back, whatever the fit happens to be — and the fit follows `TILES_ACROSS` at any tile size.
 */
const MAX_ZOOM_FACTOR = 2;
const MIN_ZOOM_FACTOR = 0.25;

/** How much one press of `+` or `-` changes the zoom. A ratio, so it reads the same at any fit. */
const ZOOM_STEP_RATIO = 1.35;

/**
 * Milliseconds per step on easy ground. `travelCost` from the biome data scales this.
 *
 * Raised twice, for the same reason both times. At 170 the traveller crossed a tile of grassland
 * faster than the field notes beneath him could be read — and grassland is the common ground, so
 * that was most of the walk. The journal is the game; outrunning it is the one pace that cannot be
 * right. 340 was still brisk enough that a map went by as scenery rather than as country, so this
 * is a further quarter on top.
 *
 * A number to settle by playing rather than by reasoning. It interacts with the map sizes (48x48
 * and 64x64) and, later, with fatigue — which is why fatigue is a separate phase behind a flag
 * rather than something tuned at the same time as this.
 */
const STEP_MS = 425;

/** Keys that change the zoom. `0` gives it back to the automatic fit. */
const ZOOM_KEYS: Record<string, number | 'reset'> = {
  Equal: 1,
  NumpadAdd: 1,
  Minus: -1,
  NumpadSubtract: -1,
  Digit0: 'reset',
  Numpad0: 'reset'
};

/** How far two fingers must move apart or together before it counts as a pinch, in pixels. */
const PINCH_THRESHOLD = 60;

/** Keys that move the traveller one tile, by KeyboardEvent.code. */
const STEP_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0]
};

export interface WorldSceneData {
  seed: string;
  discovered?: string[];
  /**
   * Which canon field map to lay down.
   *
   * The scene used to call `generateWorld` and get an anonymous continent. It now builds a
   * named place: canon gives the biome palette and the points of interest, the generator lays
   * the terrain, and `buildFieldMap` puts the authored places on it. Layout stays the
   * engine's business and the places stay canon's, which is the whole reason for the split.
   */
  fieldMapId?: string;
}

/** Where a journey starts when nothing says otherwise. */
export const DEFAULT_FIELD_MAP = 'field_map_lothal';

export class WorldScene extends Phaser.Scene {
  private world!: World;
  /** The field map and its placed points of interest. `world` is this one's ground. */
  private built!: FieldMapWorld;
  /** The place under foot, so the UI is told when it changes rather than on every step. */
  private standingOn: string | null = null;
  private tileSprites: Phaser.GameObjects.Image[][] = [];
  /** Everything swaying at depth 21, with the two frames it alternates and its own phase. */
  private overdraw: { sprite: Phaser.GameObjects.Image; rest: number; lean: number; phase: number }[] = [];
  private fogSprites: Phaser.GameObjects.Image[][] = [];
  /**
   * Every static thing that belongs to a tile, so it can be hidden when the camera cannot see it.
   *
   * Phaser submits the whole display list every frame whether or not the camera is looking at it,
   * and a 64x64 map carries around nineteen thousand objects: a tile, a fog quad, up to four edge
   * blends and up to three props per cell. Measured before this existed, the frame cost tracked the
   * *map size* rather than the window -- 83ms on a 48x48 map against 133ms on a 64x64 one, which is
   * the signature of nothing being culled.
   */
  private tileOwned: { sprite: Phaser.GameObjects.GameObject & { visible: boolean }; x: number; y: number }[] = [];
  /** The tile window last culled to, so the sweep only runs when it actually changes. */
  private culled: { x0: number; y0: number; x1: number; y1: number } | null = null;
  private player!: Phaser.GameObjects.Sprite;
  /** The soft ellipse under the traveller, moved with him so he never floats. */
  private shadow!: Phaser.GameObjects.Image;
  private at: Point = { x: 0, y: 0 };
  private discovered = new Set<string>();
  private visible = new Set<string>();
  /**
   * Places whose arrival beat has already played, keyed by `beatKey`.
   *
   * Was a single `arrived` boolean when only the landmark had a beat. Now that every place gets
   * one, "has this fired" is a question per place rather than per journey.
   */
  private beaten = new Set<string>();
  private moving = false;
  private queuedPath: Point[] = [];
  private facing: Facing = 'down';
  /** A key press caught between frames, waiting for the next one to act on it. */
  private pendingStep: [number, number] | null = null;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  /** The day/night wash, drawn over the whole map. */
  private sky!: Phaser.GameObjects.Rectangle;
  /** The frame's falloff, pinned to the camera rather than the world. */
  private vignette!: Phaser.GameObjects.Image;
  /** Where in the day this journey opened — the player's own hour. */
  private startPhase = 0;
  /**
   * How much of the day the walking itself has spent, on top of the time that simply passes.
   *
   * Without this the sun answers only to the wall clock, and a traveller could cross the whole
   * country twice between breakfast and lunch. See `travelTimeMs`: thirty kilometres to the day.
   */
  private travelled = 0;
  /**
   * Where `travelled` stood at the last night's sleep. Fatigue is the gap between the two.
   *
   * **Deliberately not saved.** Loading into an exhausted state with no memory of the walk that
   * caused it is worse than starting rested, so a reload is a fresh morning. Do not "fix" this
   * by persisting it.
   */
  private restedAt = 0;
  /** Off unless `?fatigue=1`. One release behind a flag -- see `fatigue.ts`. */
  private fatigueOn = false;
  /** How much of the canvas the DOM overlays cover. React measures it and tells us; see EventBus. */
  private insets = { right: 0, bottom: 0 };
  /** The zoom the player asked for, or null to keep fitting the screen automatically. */
  private zoomChoice: number | null = null;
  /** Distance between two fingers on the previous frame, for pinch. Zero when not pinching. */
  private pinchFrom = 0;
  /** The last moment announced, so the UI is told when it changes rather than every frame. */
  private lastMoment = '';
  /** The zoom last announced, so the DOM mirror is written only when it moves. */
  private lastZoom = 0;
  /** When the moment was last worked out. It turns a few times an hour; sixty times a second
   * is sixty times too often, and `momentAt` redoes the sky calculation `updateSky` just did. */
  private momentCheckedAt = -Infinity;

  constructor() {
    super('WorldScene');
  }

  init(data: WorldSceneData): void {
    // A restart re-enters init, so every piece of per-journey state is reset here rather than in
    // a field initialiser — otherwise "generate a new map" would inherit the old fog.
    this.discovered = new Set(data.discovered ?? []);
    this.visible = new Set();
    this.beaten = new Set();
    this.tileSprites = [];
    this.fogSprites = [];
    this.tileOwned = [];
    this.culled = null;
    this.overdraw = [];
    this.queuedPath = [];
    this.moving = false;
    this.facing = 'down';
    this.travelled = 0;
    this.restedAt = 0;
    this.standingOn = null;
    this.lastMoment = '';
    this.momentCheckedAt = -Infinity;
    this.lastZoom = 0;
    // The map opens on the light of the hour the player is actually in, then drifts from there.
    // `?hour=21` overrides it, so the evening can be checked without waiting for the evening.
    this.startPhase = startPhaseFor(new URLSearchParams(window.location.search).get('hour'));
    this.fatigueOn = fatigueEnabled(window.location.search);
  }

  preload(): void {
    loadCharacterSheet(this, CHARACTERS.varuna.key, varunaUrl);
    loadTileSheets(this, {
      terrain: terrainUrl,
      landmarks: landmarksUrl,
      places: placesUrl,
      huts: hutsUrl,
      overdraw: overdrawUrl,
      features: featuresUrl,
      edges: edgesUrl,
      decor: decorUrl
    });
  }

  create(data: WorldSceneData): void {
    createTileTextures(this);

    // Canon names the ground. A seed still varies it, so a journey stays shareable in a link;
    // leave the seed alone and every player walks the same documented Lothal.
    const map = fieldMap(data.fieldMapId ?? DEFAULT_FIELD_MAP);
    if (!map) throw new Error(`no such field map: ${data.fieldMapId}`);
    this.built = buildFieldMap(map, { seed: data.seed });
    this.world = this.built.world;
    this.at = { ...this.world.start };

    const { width, height } = this.world;
    const pixelWidth = width * TILE_SIZE;
    const pixelHeight = height * TILE_SIZE;

    for (let y = 0; y < height; y += 1) {
      const tileRow: Phaser.GameObjects.Image[] = [];
      const fogRow: Phaser.GameObjects.Image[] = [];
      for (let x = 0; x < width; x += 1) {
        const tile = this.world.tiles[y]![x]!;
        const cx = x * TILE_SIZE + TILE_SIZE / 2;
        const cy = y * TILE_SIZE + TILE_SIZE / 2;
        // Which crop of this biome's art. Deterministic from the seed, so the same journey draws
        // the same ground -- `tileHash` is the generator's, not a fresh random.
        const variant = tileHash(this.world.seed, x, y, 'tile-variant');
        const tileSprite = this.add
          .image(cx, cy, TERRAIN_SHEET, tileFrame(tile.biome, variant))
          .setDepth(DEPTH_TILE);
        tileRow.push(tileSprite);
        this.tileOwned.push({ sprite: tileSprite, x, y });
        fogRow.push(
          this.add
            .image(cx, cy, FOG_TEXTURE)
            // Exactly its own cell. Anything wider bleeds onto neighbours and buries the tile the
            // traveller is standing on -- see `createTileTextures`.
            .setDisplaySize(TILE_SIZE, TILE_SIZE)
            .setTint(0x241a26)
            .setAlpha(FOG_UNKNOWN)
            .setDepth(DEPTH_FOG)
        );
      }
      for (let x = 0; x < width; x += 1) this.tileOwned.push({ sprite: fogRow[x]!, x, y });
      this.tileSprites.push(tileRow);
      this.fogSprites.push(fogRow);
    }

    this.createGround();

    this.createPlayer();

    // Above the fog and the player, so the light of the hour falls on everything. Origin at the
    // top-left corner rather than the centre so it lines up with the world without arithmetic.
    this.sky = this.add
      .rectangle(0, 0, pixelWidth, pixelHeight, 0xffffff, 0)
      .setOrigin(0, 0)
      .setDepth(DEPTH_SKY);
    this.updateSky();

    // Stretched over whatever the camera can see, and re-stretched whenever that changes.
    //
    // The first version used `setScrollFactor(0)` on the reasoning that the vignette belongs to the
    // frame rather than the world. That is the right idea and the wrong mechanism: a scroll factor
    // of zero pins an object to the camera but does **not** exempt it from the camera's zoom, so an
    // image sized to the viewport in world units shrinks as the player zooms out. At the widest
    // zoom it became a small dark rectangle sitting in the middle of the map and moving with the
    // traveller -- with a visibly lighter ellipse in it, because that is the gradient's clear centre
    // and the hard edges are where it clamps to its final stop.
    //
    // `camera.worldView` is the visible world rectangle, so tracking it is correct at any zoom by
    // construction and needs no arithmetic about scroll factors.
    this.vignette = this.add
      .image(0, 0, VIGNETTE_TEXTURE)
      .setOrigin(0, 0)
      .setDepth(DEPTH_SKY + 1);
    this.updateVignette();

    // Bounds are not set here: they depend on the zoom and on what the panels are covering, so
    // `applyCamera` owns them and recomputes them on every resize and every zoom step.
    this.cameras.main.setBackgroundColor('#1b1420');
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.applyCamera();
    this.cameras.main.fadeIn(600, 27, 20, 32);

    this.bindInput();

    // Fog for tiles restored from a save, then the tile the player is standing on.
    for (const key of this.discovered) {
      const [x, y] = key.split(',').map(Number);
      this.setFog(x!, y!, FOG_REMEMBERED);
    }
    EventBus.emitEvent('world-ready', { world: this.world });
    this.arriveAt(this.at);
  }

  /**
   * Everything that stands on the ground: huts, undergrowth, features, markers.
   *
   * The decisions live in `scenePlan.ts`, which is free of Phaser so they can be asserted under
   * Node. This is the half that needs an engine, and it is deliberately dull -- if placing a sprite
   * ever needs a decision, that decision belongs in the plan rather than here.
   */
  private createGround(): void {
    for (const item of planScene(this.built)) {
      // The offset is a fraction of a cell and only decor carries one -- see `Placement.offset`.
      // Converting it here rather than in the plan is the same split as everything else: the plan
      // says "four tenths of a tile to the left", the scene knows what a tile is in pixels.
      const jx = (item.offset?.x ?? 0) * TILE_SIZE;
      const jy = (item.offset?.y ?? 0) * TILE_SIZE;
      const cx = item.x * TILE_SIZE + TILE_SIZE / 2 + jx;
      const cy = item.y * TILE_SIZE + TILE_SIZE / 2 + jy;

      if (item.sheet === 'marker') {
        this.add
          .text(cx, cy, '◇', {
            fontFamily: 'Georgia, serif',
            fontSize: `${Math.round(TILE_SIZE * 0.7)}px`,
            color: '#fff6df'
          })
          .setOrigin(0.5)
          .setDepth(item.depth)
          .setAlpha(0.9)
          .setName(item.name ?? '');
        continue;
      }

      // The edge blend is the one placement carrying two frames: a terrain frame and the torn mask
      // it shows through. The pair is baked into a texture once and drawn as an ordinary image --
      // see `blendTextureKey` for why a per-sprite Phaser mask is not an option at this count.
      if (item.maskFrame !== undefined) {
        const blend = this.add
          .image(cx, cy, blendTextureKey(this, item.frame, item.maskFrame))
          .setDepth(item.depth);
        this.tileOwned.push({ sprite: blend, x: item.x, y: item.y });
        continue;
      }

      // Huts, places and landmarks are bottom-anchored so a tower stands on its tile and rises
      // into the one above; ground cover fills its cell.
      const anchored = item.sheet === 'huts' || item.sheet === 'places' || item.sheet === 'landmarks';
      const sprite = this.add
        .image(cx, anchored ? item.y * TILE_SIZE + TILE_SIZE : cy, SHEET_KEY[item.sheet], item.frame)
        .setDepth(item.depth);
      if (anchored) sprite.setOrigin(0.5, 1);
      if (item.name) sprite.setName(item.name);
      if (item.sway) this.overdraw.push({ sprite, ...item.sway });
      // Markers are found by name for the fog reveal and must stay in the list; everything else
      // that belongs to one tile can be hidden with it.
      if (!item.name) this.tileOwned.push({ sprite, x: item.x, y: item.y });
    }
  }

  /**
   * Alternate every swaying sprite between its two frames.
   *
   * One pass over a flat array each frame, setting an index that is usually the one already set --
   * Phaser skips the work when it has not changed, so this costs a comparison per tile rather than
   * a redraw. The phase offset is what stops a field looking like one blinking object.
   */
  private updateSway(): void {
    const now = this.time.now;
    for (const item of this.overdraw) {
      const leaning = ((now + item.phase) % SWAY_PERIOD) * 2 > SWAY_PERIOD;
      item.sprite.setFrame(leaning ? item.lean : item.rest);
    }
  }

  private createPlayer(): void {
    createCharacterAnimations(this, CHARACTERS.varuna.key);
    // Varuna stands taller than a tile, so he is anchored by the feet and allowed to overhang.
    //
    // The frame is 26x40 pixels of art and stays that way — the figures are deliberately still
    // pixel art (`docs/art-brief.md`). What changed is the ground beneath him: at TILE_SIZE 32 the
    // frame was drawn at its native size and that was right, but on a 128 grid it made him a fifth
    // of his intended height and he disappeared into the tile he was standing on.
    //
    // So he is scaled by the same whole number the grid grew by. Whole, not fitted: a fractional
    // scale is what makes pixel art shimmer as it moves, and that reason survives the direction
    // change even though the ground's version of it did not.
    const figureScale = TILE_SIZE / 32;

    // Created before the player so it is beneath him in the display list as well as in depth --
    // equal depths resolve by insertion order, and his own shadow drawn over his boots is worse
    // than no shadow at all.
    //
    // Wider than it is tall, and wider than the figure: a shadow the width of the sprite reads as
    // a dark stripe under a plank. Two thirds of a tile across and a fifth of one deep is what
    // makes it read as ground rather than as an object.
    this.shadow = this.add
      .image(0, 0, SHADOW_TEXTURE)
      .setDisplaySize(TILE_SIZE * 0.62, TILE_SIZE * 0.2);

    this.player = this.add
      .sprite(0, 0, CHARACTERS.varuna.key, 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(PLAYER_FRAME.width * figureScale, PLAYER_FRAME.height * figureScale);
    this.player.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.updateAnimation();
    this.placePlayer(this.at);
  }

  /**
   * Play whatever the traveller should be doing: walking, standing, or sitting at the landmark.
   * Re-playing the animation already running would restart it every frame, so it is checked first.
   */
  private updateAnimation(): void {
    // Sitting is about where the traveller *is*, not whether they have ever arrived. `beaten`
    // keeps its entries for the rest of the journey so each page is written once; using it here
    // meant walking away from a place still played the seated frames.
    //
    // A place counts as well as the landmark: sitting down is what reads as "this is a stop", and
    // it is the whole of the beat a place gets.
    const atRest =
      (this.at.x === this.world.landmark.x && this.at.y === this.world.landmark.y) ||
      poiAt(this.built, this.at) !== null;
    const action = actionFor(this.moving, atRest);
    const { key, flipX } = animFor(CHARACTERS.varuna.key, this.facing, action);
    if (this.player.anims.currentAnim?.key !== key) this.player.play(key);
    this.player.setFlipX(flipX);
  }

  /** Point the sprite the way it is walking, mirroring the side view for leftward steps. */
  private faceTowards(dx: number, dy: number): void {
    this.facing = facingFromStep(dx, dy, this.facing);
  }

  private placePlayer(at: Point): void {
    this.player.setPosition(at.x * TILE_SIZE + TILE_SIZE / 2, at.y * TILE_SIZE + TILE_SIZE - 2);
    this.moveShadow();
    this.sortPlayer(at.y);
  }

  /**
   * Keep the shadow under the feet.
   *
   * Read off the player rather than off the tile, because during a step he is between two tiles on
   * a tween and a shadow placed by tile coordinates would jump ahead of him and then wait.
   */
  private moveShadow(): void {
    this.shadow.setPosition(this.player.x, this.player.y - 1);
  }

  /**
   * Put the traveller in his row's depth slot.
   *
   * Called on every step rather than set once, because his depth is a function of where he is
   * standing. Without this he keeps one depth for the whole journey and grass a dozen tiles south
   * of him -- which should be nearer the camera than he is -- draws across his face.
   */
  private sortPlayer(row: number): void {
    this.player.setDepth(depthFor(row, ROW_SLOT.walker));
    // One slot below him, in the same row band. `underfoot` is where decor lives, which is right:
    // a shadow is a mark on the ground, and it should pass under a stone the way the ground does.
    this.shadow.setDepth(depthFor(row, ROW_SLOT.underfoot));
  }

  private bindInput(): void {
    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    }) as typeof this.wasd;
    // Without this the arrow keys scroll the page behind the canvas.
    keyboard.addCapture('UP,DOWN,LEFT,RIGHT,W,A,S,D');

    // Tap or click to walk: the only way to play on a phone.
    this.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const target = {
        x: Math.floor(world.x / TILE_SIZE),
        y: Math.floor(world.y / TILE_SIZE)
      };
      // Weighted, so a tap across a range walks round it rather than over it. The scene has
      // always paid `travelCost` per step; until now only the *duration* knew about it and the
      // route did not, so tap-to-walk reliably chose the slowest line available to it.
      this.queuedPath = findPath(
        this.world.tiles,
        this.world.width,
        this.world.height,
        this.at,
        target,
        isWalkable,
        (tile) => travelCost(tile.biome) ?? 1
      );
    });

    // A tap of a key must never be swallowed.
    //
    // `update` polls `isDown`, which only sees a key that happens to still be held when the frame
    // runs. A press shorter than a frame — about sixteen milliseconds, well within a brisk tap —
    // falls between two ticks and the traveller simply does not move. Listening for the event as
    // well means every press is remembered until the next frame can act on it.
    keyboard.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, (event: KeyboardEvent) => {
      const zoom = ZOOM_KEYS[event.code];
      if (zoom !== undefined) {
        this.onZoom({ step: zoom });
        return;
      }
      const delta = STEP_KEYS[event.code];
      if (!delta) return;
      this.pendingStep = delta;
    });

    // A second pointer, so two fingers can be tracked for pinch. Phaser allocates one by default.
    this.input.addPointer(1);
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.onZoom({ step: dy > 0 ? -1 : 1 });
    });

    EventBus.onEvent('new-journey', this.onNewJourney);
    EventBus.onEvent('resume-journey', this.onNewJourney);
    EventBus.onEvent('travel-to', this.onTravelTo);
    EventBus.onEvent('viewport-insets', this.onInsets);
    EventBus.onEvent('zoom', this.onZoom);
    EventBus.onEvent('camp', this.onCamp);

    // Fires on rotation as well as on a window resize, which is exactly when the zoom and the
    // follow offset both stop being right.
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.offEvent('new-journey', this.onNewJourney);
      EventBus.offEvent('resume-journey', this.onNewJourney);
      EventBus.offEvent('travel-to', this.onTravelTo);
      EventBus.offEvent('viewport-insets', this.onInsets);
      EventBus.offEvent('zoom', this.onZoom);
      EventBus.offEvent('camp', this.onCamp);
      this.input.off(Phaser.Input.Events.POINTER_WHEEL);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize);
      this.input.off(Phaser.Input.Events.POINTER_UP);
      keyboard.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN);
    });
  }

  private onInsets = (insets: { right: number; bottom: number }): void => {
    this.insets = insets;
    this.applyCamera();
  };

  /**
   * Step the zoom, or hand it back to the automatic fit.
   *
   * Steps *multiply* rather than add. Adding one worked while the fit was the integer 3 and the
   * range was 1 to 4; at 128px art the fit is around 0.6, where adding one is a doubling and
   * `Math.round` collapses every step onto the same value — the control stops responding.
   *
   * A ratio behaves the same at any tile size, and each press is a fixed proportion of what you
   * are already looking at, which is what a zoom control should feel like. Still stepped rather
   * than continuous: the discrete jump is easier to undo than a drifting pinch.
   */
  private onZoom = ({ step }: { step: number | 'reset' }): void => {
    if (step === 'reset') {
      this.zoomChoice = null;
      this.applyCamera();
      return;
    }
    const ratio = step > 0 ? ZOOM_STEP_RATIO : 1 / ZOOM_STEP_RATIO;
    this.zoomChoice = this.cameras.main.zoom * ratio;
    this.applyCamera();
  };

  private onResize = (): void => {
    this.applyCamera();
    this.updateVignette();
  };

  /**
   * Stretch the vignette over exactly what the camera can see.
   *
   * Called every frame, because the view moves with the traveller and changes size with the zoom --
   * but it does nothing unless the rectangle has actually moved, which is four comparisons.
   *
   * A pixel of overscan on each side. The view's edges land on fractional world coordinates as the
   * camera tweens between tiles, and a vignette that stops exactly on the boundary leaves a
   * one-pixel seam of untinted map along the edge of the screen on some frames.
   */
  private updateVignette(): void {
    if (!this.vignette) return;
    const view = this.cameras.main.worldView;
    if (view.width === 0) return;
    const x = view.x - 1;
    const y = view.y - 1;
    const w = view.width + 2;
    const h = view.height + 2;
    if (
      this.vignette.x === x &&
      this.vignette.y === y &&
      this.vignette.displayWidth === w &&
      this.vignette.displayHeight === h
    ) {
      return;
    }
    this.vignette.setPosition(x, y);
    this.vignette.setDisplaySize(w, h);
  }

  private onNewJourney = (payload: { seed: string; discovered?: string[] }): void => {
    this.scene.restart({
      seed: payload.seed,
      discovered: payload.discovered ?? [],
      // A new seed re-rolls the ground under the same place, rather than moving you.
      fieldMapId: this.built?.fieldMap.id
    });
  };

  /**
   * Travel to another field map.
   *
   * The fog does not carry over: it is knowledge of *this* ground, and arriving on the plateau
   * knowing where the Lothal mangroves are would be a lie. What does carry over is the diary,
   * which lives in React and never passes through here.
   */
  private onTravelTo = (payload: { fieldMapId: string; seed: string }): void => {
    this.scene.restart({ seed: payload.seed, discovered: [], fieldMapId: payload.fieldMapId });
  };

  /**
   * Fit the camera to whatever the viewport and the overlays currently leave visible.
   *
   * **Zoom.** At `TILE_SIZE` 32 and zoom 1 a desktop shows about forty tiles across — a postage
   * stamp of a traveller in a sea of map — while a narrow phone shows twelve. Zoom is therefore
   * chosen from the width so that roughly `TILES_ACROSS` tiles are visible whatever the screen.
   *
   * It rounds to a **whole number**. Scaling pixel art by a fraction resamples it every frame and
   * it crawls as the camera moves; this is the same reason the player sprite is drawn at an
   * integer scale with `NEAREST` filtering.
   *
   * **Offset.** The camera centres on the player, so anything covering the right of the screen
   * covers the traveller. Working the follow maths through: with `followOffset.x = ox`, the player
   * lands at `width / 2 + ox * zoom` on screen. To sit them in the middle of the *visible* part
   * instead — `(width - right) / 2` — that solves to `ox = -right / (2 * zoom)`, and the same for
   * the bottom.
   */
  private applyCamera(): void {
    const camera = this.cameras.main;
    const { width, height } = this.scale.gameSize;

    // Zoom follows the whole viewport, not the part the panels leave uncovered. Sizing it to the
    // uncovered part meant opening the journal rescaled the entire world — the map jumped from
    // three times to twice as large because a panel appeared, which is a lot of movement to ask of
    // someone who only wanted to read something. The panels now cover the map rather than resize it.
    // The fit, unrounded: at 128px art this is fractional on almost every viewport, and rounding it
    // to an integer is what clamped the whole map to a quarter scale when the tiles grew.
    const fit = width / (TILE_SIZE * TILES_ACROSS);
    const minZoom = fit * MIN_ZOOM_FACTOR;
    const maxZoom = fit * MAX_ZOOM_FACTOR;
    const zoom =
      this.zoomChoice === null ? fit : Phaser.Math.Clamp(this.zoomChoice, minZoom, maxZoom);
    camera.setZoom(zoom);
    if (zoom !== this.lastZoom) {
      this.lastZoom = zoom;
      EventBus.emitEvent('zoom-changed', { zoom });
    }

    // Never push the traveller so far up that the notes crowd them off the top of a short screen.
    const bottom = Math.min(this.insets.bottom, height * 0.45);
    camera.setFollowOffset(-this.insets.right / (2 * zoom), -bottom / (2 * zoom));

    // Bounds, which are the part of this with any subtlety in it.
    //
    // The camera should come to rest with the map's edge against the *edge of what you can see* —
    // the inside edge of the journal panel, not the edge of the screen, or the last column of the
    // country ends up underneath the panel with no way to look at it. So the bounds are the world
    // plus the strip the panels cover: a scroll far enough right to bring that phantom strip into
    // view puts the true right edge exactly where the panel begins.
    //
    // And when the player zooms out past the map filling the visible area, there is nothing left to
    // scroll. Phaser then pins the camera to the near edge of the bounds, which would shove the map
    // into the top-left corner. Splitting the leftover space evenly parks it in the middle instead,
    // which is what a map smaller than its frame should do.
    const covered = { x: this.insets.right / zoom, y: bottom / zoom };
    const spare = {
      x: Math.max(0, (width - this.insets.right) / zoom - this.world.width * TILE_SIZE) / 2,
      y: Math.max(0, (height - bottom) / zoom - this.world.height * TILE_SIZE) / 2
    };
    camera.setBounds(
      -spare.x,
      -spare.y,
      this.world.width * TILE_SIZE + covered.x + spare.x * 2,
      this.world.height * TILE_SIZE + covered.y + spare.y * 2
    );
  }

  /**
   * The hour and the sky, as one value.
   *
   * Built from the scene's own clock -- wall time plus whatever the walking has spent -- so
   * the creature asleep in the journal and the light on the map are the same moment.
   */
  private onCamp = (): void => {
    this.tryStop();
  };

  /**
   * The best shelter where the traveller is standing.
   *
   * A roof beats a camp beats the bedroll, and the bedroll is always there — which is the whole
   * reason he carries one. A roofed place is one canon gave sub-locations to: the tower's stair
   * shaft, the gate court's threshold, the archive's stacks. That is not a new content type, it is
   * reading what "you can go inside this" already meant.
   */
  private shelterHere(): Shelter {
    const here = poiAt(this.built, this.at);
    return shelterAt(
      (here?.poi.subLocations ?? []).length > 0,
      here !== null && isCamp(here.poi)
    );
  }

  /** Whether stopping for the night would do anything. Only after dark; before it, keep walking. */
  private canStopHere(): boolean {
    return isDark(this.travelled, this.startPhase, this.time.now);
  }

  /** How tired the traveller is, or 0 when the flag is off. */
  private fatigue(): number {
    return this.fatigueOn ? fatigueAt(this.travelled, this.restedAt) : 0;
  }

  /**
   * Stop for the night, wherever that is.
   *
   * Advances the clock to first light and, under a roof or at a camp, clears the tiredness. On the
   * bedroll it does not: an open-ground night counts as a night and no more, which is what keeps
   * shelter worth walking to.
   *
   * **He wakes where he stopped.** `this.at` is not touched here and `spendNight` returns no
   * position, so there is nowhere for a new location to come from. An earlier design had him
   * waking somewhere he had not walked to, which is the game moving the player's character while
   * they were not looking.
   */
  private tryStop(): boolean {
    if (!this.canStopHere()) return false;

    const outcome = spendNight(this.shelterHere());
    const morning = restUntilMorning(this.travelled, this.startPhase, this.time.now);
    this.travelled = morning.travelledMs;
    // Only a real night's sleep resets the tiredness. The bedroll buys the hours, not the rest.
    if (outcome.rested) this.restedAt = morning.restedAtMs;

    this.updateSky();
    EventBus.emitEvent('night-passed', {
      at: this.at,
      shelter: outcome.shelter,
      rested: outcome.rested,
      entry: outcome.entry
    });
    this.arriveAt(this.at);
    return true;
  }

  private momentNow() {
    return momentAt(
      this.world.seed,
      this.time.now + this.travelled,
      this.startPhase,
      this.built.fieldMap.climate
    );
  }

  /** Repaint the wash for the current hour. Cheap enough to run every frame. */
  private updateSky(): void {
    // Time passes while you stand still, and walking spends it faster. Sitting on a riverbank for
    // ten real minutes is four hours of the day; so is walking twenty tiles of open grassland.
    const sky = skyAt(phaseAt(this.time.now + this.travelled, this.startPhase));
    this.sky.setFillStyle(sky.colour, sky.alpha);

    // Announce the moment only when it actually turns, and only bother asking twice a second.
    // A weather spell is three in-game hours; checking every frame is work for nothing and
    // showed up as slower frames under load rather than as anything visible.
    if (this.time.now - this.momentCheckedAt >= 500) {
      this.momentCheckedAt = this.time.now;
      const moment = this.momentNow();
      const key = `${moment.timeOfDay}/${moment.weather}`;
      if (key !== this.lastMoment) {
        this.lastMoment = key;
        EventBus.emitEvent('moment-changed', moment);
      }
    }
  }

  /**
   * Two fingers moving apart or together change the zoom a step at a time.
   *
   * Stepped rather than continuous, and the reference distance resets after every step, so a long
   * slow pinch keeps zooming instead of stopping once it has spent its threshold.
   */
  private updatePinch(): void {
    const [first, second] = [this.input.pointer1, this.input.pointer2];
    if (!first.isDown || !second.isDown) {
      this.pinchFrom = 0;
      return;
    }

    const spread = Phaser.Math.Distance.Between(first.x, first.y, second.x, second.y);
    if (this.pinchFrom === 0) {
      this.pinchFrom = spread;
      return;
    }

    const change = spread - this.pinchFrom;
    if (Math.abs(change) < PINCH_THRESHOLD) return;
    this.onZoom({ step: change > 0 ? 1 : -1 });
    this.pinchFrom = spread;
  }

  /**
   * Hide everything the camera cannot see.
   *
   * Run from `update`, but the sweep itself only happens when the window of visible tiles actually
   * changes -- which is once a step, not once a frame. Comparing four integers is what keeps this
   * from costing more than it saves.
   *
   * A generous margin: the camera pans smoothly between tiles and a tile revealed a frame late
   * would pop at the edge of the screen. Two tiles is more than a step can uncover.
   */
  private cullToCamera(): void {
    const view = this.cameras.main.worldView;
    if (view.width === 0) return;
    const margin = 2;
    const x0 = Math.floor(view.x / TILE_SIZE) - margin;
    const y0 = Math.floor(view.y / TILE_SIZE) - margin;
    const x1 = Math.ceil(view.right / TILE_SIZE) + margin;
    const y1 = Math.ceil(view.bottom / TILE_SIZE) + margin;

    const last = this.culled;
    if (last && last.x0 === x0 && last.y0 === y0 && last.x1 === x1 && last.y1 === y1) return;
    this.culled = { x0, y0, x1, y1 };

    for (const owned of this.tileOwned) {
      owned.sprite.visible =
        owned.x >= x0 && owned.x <= x1 && owned.y >= y0 && owned.y <= y1;
    }
  }

  update(): void {
    this.cullToCamera();
    this.moveShadow();
    this.updateVignette();
    // Before the movement guard: the light keeps changing while the player stands still, and it
    // keeps changing mid-step too.
    this.updateSky();
    this.updatePinch();
    this.updateSway();

    if (this.moving) return;

    // A key still held moves continuously; a key already released is honoured once, from the press
    // the listener caught. Held wins, so holding a direction does not queue up a backlog of steps.
    const held =
      (this.cursors.up.isDown || this.wasd.up.isDown ? [0, -1] : null) ??
      (this.cursors.down.isDown || this.wasd.down.isDown ? [0, 1] : null) ??
      (this.cursors.left.isDown || this.wasd.left.isDown ? [-1, 0] : null) ??
      (this.cursors.right.isDown || this.wasd.right.isDown ? [1, 0] : null);
    const delta = held ?? this.pendingStep;
    this.pendingStep = null;

    if (delta) {
      // Walking on purpose cancels a tap-walk, so the player is never fighting their own path.
      this.queuedPath = [];
      this.step({ x: this.at.x + delta[0]!, y: this.at.y + delta[1]! });
      return;
    }

    const next = this.queuedPath.shift();
    if (next) this.step(next);
  }

  private step(target: Point): void {
    const { width, height } = this.world;
    if (target.x < 0 || target.y < 0 || target.x >= width || target.y >= height) return;
    const tile = this.world.tiles[target.y]![target.x]!;
    if (!isWalkable(tile)) return;

    this.faceTowards(target.x - this.at.x, target.y - this.at.y);

    // Wetland and hills take longer to cross than open plains. `travelCost` sat unread in
    // data/biomes.json until now; this is the friction the design asks for — slower, never unsafe.
    const cost = travelCost(tile.biome) ?? 1;
    // The same cost buys the step twice: how long the tween takes on the screen, and how much of
    // the day the walking spends. The second is what keeps the sun honest.
    this.travelled += travelTimeMs(cost);
    // Tiredness slows the walk and nothing else. It never blocks a step, never makes ground
    // unwalkable and never reaches `canAdvance` -- see the invariants at the top of fatigue.ts.
    const pace = this.fatigueOn ? paceFor(this.fatigue()) : 1;
    this.leaveTrace(this.at, tile.biome);
    this.moving = true;
    this.at = target;
    this.updateAnimation();

    this.tweens.add({
      targets: this.player,
      x: target.x * TILE_SIZE + TILE_SIZE / 2,
      y: target.y * TILE_SIZE + TILE_SIZE - 2,
      duration: STEP_MS * cost * pace,
      ease: 'Sine.easeInOut',
      // Re-sorted at the start of the step rather than the end: he should be behind the grass of
      // the tile he is entering from the moment he begins to enter it.
      onStart: () => this.sortPlayer(target.y),
      onComplete: () => {
        this.moving = false;
        this.arriveAt(target);
        this.updateAnimation();
      }
    });
  }

  /**
   * The mark a step leaves behind: prints on sand, a splash on water.
   *
   * Left on the tile being *departed* rather than the one being entered, so the trail reads as
   * where the traveller has been rather than where he is standing.
   *
   * Sorted into the `underfoot` slot of the row it is left on, like moss and lily pads: a print is
   * the ground, not something on it. It was a fixed depth of 1 until now, which put every print
   * *below the terrain* of any row past the first -- a whole feature drawing under the map,
   * invisible except on the top row.
   *
   * It fades and destroys itself. Keeping a handle on every mark a long walk leaves would be a
   * slow leak of sprites nothing ever reads again.
   */
  private leaveTrace(from: Point, biome: Tile['biome']): void {
    const frame = traceFrameFor(biome);
    if (frame === null) return;
    const mark = this.add
      .image(from.x * TILE_SIZE + TILE_SIZE / 2, from.y * TILE_SIZE + TILE_SIZE / 2, OVERDRAW_SHEET, frame)
      .setDepth(depthFor(from.y, ROW_SLOT.underfoot))
      .setAlpha(0.7);
    this.tweens.add({
      targets: mark,
      alpha: 0,
      duration: TRACE_FADE_MS,
      ease: 'Quad.easeIn',
      onComplete: () => mark.destroy()
    });
  }

  private setFog(x: number, y: number, alpha: number, tween = false): void {
    const fog = this.fogSprites[y]?.[x];
    if (!fog || fog.alpha === alpha) return;
    this.tweens.killTweensOf(fog);
    if (!tween) {
      fog.setAlpha(alpha);
      return;
    }
    this.tweens.add({ targets: fog, alpha, duration: 420, ease: 'Quad.easeOut' });
  }

  /**
   * Lift the fog around the player, and let it settle back behind them.
   *
   * Three states rather than two: clear where the traveller is standing, dimmed where they have
   * been, dark where they have not. Ground already walked never goes fully dark again — the map
   * is a memory, not a flashlight — but letting it dim is what makes moving feel like moving.
   */
  private revealAround(at: Point): void {
    const nowVisible = new Set<string>();
    for (let dy = -SIGHT_RADIUS - 1; dy <= SIGHT_RADIUS + 1; dy += 1) {
      for (let dx = -SIGHT_RADIUS - 1; dx <= SIGHT_RADIUS + 1; dx += 1) {
        const x = at.x + dx;
        const y = at.y + dy;
        if (x < 0 || y < 0 || x >= this.world.width || y >= this.world.height) continue;
        const distance = Math.hypot(dx, dy);
        if (distance > SIGHT_RADIUS + 1) continue;
        const key = `${x},${y}`;
        this.discovered.add(key);
        if (distance <= SIGHT_RADIUS) {
          nowVisible.add(key);
          this.setFog(x, y, FOG_VISIBLE, true);
        } else {
          this.setFog(x, y, FOG_REMEMBERED, true);
        }
      }
    }

    for (const key of this.visible) {
      if (nowVisible.has(key)) continue;
      const [x, y] = key.split(',').map(Number);
      this.setFog(x!, y!, FOG_REMEMBERED, true);
    }
    this.visible = nowVisible;
  }

  private arriveAt(at: Point): void {
    this.placePlayer(at);
    this.revealAround(at);

    const tile: Tile = this.world.tiles[at.y]![at.x]!;
    const atLandmark = at.x === this.world.landmark.x && at.y === this.world.landmark.y;

    EventBus.emitEvent('tile-entered', {
      at,
      entry: describeTile(tile, this.world, this.momentNow()),
      surroundings: describeSurroundings(this.world, at),
      hint: landmarkHint(this.world, at),
      whereNext: whereNextHint(this.built.placed, at, this.discovered),
      fatigue: this.fatigueOn ? fatigueNote(this.fatigue()) : null,
      dusk: duskNote(lightLeft(this.travelled, this.startPhase, this.time.now)),
      shelter: this.shelterHere(),
      canCamp: this.canStopHere(),
      discovered: this.discovered.size,
      atLandmark
    });
    EventBus.emitEvent('journey-changed', { discovered: [...this.discovered] });

    // What is under foot, every time it changes. The UI decides whether that opens anything;
    // the scene only reports the ground, which is the division everywhere else in this file.
    const placed = poiAt(this.built, at);
    const here = placed?.poi.id ?? null;
    if (here !== this.standingOn) {
      this.standingOn = here;
      EventBus.emitEvent('standing-on', { poiId: here, fieldMapId: this.built.fieldMap.id });
    }

    // Arriving somewhere gets a beat: the camera settles and the traveller sits down. The landmark
    // is the end of the session and keeps the louder one; a place along the way gets the same
    // gesture, quieter. `arrival.ts` decides which; this only plays it.
    //
    // One code path for both, deliberately. The landmark had this inline and a place had nothing,
    // which is how the two drifted — and only one of them was reachable by a test.
    const place: ArrivalPlace | null = atLandmark
      ? { kind: 'landmark' }
      : placed
        ? { kind: 'poi', poiKind: placed.poi.kind }
        : null;

    if (place) this.playArrival(place, here);
  }

  /** Settle the camera and mark the place beaten. Nothing here decides — see `arrival.ts`. */
  private playArrival(place: ArrivalPlace, poiId: string | null): void {
    const key = beatKey(place, poiId);
    const beat = beatFor(place, !this.beaten.has(key));
    if (!beat) return;
    this.beaten.add(key);

    // Through `zoomChoice`, not `zoomTo` behind the camera's back.
    //
    // `applyCamera` recomputes the zoom from `zoomChoice ?? automatic` and calls `setZoom` on every
    // resize and every change of panel insets — so opening the journal mid-settle snapped the zoom
    // straight back. That was true of the landmark already; six places a map would have made it six
    // times as visible. Recording the choice means a resize during the beat re-applies the settled
    // zoom rather than undoing it.
    // The ceiling is relative to the fit now, so it has to be computed rather than read from a
    // constant — see MAX_ZOOM_FACTOR. `settleZoom` still clamps against it exactly as before.
    const fit = this.scale.gameSize.width / (TILE_SIZE * TILES_ACROSS);
    this.zoomChoice = settleZoom(this.cameras.main.zoom, beat, fit * MAX_ZOOM_FACTOR);
    this.cameras.main.zoomTo(this.zoomChoice, beat.settleMs, 'Sine.easeInOut');
    this.lastZoom = this.zoomChoice;
    EventBus.emitEvent('zoom-changed', { zoom: this.zoomChoice });

    if (beat.flash) {
      const [r, g, b] = beat.flash.rgb;
      this.cameras.main.flash(beat.flash.durationMs, r, g, b, false);
    }

    if (place.kind === 'landmark') {
      EventBus.emitEvent('landmark-reached', arrivalPage(this.world));
    } else if (poiId) {
      EventBus.emitEvent('poi-reached', { poiId, fieldMapId: this.built.fieldMap.id });
    }
  }
}
