// The strait's traffic, drawn: the outrigger crossing, the fishing boats working, the kites on their
// ropes, and the whale calf coming up to breathe. And the kites at Dwarka's caravan camp.
//
// **The sixth system out of `WorldScene`**, and the first that was never in it. Where everything is
// lives in `content/strait.ts`, pure and tested; which frame is which lives in `straitArt.ts`, the
// builder's numbers; this puts the one at the other, every frame.
//
// The owner's asks, as they are met here:
//
//   - **Sway slowly, up and down slightly, with water round it like the wading.** A boat bobs two
//     pixels on a three-second swell, rounded to whole pixels so it never shimmers at this game's
//     NEAREST filtering. Its bottom few pixels are cropped at the surface and the wading's own ring
//     sits on the waterline, so the hull is *in* the water the way a wading figure is.
//   - **The boats and the line.** Ships and the whale are drawn on the water, at depth 99: above the
//     sea tiles (0) and under every row-sorted thing (100 and up), the rail included -- so wherever
//     a ship crosses the line the rail is drawn over it and it passes beneath, as canon says.
//   - **Kites on a rope, their shadows far below.** Kites fly just under the fog (2000): above
//     everything on the islands, still hidden over ground not yet seen. The rope sags a little,
//     drawn from the island's edge to the kite's nose, and the shadow -- the kite's own silhouette,
//     darkened and flattened -- lies two tiles below on the water.
//   - **The whale disappears and emerges slowly.** It rises out of the surface over five seconds,
//     spouts while it is up, and sinks over five more; the rest of the time it is under.
//
// Measured, not guessed, before it went in: `docs/rendering.md` says a frame costs what it paints,
// and everything here painted at once is about an eighth more pixels than a bare frame. The
// browser check in `e2e/strait.spec.ts` asks that it is all on the map.

import Phaser from 'phaser';
import { rippleKey, TILE_SIZE } from '../tileTextures';
import { STRAIT_DEPTH } from '../frames';
import { straitFrame, straitKey } from '../straitArt';
import {
  KITE_HEIGHT,
  fishingAt,
  kiteAt,
  shipAt,
  straitOn,
  whaleAt,
  type Strait,
  type StraitFacing
} from '../../content/strait';
import type { Point, World } from '../../world/types';

/** On the water, and in the air: see `STRAIT_DEPTH` in `frames.ts` for why these two. */
const ON_THE_WATER = STRAIT_DEPTH.water;
const IN_THE_AIR = STRAIT_DEPTH.air;
/** A boat's swell: how far it rises and falls, in pixels, and how long one swell takes. */
const SWELL_PX = 2;
const SWELL_MS = 3200;
/** How many pixels of each hull are under the surface. */
const SINK = { ship: 10, boat: 6, whale: 0 };
/** Where a kite flown aloft takes its line: this far down its upright frame, the collar under the body. */
const BRIDLE = 0.5;

/** What the strait reads of the scene. Live: the getters answer for the map shown now. */
export interface StraitHost {
  readonly world: World;
  readonly fieldMapId: string;
  readonly placed: readonly { poiId: string; at: Point }[];
}

interface Floating {
  sprite: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Image;
}

interface Flying {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  rope: Phaser.GameObjects.Graphics;
}

export class StraitView {
  private plan: Strait | null = null;
  private ship: Floating | null = null;
  private boats: Floating[] = [];
  private kites: Flying[] = [];
  private whale: { back: Phaser.GameObjects.Image; spout: Phaser.GameObjects.Image; ring: Phaser.GameObjects.Image } | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly host: StraitHost
  ) {}

  /** Lay the map's traffic out. Nothing at all on a map without any. */
  create(): void {
    this.plan = straitOn(this.host.world, this.host.fieldMapId, this.host.placed);
    if (!this.plan) return;
    const ring = () => this.scene.add.image(0, 0, rippleKey(this.scene)).setDepth(ON_THE_WATER).setVisible(false);
    const image = (name: string, depth: number) => {
      const img = this.scene.add.image(0, 0, straitKey(name)).setDepth(depth).setVisible(false);
      img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      return img;
    };
    if (this.plan.lane !== null) this.ship = { sprite: image('ship-kelpfang', ON_THE_WATER), ring: ring() };
    this.boats = this.plan.loops.map((loop) => ({ sprite: image(`${loop.id}-right-0`, ON_THE_WATER), ring: ring() }));
    this.kites = this.plan.kites.map((kite) => {
      const name = `${kite.id}-right-0`;
      // Phaser 4 sets the colour and the mode apart: a FILL tint is the silhouette, not a darkening.
      const shadow = image(name, ON_THE_WATER - 0.5).setTint(0x0b1a24).setTintMode(Phaser.TintModes.FILL).setAlpha(0.24);
      return { sprite: image(name, IN_THE_AIR), shadow, rope: this.scene.add.graphics().setDepth(IN_THE_AIR - 0.1) };
    });
    if (this.plan.whaleSpots.length > 0) {
      this.whale = {
        back: image('whale-back', ON_THE_WATER).setOrigin(0.5, 1),
        spout: image('whale-spout', ON_THE_WATER + 0.2).setOrigin(0.5, 1),
        ring: ring()
      };
    }
  }

  /**
   * Move everything for this instant: `days` is the journey's clock (the ship and the boats keep the
   * day's timetable, like the travellers), `nowMs` the scene's own (the swell, the wind and the
   * whale are presentation, like the sky).
   */
  update(days: number, nowMs: number): void {
    if (!this.plan) return;
    const swell = (offset: number) => Math.round(SWELL_PX * Math.sin(((nowMs + offset) / SWELL_MS) * Math.PI * 2));

    if (this.ship) {
      const at = shipAt(this.host.world, this.plan, days);
      if (!at) this.hide(this.ship);
      else this.float(this.ship, 'ship-kelpfang', at.x, at.y, at.facing === 'left', SINK.ship, swell(0), 0.95);
    }

    this.plan.loops.forEach((loop, i) => {
      const boat = this.boats[i]!;
      const at = fishingAt(loop, days);
      const name = boatFrame(loop.id, at.facing, nowMs + i * 450);
      // The side views are wide and the ends narrow; the ring follows the hull it is under.
      const across = at.facing === 'left' || at.facing === 'right' ? 0.8 : 0.95;
      this.float(boat, name, at.x, at.y, false, SINK.boat, swell(1100 * (i + 1)), across);
    });

    this.plan.kites.forEach((kite, i) => this.fly(this.kites[i]!, kite.id, kiteAt(kite, nowMs / 1000), nowMs + i * 130));

    if (this.whale) {
      const w = whaleAt(this.plan, nowMs / 1000);
      if (!w) {
        this.whale.back.setVisible(false);
        this.whale.spout.setVisible(false);
        this.whale.ring.setVisible(false);
      } else this.surface(w.at, w.up, w.spout);
    }
  }

  /** What is on the map, for `e2e/strait.spec.ts`: never a picture, only that things are there. */
  report(): { ship: boolean; boats: number; kites: number; ropes: number; whale: boolean } {
    return {
      ship: Boolean(this.ship?.sprite.visible),
      boats: this.boats.filter((b) => b.sprite.visible).length,
      kites: this.kites.filter((k) => k.sprite.visible).length,
      ropes: this.kites.filter((k) => k.rope.visible).length,
      whale: Boolean(this.whale)
    };
  }

  private hide(f: Floating): void {
    f.sprite.setVisible(false);
    f.ring.setVisible(false);
  }

  /**
   * A boat on the water at tile `x`, `y` (fractional between tiles): its hull's middle on the tile's
   * waterline, the bottom `sink` pixels cropped away, the ring on the surface, and the whole of it
   * risen or dropped by the swell.
   */
  private float(f: Floating, name: string, x: number, y: number, flip: boolean, sink: number, rise: number, across: number): void {
    const frame = straitFrame(name);
    if (!frame) return;
    const key = straitKey(name);
    if (f.sprite.texture.key !== key) f.sprite.setTexture(key);
    const waterline = y * TILE_SIZE + TILE_SIZE * 0.78;
    const anchorX = flip ? frame.width - frame.x : frame.x;
    f.sprite
      .setVisible(true)
      .setFlipX(flip)
      .setOrigin(anchorX / frame.width, 1)
      .setCrop(0, 0, frame.width, frame.height - sink)
      .setPosition(Math.round(x * TILE_SIZE + TILE_SIZE / 2), Math.round(waterline + sink + rise));
    f.ring
      .setVisible(true)
      .setDisplaySize(Math.round(frame.width * across), Math.round(TILE_SIZE * 0.22))
      .setPosition(Math.round(x * TILE_SIZE + TILE_SIZE / 2), Math.round(waterline));
  }

  /** A kite at its place in the wind, its rope from the island's edge to its nose, its shadow below. */
  private fly(f: Flying, id: string, k: ReturnType<typeof kiteAt>, nowMs: number): void {
    // The streamers flutter between the two frames painted for it.
    const name = `${id}-${k.facing}-${Math.floor(nowMs / 260) % 2}`;
    const frame = straitFrame(name);
    if (!frame || !frame.nose) return;
    const key = straitKey(name);
    if (f.sprite.texture.key !== key) {
      f.sprite.setTexture(key);
      f.shadow.setTexture(key);
    }
    const depth = k.aloft ? STRAIT_DEPTH.aloft : IN_THE_AIR;
    if (f.sprite.depth !== depth) {
      f.sprite.setDepth(depth);
      f.rope.setDepth(depth - 0.1);
    }
    const cx = Math.round(k.x * TILE_SIZE);
    const cy = Math.round(k.y * TILE_SIZE);
    f.sprite.setVisible(true).setOrigin(frame.x / frame.width, frame.y / frame.height).setPosition(cx, cy);
    f.shadow
      .setVisible(true)
      .setOrigin(0.5, 0.5)
      .setScale(1, 0.55)
      .setPosition(cx + Math.round(TILE_SIZE * 0.2), cy + KITE_HEIGHT * TILE_SIZE);
    // The rope: from where it is tied to the kite's nose, sagging a little under its own weight.
    const fromX = k.tieX * TILE_SIZE;
    const fromY = k.tieY * TILE_SIZE;
    // Aloft the nose points at the sky, so the line goes to the bridle under the body instead: the
    // foot of the frame's body, where the streamers start, a little over half way down.
    const toX = k.aloft ? cx : cx + (frame.nose.x - frame.x);
    const toY = k.aloft ? cy + Math.round(frame.height * BRIDLE) - frame.y : cy + (frame.nose.y - frame.y);
    const sag = TILE_SIZE * 0.35;
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2 + sag;
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i <= 12; i += 1) {
      const u = i / 12;
      points.push(
        new Phaser.Math.Vector2(
          (1 - u) * (1 - u) * fromX + 2 * (1 - u) * u * midX + u * u * toX,
          (1 - u) * (1 - u) * fromY + 2 * (1 - u) * u * midY + u * u * toY
        )
      );
    }
    f.rope.clear().setVisible(true).lineStyle(2, 0x3a2a1c, 0.9).strokePoints(points);
  }

  /** The whale at `at`, `up` of its back clear of the surface, and `spout` of its spout standing. */
  private surface(at: Point, up: number, spout: number): void {
    const whale = this.whale!;
    const back = straitFrame('whale-back');
    const plume = straitFrame('whale-spout');
    if (!back || !back.blowhole || !plume) return;
    const shown = Math.max(1, Math.round(back.height * up));
    const cx = Math.round(at.x * TILE_SIZE + TILE_SIZE / 2);
    const waterline = Math.round(at.y * TILE_SIZE + TILE_SIZE * 0.78);
    // Rising out of the water rather than fading in on top of it: only the top `shown` rows are
    // drawn, and their bottom is always the surface.
    whale.back
      .setVisible(true)
      .setCrop(0, 0, back.width, shown)
      .setAlpha(Math.min(1, up * 1.4))
      .setPosition(cx, waterline + (back.height - shown));
    whale.ring
      .setVisible(true)
      .setAlpha(0.4 + 0.5 * up)
      .setDisplaySize(Math.round(back.width * (0.6 + 0.35 * up)), Math.round(TILE_SIZE * 0.24))
      .setPosition(cx, waterline);
    if (spout <= 0) {
      whale.spout.setVisible(false);
      return;
    }
    const left = cx - back.width / 2;
    const top = waterline - back.height;
    whale.spout
      .setVisible(true)
      .setAlpha(spout)
      .setScale(1, 0.35 + 0.65 * spout)
      .setPosition(Math.round(left + back.blowhole.x), Math.round(top + back.blowhole.y));
  }
}

/** Which frame of a fishing boat, by its sail colour, its heading and the time. */
function boatFrame(id: string, facing: StraitFacing, nowMs: number): string {
  // Side views have two frames of sail, the stern three; the bow-on view is one painting.
  if (facing === 'down') return `${id}-down-0`;
  if (facing === 'up') return `${id}-up-${Math.floor(nowMs / 900) % 3}`;
  return `${id}-${facing}-${Math.floor(nowMs / 700) % 2}`;
}
