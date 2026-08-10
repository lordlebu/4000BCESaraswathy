// The map: everything the player sees on the canvas.
//
// This is the only file in the project that knows Phaser exists, apart from `PhaserGame.tsx` and
// `tileTextures.ts`. World generation, species lookup and journal prose all live in `world/` and
// `content/`, which run under plain Node — so the tests exercise the real game logic and swapping
// engine versions touches this folder alone.

import Phaser from 'phaser';
import varunaUrl from '../../../assets/varuna-overworld.png';
import { EventBus } from '../EventBus';
import { FOG_TEXTURE, TILE_SIZE, createTileTextures, tileTextureKey } from '../tileTextures';
import {
  PLAYER_FRAME,
  PLAYER_SCALE,
  PLAYER_SHEET,
  animFor,
  createPlayerAnimations,
  facingFromStep,
  loadPlayerSheet,
  type Facing
} from '../player';
import { phaseAt, skyAt, startPhaseFor } from '../dayNight';
import { arrivalPage, describeSurroundings, describeTile, landmarkHint } from '../../content/journal';
import { travelCost } from '../../content/species';
import { generateWorld, isWalkable } from '../../world/generate';
import { findPath } from '../../world/pathfind';
import type { Point, Tile, World } from '../../world/types';

/** How the fog reads: clear underfoot, dimmed where you have been, dark where you have not. */
const FOG_UNKNOWN = 0.92;
const FOG_REMEMBERED = 0.4;
const FOG_VISIBLE = 0;

/** How far the traveller can see. */
const SIGHT_RADIUS = 2;

/** Milliseconds per step on easy ground. `travelCost` from the biome data scales this. */
const STEP_MS = 170;

export interface WorldSceneData {
  seed: string;
  discovered?: string[];
}

export class WorldScene extends Phaser.Scene {
  private world!: World;
  private tileSprites: Phaser.GameObjects.Image[][] = [];
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
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  /** The day/night wash, drawn over the whole map. */
  private sky!: Phaser.GameObjects.Rectangle;
  /** Where in the day this journey opened — the player's own hour. */
  private startPhase = 0;

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
    this.queuedPath = [];
    this.moving = false;
    this.facing = 'down';
    // The map opens on the light of the hour the player is actually in, then drifts from there.
    // `?hour=21` overrides it, so the evening can be checked without waiting for the evening.
    this.startPhase = startPhaseFor(new URLSearchParams(window.location.search).get('hour'));
  }

  preload(): void {
    loadPlayerSheet(this, varunaUrl);
  }

  create(data: WorldSceneData): void {
    createTileTextures(this);
    this.world = generateWorld({ seed: data.seed });
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
        tileRow.push(this.add.image(cx, cy, tileTextureKey(tile.biome)).setDepth(0));
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

    this.createPlayer();

    // Above the fog and the player, so the light of the hour falls on everything. Origin at the
    // top-left corner rather than the centre so it lines up with the world without arithmetic.
    this.sky = this.add
      .rectangle(0, 0, pixelWidth, pixelHeight, 0xffffff, 0)
      .setOrigin(0, 0)
      .setDepth(30);
    this.updateSky();

    this.cameras.main.setBounds(0, 0, pixelWidth, pixelHeight);
    this.cameras.main.setBackgroundColor('#1b1420');
    this.cameras.main.setZoom(1);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
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

  private createPlayer(): void {
    createPlayerAnimations(this);
    // Varuna stands taller than a tile, so he is anchored by the feet and allowed to overhang.
    // Scaled by a whole number — a fractional scale is what makes pixel art shimmer as it moves.
    this.player = this.add
      .sprite(0, 0, PLAYER_SHEET, 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(PLAYER_FRAME.width * PLAYER_SCALE, PLAYER_FRAME.height * PLAYER_SCALE)
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
    const { key, flipX } = animFor(this.facing, this.moving, this.arrived);
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

    EventBus.onEvent('new-journey', this.onNewJourney);
    EventBus.onEvent('resume-journey', this.onNewJourney);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.offEvent('new-journey', this.onNewJourney);
      EventBus.offEvent('resume-journey', this.onNewJourney);
      this.input.off(Phaser.Input.Events.POINTER_UP);
    });
  }

  private onNewJourney = (payload: { seed: string; discovered?: string[] }): void => {
    this.scene.restart({ seed: payload.seed, discovered: payload.discovered ?? [] });
  };

  /** Repaint the wash for the current hour. Cheap enough to run every frame. */
  private updateSky(): void {
    const sky = skyAt(phaseAt(this.time.now, this.startPhase));
    this.sky.setFillStyle(sky.colour, sky.alpha);
  }

  update(): void {
    // Before the movement guard: the light keeps changing while the player stands still, and it
    // keeps changing mid-step too.
    this.updateSky();

    if (this.moving) return;

    const held =
      (this.cursors.up.isDown || this.wasd.up.isDown ? 'up' : null) ??
      (this.cursors.down.isDown || this.wasd.down.isDown ? 'down' : null) ??
      (this.cursors.left.isDown || this.wasd.left.isDown ? 'left' : null) ??
      (this.cursors.right.isDown || this.wasd.right.isDown ? 'right' : null);

    if (held) {
      // A key press cancels a tap-walk, so the player is never fighting their own path.
      this.queuedPath = [];
      const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[held] as [number, number];
      this.step({ x: this.at.x + delta[0], y: this.at.y + delta[1] });
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
      entry: describeTile(tile, this.world),
      surroundings: describeSurroundings(this.world, at),
      hint: landmarkHint(this.world, at),
      discovered: this.discovered.size,
      atLandmark
    });
    EventBus.emitEvent('journey-changed', { discovered: [...this.discovered] });

    // The arrival is the end of the session, so it gets its own beat: the camera settles, and the
    // written page goes up once rather than on every step taken while standing there.
    if (atLandmark && !this.arrived) {
      this.arrived = true;
      this.cameras.main.zoomTo(1.25, 900, 'Sine.easeInOut');
      this.cameras.main.flash(700, 255, 246, 213, false);
      EventBus.emitEvent('landmark-reached', arrivalPage(this.world));
    }
  }
}
