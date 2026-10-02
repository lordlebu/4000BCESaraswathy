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
import { wanderersOn, wandererAt, type Wanderer } from '../../content/wanderers';
import { facingArt, hasPaintedArt, paintedKey } from '../wandererArt';
import { biomeFor } from '../../content/species';
import type { Facing } from '../player';
import type { World } from '../../world/types';

/** What the animals read of the scene. Live: a getter answers for the map shown now. */
export interface WandererHost {
  readonly world: World;
  readonly fieldMapId: string;
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
    for (const wanderer of wanderersOn(this.host.fieldMapId, this.host.world)) {
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
        name: wanderer.species.name,
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
    const home = biomeFor(wanderer.species.biomes[0] ?? 'river');
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
    const scale = paintedHeight(wanderer.id, side) / src.height;
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
        continue;
      }
      sprite.setVisible(true);
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
      }
    }
  }
}
