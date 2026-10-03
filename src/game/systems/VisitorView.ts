// People who walk up to the traveller: somebody who appears a few tiles off on ground that joins,
// walks over and stands beside you, and then React opens what they have to say.
//
// **The fifth system out of `WorldScene`**, moved as it was with no change in behaviour. React
// decides who comes and when (`approach` on the bus); this draws the walk and says `approached`
// when they arrive.

import Phaser from 'phaser';
import { EventBus } from '../EventBus';
import { TILE_SIZE } from '../tileTextures';
import { ROW_SLOT, depthFor } from '../frames';
import { animFor, facingFromStep, frameOf, travellerScale } from '../player';
import { findPath } from '../../world/pathfind';
import { isWalkable } from '../../world/generate';
import type { Point, World } from '../../world/types';

/**
 * How long somebody coming over takes per tile, in milliseconds. Unhurried: a person walking up to
 * say hello, not a courier. Four tiles at this pace is about a second and a half.
 */
const VISITOR_STEP_MS = 360;

/** Where a visitor stands on a tile: centred, feet two pixels up from its bottom edge, as travellers do. */
const visitorX = (p: Point): number => p.x * TILE_SIZE + TILE_SIZE / 2;
const visitorY = (p: Point): number => p.y * TILE_SIZE + TILE_SIZE - 2;

/** What a visitor reads of the scene. Live: a getter answers for the map shown now. */
export interface VisitorHost {
  readonly world: World;
  /** The player's tile. */
  readonly at: Point;
  /** The loop's raw frame time, unclamped. See `update`. */
  loopNow(): number;
}

export class VisitorView {
  /**
   * People who walked up to the traveller, standing where they stopped. A new view is made in
   * `init`, for the reason the travellers' is: a restart reuses the scene.
   */
  list: {
    npcId: string;
    sheet: string;
    sprite: Phaser.GameObjects.Sprite;
    /** The walk in flight, on the loop's clock: the tiles, and when it set out. Null once arrived. */
    walk: { route: Point[]; start: number; leg: number } | null;
  }[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly host: VisitorHost
  ) {}

  /**
   * Somebody comes over: appear a little way off, walk up to stand beside the traveller, then say so.
   *
   * **A few tiles away, on ground that joins.** Rings of three to six tiles are searched in a fixed
   * order for a walkable tile with a path in, so the same arrival looks the same on every machine,
   * and nobody appears across a river they cannot cross. The walk stops one tile short: they stand
   * beside you, not on you. If nothing joins -- an island of one tile -- they appear beside you.
   */
  approach(npcId: string, sheet: string): void {
    const route = this.route();
    // **Out on the water with no shore near, nobody walks up.** The conversation still opens -- React
    // is waiting for `approached` -- but nobody is drawn standing in the sea to have it.
    if (!route) {
      EventBus.emitEvent('approached', { npcId });
      return;
    }
    const frame = frameOf(sheet);
    const scale = travellerScale(TILE_SIZE);
    const start = route[0]!;
    const sprite = this.scene.add
      .sprite(visitorX(start), visitorY(start), sheet, 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(frame.width * scale, frame.height * scale)
      .setDepth(depthFor(start.y, ROW_SLOT.walker));
    sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    sprite.setName(`visitor:${npcId}`);
    this.list.push({ npcId, sheet, sprite, walk: { route, start: this.host.loopNow(), leg: -1 } });
    // A route of one tile is somebody who appears already beside you; `updateVisitors` lands them on
    // the next frame like anybody else, so there is one way to arrive.
  }

  /**
   * Carry everybody who is coming over one frame further, and land them when their time is up.
   *
   * **On the loop's clock, not a tween's -- the carriage's lesson, learned twice.** This was a chain
   * of tweens first, and a tween advances by Phaser's *smoothed* delta, which credits a stalled
   * frame with no more than the last sane one. Under load a boot on the Narmada draws about a frame a
   * second, so a 360 ms step took tens of seconds: measured, 28% of the first step done after two and
   * a half seconds, and `e2e/happenings.spec.ts` gave up on her at fifteen, on a CI runner and on
   * this machine with four workers. `updateRide` records the same fault on the Lodestone Line.
   *
   * `game.loop.now` is the raw frame time, unclamped, so she arrives after her
   * `VISITOR_STEP_MS` a tile however few frames are drawn -- a slow machine sees her cover more
   * ground between frames, not take longer. Her walk animation and row sorting follow the leg she
   * is on.
   */
  update(): void {
    for (const visitor of this.list) {
      const walk = visitor.walk;
      if (!walk) continue;
      const { route } = walk;
      const elapsed = this.host.loopNow() - walk.start;
      const legs = route.length - 1;
      const leg = Math.floor(elapsed / VISITOR_STEP_MS);
      if (leg >= legs) {
        // Arrived. Stand on the last tile, face the traveller, and tell React to open the conversation.
        const last = route[legs]!;
        const before = route[legs - 1] ?? last;
        visitor.sprite.setPosition(visitorX(last), visitorY(last)).setDepth(depthFor(last.y, ROW_SLOT.walker));
        const facing = facingFromStep(this.host.at.x - last.x, this.host.at.y - last.y, facingFromStep(last.x - before.x, last.y - before.y, 'down'));
        const { key, flipX } = animFor(visitor.sheet, facing, 'idle');
        visitor.sprite.play(key, true).setFlipX(flipX);
        visitor.walk = null;
        EventBus.emitEvent('approached', { npcId: visitor.npcId });
        continue;
      }
      const from = route[leg]!;
      const to = route[leg + 1]!;
      const t = (elapsed - leg * VISITOR_STEP_MS) / VISITOR_STEP_MS;
      visitor.sprite.setPosition(
        visitorX(from) + (visitorX(to) - visitorX(from)) * t,
        visitorY(from) + (visitorY(to) - visitorY(from)) * t
      );
      if (leg !== walk.leg) {
        // A new leg: turn to face it, and sort into the row being walked into.
        walk.leg = leg;
        const { key, flipX } = animFor(visitor.sheet, facingFromStep(to.x - from.x, to.y - from.y, 'down'), 'walk');
        visitor.sprite.play(key, true).setFlipX(flipX);
        visitor.sprite.setDepth(depthFor(Math.max(from.y, to.y), ROW_SLOT.walker));
      }
    }
  }

  /**
   * The tiles somebody walks to come and stand beside the traveller, starting where they appear.
   *
   * **The traveller may be on the water now**, in the dugout on the shallows, where nobody can
   * stand. Then they walk to the nearest shore tile beside the hull and stop *on* it; with no shore
   * within two tiles there is no route at all, and `approach` opens the conversation unseen. Before
   * the shallows, the fallback below put the visitor on the traveller's own tile -- harmless on
   * ground, and somebody standing in the open sea on water.
   */
  private route(): Point[] | null {
    const { tiles, width, height } = this.host.world;
    const here = tiles[this.host.at.y]?.[this.host.at.x];
    if (!here || !isWalkable(here)) return this.toShore();
    for (const r of [4, 3, 5, 6]) {
      for (let dy = -r; dy <= r; dy += 1) {
        for (let dx = -r; dx <= r; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const from = { x: this.host.at.x + dx, y: this.host.at.y + dy };
          const tile = tiles[from.y]?.[from.x];
          if (!tile || !isWalkable(tile)) continue;
          const walked = findPath(tiles, width, height, from, this.host.at, isWalkable);
          // `findPath` leaves out where it starts and ends on the goal; stop one tile short of it.
          if (walked.length < 2 || walked.length > r * 2 + 2) continue;
          return [from, ...walked.slice(0, -1)];
        }
      }
    }
    return [this.host.at];
  }

  /** The way to the shore beside a traveller out on the water, ending on it; null if none is near. */
  private toShore(): Point[] | null {
    const { tiles, width, height } = this.host.world;
    let shore: Point | null = null;
    for (const r of [1, 2]) {
      for (let dy = -r; dy <= r && !shore; dy += 1) {
        for (let dx = -r; dx <= r && !shore; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const at = { x: this.host.at.x + dx, y: this.host.at.y + dy };
          const tile = tiles[at.y]?.[at.x];
          if (tile && isWalkable(tile)) shore = at;
        }
      }
      if (shore) break;
    }
    if (!shore) return null;
    for (const r of [4, 3, 5, 6]) {
      for (let dy = -r; dy <= r; dy += 1) {
        for (let dx = -r; dx <= r; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const from = { x: shore.x + dx, y: shore.y + dy };
          const tile = tiles[from.y]?.[from.x];
          if (!tile || !isWalkable(tile)) continue;
          const walked = findPath(tiles, width, height, from, shore, isWalkable);
          if (walked.length < 1 || walked.length > r * 2 + 2) continue;
          return [from, ...walked];
        }
      }
    }
    return [shore];
  }
}
