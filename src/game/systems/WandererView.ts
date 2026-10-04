// The animals that walk their own ground -- a wading whale between pools, a herd between grazings --
// as drawn on the map.
//
// **The second system out of `WorldScene`**, after `CampView.ts`, and moved the same way: as it was,
// with no change in behaviour. Where an animal is at an hour is `content/wanderers.ts`; which picture
// it is drawn from is `wandererArt.ts`; this puts the one at the other. An animal that is a property
// of a tile is still `species.ts` and is not drawn here.

import Phaser from 'phaser';
import { TILE_SIZE, paintedHeight, wandererMarkerKey } from '../tileTextures';
import { ROW_SLOT, depthFor } from '../frames';
import { isAlongside, wanderersOn, wandererAt, type Wanderer } from '../../content/wanderers';
import { EventBus } from '../EventBus';
import { facingArt, hasPaintedArt, paintedKey, walkArt, walkKey } from '../wandererArt';
import { biomeFor } from '../../content/species';
import type { Facing } from '../player';
import type { Point, World } from '../../world/types';

/** What the animals read of the scene. Live: a getter answers for the map shown now. */
export interface WandererHost {
  readonly world: World;
  readonly fieldMapId: string;
  /** Where the map's places landed, for a patrol kept near one (`content/wanderers.ts`). */
  readonly placed: readonly { poiId: string; at: Point }[];
  /** The player's tile, for coming alongside. */
  readonly at: Point;
}

export class WandererView {
  /**
   * The animals walking their own ground, and the sprites drawing them.
   *
   * Same shape and same bargain as the scene's travellers: the circuit is held because it is a fact
   * about this generated world, and the position is not, because `wandererAt` derives it from the
   * seed, the day and the hour and stores nothing.
   */
  private list: { wanderer: Wanderer; sprite: Phaser.GameObjects.Image }[] = [];

  /** The last phase the animals were moved for. Separate from the travellers' so neither gates the other. */
  private movedAt = -1;

  /** Where each one was last put, by id. Only those drawn this hour; a hidden one is not here. */
  private standing = new Map<string, Point>();

  /** Who the player is alongside now, so coming alongside is said once and not every tick. */
  private beside = new Set<string>();

  /** Which way each one faces and whether it is on the move, by id: what `animate` steps through. */
  private going = new Map<string, { facing: Facing; moving: boolean }>();

  /**
   * How long one step of a painted walk is shown, in milliseconds. Four steps make a stride of about
   * three quarters of a second: an ox's unhurried pace, which is the only walk painted so far.
   */
  static readonly STEP_MS = 190;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly host: WandererHost
  ) {}

  /**
   * Put the map's animals on their ground.
   *
   * **Drawn from a built texture rather than a sheet, and that is not a shortcut.** A character
   * sheet fits each figure to one 26x40 cell, and every frame of a wading whale is wider than it is
   * tall -- fitted by width it would come out a fifth the height of a person. `wandererMarkerKey`
   * draws the stand-in until a painting exists; see its own note for the bargain.
   */
  create(): void {
    for (const wanderer of wanderersOn(this.host.fieldMapId, this.host.world, this.host.placed)) {
      // The animal's own ground gives it its colour, so the marker belongs to the place it stands
      // in rather than being a colour somebody picked. Canon already carries one per biome.
      const sprite = this.scene.add
        .image(0, 0, this.texture(wanderer, 'right'))
        .setOrigin(0.5, 1)
        .setVisible(false);
      sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      sprite.setName(`wanderer:${wanderer.id}`);
      this.size(wanderer, sprite);
      this.list.push({ wanderer, sprite });
    }

    // **Exposed for the browser suite for the same reason `__travellers` is, and it is the half
    // that matters.** Every rule in `wanderers.ts` is proved under Node while this scene calls none
    // of them -- which is this codebase's signature fault, five times recorded. `e2e/wanderers.spec.ts`
    // reads this and fails the day `createWanderers` stops being called.
    (window as unknown as { __wanderers?: () => unknown[] }).__wanderers = () =>
      this.list.map(({ wanderer, sprite }) => ({
        id: wanderer.id,
        name: wanderer.name,
        vehicle: wanderer.vehicle,
        stops: wanderer.circuit.length,
        texture: sprite.texture.key,
        visible: sprite.visible,
        x: Math.round(sprite.x),
        y: Math.round(sprite.y),
        w: Math.round(sprite.displayWidth),
        h: Math.round(sprite.displayHeight)
      }));
  }

  /**
   * The texture a wanderer is drawn from: the painting if one exists, the stand-in otherwise.
   *
   * **The one place that decides, so art arriving is a file and not an edit.** Drop
   * `assets/wanderers/<species id>-<facing>.png` in and this returns it instead -- see
   * `wandererArt.ts` for the convention and the fallback chain, and `wandererMarkerKey` for what is
   * drawn until then.
   */
  private texture(wanderer: Wanderer, facing: Facing): string {
    const key = paintedKey(wanderer.id, facing);
    if (facingArt(wanderer.id, facing) && this.scene.textures.exists(key)) return key;
    const home = biomeFor(wanderer.ground[0] ?? 'river');
    // The stand-in only draws a side view, so a north or south heading borrows the nearer side --
    // the same fallback `facingArt` makes, kept here so the two cannot disagree about it.
    const side = facing === 'left' ? 'left' : 'right';
    return wandererMarkerKey(this.scene, wanderer.id, home?.color ?? '#5d7f86', side);
  }

  /**
   * How big a wanderer is drawn, painting or stand-in.
   *
   * **A painting is whatever size it was cut at, so it has to be told.** The stand-in is built at
   * `markerSize` already; a painted frame arrives at several hundred pixels. Its side view is
   * measured and scaled to the animal's length in tiles, and whichever facing is showing is drawn at
   * the height that gives -- `paintedHeight` in `frames.ts` holds the arithmetic, so a test can hold
   * it to the real art.
   *
   * **Scaled by height, not by fitting inside a box.** Fitting by the tighter ratio was the obvious
   * answer and is visibly wrong: a side view is long, so it hits the width bound and shrinks, while
   * the front view of the same animal is narrow and does not -- which drew a whale three times
   * bigger walking towards you than walking across. One animal is one size whichever way it faces.
   */
  private size(wanderer: Wanderer, sprite: Phaser.GameObjects.Image): void {
    if (!hasPaintedArt(wanderer.id)) return;
    const src = sprite.texture.getSourceImage() as { width: number; height: number };
    if (!src?.width || !src?.height) return;
    const sideKey = paintedKey(wanderer.id, 'right');
    const side = this.scene.textures.exists(sideKey)
      ? (this.scene.textures.get(sideKey).getSourceImage() as { width: number; height: number })
      : src;
    // A step of a painted walk is scaled as its facing's still is, not to the box on its own: the
    // steps differ by a spear-tip in height, and fitting each would make the wagon pulse as it rolls.
    const stillKey = sprite.texture.key.replace(/:\d+$/, '');
    const still = this.scene.textures.exists(stillKey)
      ? (this.scene.textures.get(stillKey).getSourceImage() as { width: number; height: number })
      : src;
    const scale = paintedHeight(wanderer.id, side) / still.height;
    sprite.setDisplaySize(Math.round(src.width * scale), Math.round(src.height * scale));
  }

  /**
   * Move the animals to where the hour says they are.
   *
   * **Visible when resting, which is the one place this deliberately differs from a traveller.** A
   * person who has arrived somewhere is hidden, because they belong in the place panel rather than
   * standing on the roof of the building. An animal has no panel to be in and no building to stand
   * on: hiding it at its stop would mean the whale exists only while crossing between pools, and
   * coming alongside one is the whole of the quest.
   */
  update(phase: number, day: number): void {
    if (this.list.length === 0) return;
    const step = Math.floor(phase * 100);
    if (step === this.movedAt) return;
    this.movedAt = step;

    for (const { wanderer, sprite } of this.list) {
      const where = wandererAt(this.host.world, wanderer, day, phase);
      if (!where) {
        sprite.setVisible(false);
        this.standing.delete(wanderer.id);
        this.going.delete(wanderer.id);
        continue;
      }
      sprite.setVisible(true);
      this.standing.set(wanderer.id, where.at);
      sprite.setPosition(
        where.at.x * TILE_SIZE + TILE_SIZE / 2,
        where.at.y * TILE_SIZE + TILE_SIZE - 2
      );
      // Sorted by row like everything else standing on the ground, so an animal south of the player
      // passes in front and one north of them passes behind.
      sprite.setDepth(depthFor(where.at.y, ROW_SLOT.walker));
      // Facing is the marker itself rather than a flip, because the texture is cached per facing --
      // see `wandererMarkerKey`. Kept as it was while standing still, so a resting animal does not
      // snap round to face east the moment it stops.
      // **Four facings now that the art has four.** Kept as it was while standing still, so a
      // resting animal does not snap round to face east the moment it stops. Never flipped: both
      // the paintings and the stand-in are drawn per facing, and a flip on top would mirror an
      // animal that is already facing the right way.
      if (where.heading) {
        const facing: Facing =
          where.heading === 'west'
            ? 'left'
            : where.heading === 'east'
              ? 'right'
              : where.heading === 'north'
                ? 'up'
                : 'down';
        const next = this.texture(wanderer, facing);
        if (sprite.texture.key !== next) {
          sprite.setTexture(next);
          this.size(wanderer, sprite);
        }
        this.going.set(wanderer.id, { facing, moving: true });
      } else {
        // Standing: back to the still of whichever way it was facing, so a walk stopped mid-stride
        // does not freeze on a lifted hoof.
        const was = this.going.get(wanderer.id);
        if (was?.moving) {
          this.going.set(wanderer.id, { facing: was.facing, moving: false });
          const still = this.texture(wanderer, was.facing);
          if (sprite.texture.key !== still) {
            sprite.setTexture(still);
            this.size(wanderer, sprite);
          }
        }
      }
    }
    this.reportBeside();
  }

  /**
   * Tell React when the player comes alongside one, once per meeting.
   *
   * Asked after the animals move and after the player does, since either can bring them together --
   * the same two moments `TravellerView.reportNearby` is asked at. A meeting ends when they part, so
   * walking away and back is a second one; what React makes of it is React's (the Sinauli wagon's
   * card comes once a journey).
   */
  reportBeside(): void {
    const now = new Set<string>();
    for (const { wanderer } of this.list) {
      const at = this.standing.get(wanderer.id);
      if (!at || !isAlongside(at, this.host.at)) continue;
      now.add(wanderer.id);
      if (this.beside.has(wanderer.id)) continue;
      EventBus.emitEvent('wanderer-alongside', { id: wanderer.id, vehicle: wanderer.vehicle, at: this.host.at });
    }
    this.beside = now;
  }

  /**
   * Step a painted walk along while it moves. Every frame, from the scene's `update`, because a stride
   * on the half-second gate would read as a slide-show; only a wanderer painted walking and on the
   * move is touched, so the cost is a texture swap every `STEP_MS` for the one wagon.
   */
  animate(now: number): void {
    for (const { wanderer, sprite } of this.list) {
      const go = this.going.get(wanderer.id);
      if (!go?.moving || !sprite.visible) continue;
      const steps = walkArt(wanderer.id, go.facing);
      if (steps.length === 0) continue;
      const step = Math.floor(now / WandererView.STEP_MS) % steps.length;
      const key = walkKey(wanderer.id, go.facing, step);
      if (sprite.texture.key === key || !this.scene.textures.exists(key)) continue;
      sprite.setTexture(key);
      this.size(wanderer, sprite);
    }
  }
}
