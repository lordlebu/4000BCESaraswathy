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
import { EventBus } from '../EventBus';
import {
  FEATURE_SHEET,
  FENCE_FRAME,
  FOG_TEXTURE,
  HUT_SHEET,
  HUT_VARIANTS,
  OVERDRAW_SHEET,
  LANDMARK_SHEET,
  PLACE_SHEET,
  TERRAIN_SHEET,
  TILE_SIZE,
  createTileTextures,
  featureFrame,
  landmarkFrame,
  loadTileSheets,
  overdrawFrame,
  placeFrame,
  swayFrame,
  tileFrame,
  traceFrameFor
} from '../tileTextures';
import { landmarkKindFor } from '../../content/landmarks';
import { tileHash } from '../../world/rng';
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
import { momentAt } from '../moment';
import { arrivalPage, describeSurroundings, describeTile, landmarkHint } from '../../content/journal';
import { travelCost } from '../../content/species';
import { isWalkable } from '../../world/generate';
import { buildFieldMap, poiAt, type FieldMapWorld } from '../../world/fieldMap';
import { fieldMap } from '../../content/places';
import { findPath } from '../../world/pathfind';
import type { Point, Tile, World } from '../../world/types';

/** How the fog reads: clear underfoot, dimmed where you have been, dark where you have not. */
const FOG_UNKNOWN = 0.92;
const FOG_REMEMBERED = 0.4;
const FOG_VISIBLE = 0;

/** How far the traveller can see. */
const SIGHT_RADIUS = 2;

/**
 * How long one sway takes, in milliseconds.
 *
 * Slow on purpose, and for the same reason the idle animation is: this is a game about a quiet
 * afternoon walk. Grass that flickers reads as wind damage. Two seconds is about the pace of a
 * breeze you would not comment on.
 */
const SWAY_PERIOD = 2000;

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

/** Beyond this the map reads as a few enormous squares rather than a country. */
const MAX_ZOOM = 4;

/**
 * And below this it is not a map, it is a chart.
 *
 * One, not two. The whole 36-tile world is narrower than a desktop viewport at zoom 1, so this is
 * as far back as a player can ever need to stand — it is the entire country at once. The floor used
 * to be "large enough that the world fills the screen", which on a 1280px desktop meant 2, and made
 * the widest view a player could reach about half the country. Standing back is most of the point
 * of a map, so the bounds now cope with a map smaller than its frame instead of forbidding one.
 */
const MIN_ZOOM = 1;

/**
 * Milliseconds per step on easy ground. `travelCost` from the biome data scales this.
 *
 * Twice what it was. At 170 the traveller crossed a tile of grassland faster than the field notes
 * beneath him could be read — and grassland is the common ground, so that was most of the walk. The
 * journal is the game; outrunning it is the one pace that cannot be right.
 */
const STEP_MS = 340;

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
  /** Tiles a hut already occupies, so the overdraw layer leaves them alone. */
  private builtOn = new Set<string>();
  private overdraw: { sprite: Phaser.GameObjects.Image; rest: number; sway: number; phase: number }[] = [];
  private fogSprites: Phaser.GameObjects.Image[][] = [];
  private player!: Phaser.GameObjects.Sprite;
  private at: Point = { x: 0, y: 0 };
  private discovered = new Set<string>();
  private visible = new Set<string>();
  /** The arrival page is written once per journey, not on every step taken at the landmark. */
  private arrived = false;
  private moving = false;
  private queuedPath: Point[] = [];
  private facing: Facing = 'down';
  /** A key press caught between frames, waiting for the next one to act on it. */
  private pendingStep: [number, number] | null = null;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  /** The day/night wash, drawn over the whole map. */
  private sky!: Phaser.GameObjects.Rectangle;
  /** Where in the day this journey opened — the player's own hour. */
  private startPhase = 0;
  /**
   * How much of the day the walking itself has spent, on top of the time that simply passes.
   *
   * Without this the sun answers only to the wall clock, and a traveller could cross the whole
   * country twice between breakfast and lunch. See `travelTimeMs`: thirty kilometres to the day.
   */
  private travelled = 0;
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
    this.arrived = false;
    this.tileSprites = [];
    this.fogSprites = [];
    this.overdraw = [];
    this.builtOn = new Set();
    this.queuedPath = [];
    this.moving = false;
    this.facing = 'down';
    this.travelled = 0;
    this.standingOn = null;
    this.lastMoment = '';
    this.momentCheckedAt = -Infinity;
    this.lastZoom = 0;
    // The map opens on the light of the hour the player is actually in, then drifts from there.
    // `?hour=21` overrides it, so the evening can be checked without waiting for the evening.
    this.startPhase = startPhaseFor(new URLSearchParams(window.location.search).get('hour'));
  }

  preload(): void {
    loadCharacterSheet(this, CHARACTERS.varuna.key, varunaUrl);
    loadTileSheets(this, {
      terrain: terrainUrl,
      landmarks: landmarksUrl,
      places: placesUrl,
      huts: hutsUrl,
      overdraw: overdrawUrl,
      features: featuresUrl
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
        tileRow.push(this.add.image(cx, cy, TERRAIN_SHEET, tileFrame(tile.biome)).setDepth(0));
        fogRow.push(
          this.add
            .image(cx, cy, FOG_TEXTURE)
            .setDisplaySize(TILE_SIZE, TILE_SIZE)
            .setTint(0x241a26)
            .setAlpha(FOG_UNKNOWN)
            .setDepth(10)
        );
      }
      this.tileSprites.push(tileRow);
      this.fogSprites.push(fogRow);
    }

    this.createSettlements();
    this.createOverdraw();
    this.createLandmark();

    // The authored places, marked. Under the fog on purpose: a point of interest is a thing
    // you find by walking there, not a waypoint handed to you at the start.
    //
    // Canon's archaeological sites have their own art; everything else keeps the diamond, which
    // is why `placeFrame` returns null rather than a fallback frame. A generic marker reads
    // better than the wrong building.
    for (const { poi, at } of this.built.placed) {
      const cx = at.x * TILE_SIZE + TILE_SIZE / 2;
      const frame = placeFrame(poi.id);
      if (frame !== null) {
        this.add
          .image(cx, at.y * TILE_SIZE + TILE_SIZE, PLACE_SHEET, frame)
          // Bottom-centre, so a tower stands on its tile and rises into the one above.
          .setOrigin(0.5, 1)
          // Above the huts at depth 4: Kavik's Tower stands inside the Lothal settlement, and a
          // hut drawn afterwards at the same depth would cover the thing the player came to see.
          .setDepth(6)
          .setName(`poi:${poi.id}`);
        continue;
      }
      this.add
        .text(cx, at.y * TILE_SIZE + TILE_SIZE / 2, '◇', {
          fontFamily: 'Georgia, serif',
          fontSize: `${Math.round(TILE_SIZE * 0.7)}px`,
          color: '#fff6df'
        })
        .setOrigin(0.5)
        .setDepth(5)
        .setAlpha(0.9)
        .setName(`poi:${poi.id}`);
    }

    this.createPlayer();

    // Above the fog and the player, so the light of the hour falls on everything. Origin at the
    // top-left corner rather than the centre so it lines up with the world without arithmetic.
    this.sky = this.add
      .rectangle(0, 0, pixelWidth, pixelHeight, 0xffffff, 0)
      .setOrigin(0, 0)
      .setDepth(30);
    this.updateSky();

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
   * Huts on the settlement tiles.
   *
   * Drawn as objects rather than into the ground tile, because a building baked into a repeating
   * texture appears once per tile forever, in a perfect grid — an endless orchard of identical
   * huts rather than a village. Four variants, picked per tile by the same `tileHash` the species
   * placement uses, so a seed still produces the same village twice.
   *
   * Not every settlement tile gets one: two in three keeps courtyards and paths open between them.
   */
  private createSettlements(): void {
    for (let y = 0; y < this.world.height; y += 1) {
      for (let x = 0; x < this.world.width; x += 1) {
        if (this.world.tiles[y]![x]!.biome !== 'settlement') continue;
        if (tileHash(this.world.seed, x, y, 'hut-present') % 3 === 0) continue;
        this.builtOn.add(`${x},${y}`);
        const variant = tileHash(this.world.seed, x, y, 'hut-variant') % HUT_VARIANTS;
        this.add
          .image(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE - 2, HUT_SHEET, variant)
          .setOrigin(0.5, 1)
          .setDepth(4);
      }
    }
  }

  /**
   * The layer the traveller walks into: grass, reeds, paddy, and the settlement fence.
   *
   * Depth 21 is the whole trick. Everything else on the map sits below the player at depth 20, so
   * he slides over a flat picture; one sprite above him and his legs go behind the blades. It is
   * the cheapest depth this world can buy.
   *
   * Two rules keep it from swallowing him. The art is short by construction -- nothing in the
   * sheet reaches higher than fifteen of the cell's thirty-two pixels, so it clears his head with
   * room to spare. And it is sparse: a third of eligible tiles stay bare, which leaves paths
   * through a field rather than a wall of green.
   *
   * The fence is different in kind. It is a boundary, not undergrowth, so it goes where settlement
   * meets open ground rather than being scattered -- and only on the *southern* edge, where a
   * traveller approaching from open country walks up behind it.
   */
  private createOverdraw(): void {
    const { width, height, seed } = this.world;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const biome = this.world.tiles[y]![x]!.biome;
        const cx = x * TILE_SIZE + TILE_SIZE / 2;
        const cy = y * TILE_SIZE + TILE_SIZE / 2;

        // A settlement tile with open ground to the south gets a fence along that edge.
        const southern = y + 1 < height ? this.world.tiles[y + 1]![x]!.biome : null;
        if (biome === 'settlement' && southern !== null && southern !== 'settlement') {
          this.add.image(cx, cy, OVERDRAW_SHEET, FENCE_FRAME).setDepth(21);
          continue;
        }

        // Nothing grows through a roof. The hut layer runs first and records where it built, so
        // paddy does not sprout across the thatch of the house it is planted beside.
        if (this.builtOn.has(`${x},${y}`)) continue;

        // A feature -- a tree, an anthill, a bee colony -- takes the tile instead of undergrowth,
        // and is rare enough that meeting one is an event. It may stand far taller than the common
        // overdraw because it is drawn offset to one side, so the traveller passes beside it rather
        // than behind it.
        const feature = featureFrame(
          biome,
          tileHash(seed, x, y, 'feature-present'),
          tileHash(seed, x, y, 'feature-pick')
        );
        if (feature !== null) {
          this.add.image(cx, cy, FEATURE_SHEET, feature).setDepth(21);
          continue;
        }

        if (tileHash(seed, x, y, 'overdraw-present') % 3 === 0) continue;
        const rest = overdrawFrame(biome, tileHash(seed, x, y, 'overdraw-scatter'));
        if (rest === null) continue;
        const sprite = this.add.image(cx, cy, OVERDRAW_SHEET, rest).setDepth(21);
        // Phase offset per tile, so a field ripples across rather than blinking in unison. The
        // sprite carries its own two frames so `update` needs no lookup.
        this.overdraw.push({
          sprite,
          rest,
          sway: swayFrame(rest),
          phase: tileHash(seed, x, y, 'overdraw-phase') % SWAY_PERIOD
        });
      }
    }
  }

  /**
   * Alternate every swaying sprite between its two frames.
   *
   * One pass over a flat array each frame, setting a frame index that is usually the one already
   * set -- Phaser skips the work when it has not changed, so this costs a comparison per tile
   * rather than a redraw. The phase offset is what stops a field looking like a single blinking
   * object; neighbouring tiles cross the halfway point at different moments.
   */
  private updateSway(): void {
    const now = this.time.now;
    for (const item of this.overdraw) {
      const leaning = ((now + item.phase) % SWAY_PERIOD) * 2 > SWAY_PERIOD;
      item.sprite.setFrame(leaning ? item.sway : item.rest);
    }
  }

  /** The destination, drawn as whatever kind of place the terrain called for. */
  private createLandmark(): void {
    const { landmark } = this.world;
    const frame = landmarkFrame(landmarkKindFor(landmark, this.world.seed).id);
    if (frame === null) return;
    this.add
      .image(landmark.x * TILE_SIZE + TILE_SIZE / 2, landmark.y * TILE_SIZE + TILE_SIZE, LANDMARK_SHEET, frame)
      .setOrigin(0.5, 1)
      .setDepth(5)
      .setName('landmark');
  }

  private createPlayer(): void {
    createCharacterAnimations(this, CHARACTERS.varuna.key);
    // Varuna stands taller than a tile, so he is anchored by the feet and allowed to overhang.
    // Scaled by a whole number — a fractional scale is what makes pixel art shimmer as it moves.
    this.player = this.add
      .sprite(0, 0, CHARACTERS.varuna.key, 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(PLAYER_FRAME.width, PLAYER_FRAME.height)
      .setDepth(20);
    this.player.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.updateAnimation();
    this.placePlayer(this.at);
  }

  /**
   * Play whatever the traveller should be doing: walking, standing, or sitting at the landmark.
   * Re-playing the animation already running would restart it every frame, so it is checked first.
   */
  private updateAnimation(): void {
    // Sitting is about where the traveller *is*, not whether they have ever arrived. `arrived`
    // stays true for the rest of the journey so the arrival page is written once; using it here
    // meant walking away from the landmark still played the seated frames.
    const atLandmark =
      this.at.x === this.world.landmark.x && this.at.y === this.world.landmark.y;
    const action = actionFor(this.moving, atLandmark);
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
      this.queuedPath = findPath(
        this.world.tiles,
        this.world.width,
        this.world.height,
        this.at,
        target,
        isWalkable
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

    // Fires on rotation as well as on a window resize, which is exactly when the zoom and the
    // follow offset both stop being right.
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.offEvent('new-journey', this.onNewJourney);
      EventBus.offEvent('resume-journey', this.onNewJourney);
      EventBus.offEvent('travel-to', this.onTravelTo);
      EventBus.offEvent('viewport-insets', this.onInsets);
      EventBus.offEvent('zoom', this.onZoom);
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
   * Whole steps only. Pixel art at a fractional scale crawls as the camera moves, so a smooth
   * pinch would look worse than a stepped one however nice the gesture felt.
   */
  private onZoom = ({ step }: { step: number | 'reset' }): void => {
    this.zoomChoice =
      step === 'reset'
        ? null
        : Phaser.Math.Clamp(Math.round(this.cameras.main.zoom + step), MIN_ZOOM, MAX_ZOOM);
    this.applyCamera();
  };

  private onResize = (): void => {
    this.applyCamera();
  };

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
    const wanted = Math.round(width / (TILE_SIZE * TILES_ACROSS));
    const automatic = Phaser.Math.Clamp(wanted, MIN_ZOOM, MAX_ZOOM);
    const zoom =
      this.zoomChoice === null ? automatic : Phaser.Math.Clamp(this.zoomChoice, MIN_ZOOM, MAX_ZOOM);
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

  update(): void {
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
    this.leaveTrace(this.at, tile.biome);
    this.moving = true;
    this.at = target;
    this.updateAnimation();

    this.tweens.add({
      targets: this.player,
      x: target.x * TILE_SIZE + TILE_SIZE / 2,
      y: target.y * TILE_SIZE + TILE_SIZE - 2,
      duration: STEP_MS * cost,
      ease: 'Sine.easeInOut',
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
   * where the traveller has been rather than where he is standing. Below him at depth 3, because
   * a footprint is on the ground, not over it -- unlike the grass, which is the point of depth 21.
   *
   * It fades and destroys itself. Keeping a handle on every mark a long walk leaves would be a
   * slow leak of sprites nothing ever reads again.
   */
  private leaveTrace(from: Point, biome: Tile['biome']): void {
    const frame = traceFrameFor(biome);
    if (frame === null) return;
    const mark = this.add
      .image(from.x * TILE_SIZE + TILE_SIZE / 2, from.y * TILE_SIZE + TILE_SIZE / 2, OVERDRAW_SHEET, frame)
      .setDepth(3)
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
      discovered: this.discovered.size,
      atLandmark
    });
    EventBus.emitEvent('journey-changed', { discovered: [...this.discovered] });

    // What is under foot, every time it changes. The UI decides whether that opens anything;
    // the scene only reports the ground, which is the division everywhere else in this file.
    const here = poiAt(this.built, at)?.poi.id ?? null;
    if (here !== this.standingOn) {
      this.standingOn = here;
      EventBus.emitEvent('standing-on', { poiId: here, fieldMapId: this.built.fieldMap.id });
    }

    // The arrival is the end of the session, so it gets its own beat: the camera settles, and the
    // written page goes up once rather than on every step taken while standing there.
    if (atLandmark && !this.arrived) {
      this.arrived = true;
      // Relative, not absolute. A fixed 1.25 was a zoom *out* on every desktop, where the fit is
      // 2 or 3 — the reward for a hundred-tile walk was the map pulling away from you.
      const settled = Math.min(this.cameras.main.zoom * 1.25, MAX_ZOOM + 0.5);
      this.cameras.main.zoomTo(settled, 900, 'Sine.easeInOut');
      this.cameras.main.flash(700, 255, 246, 213, false);
      EventBus.emitEvent('landmark-reached', arrivalPage(this.world));
    }
  }
}
