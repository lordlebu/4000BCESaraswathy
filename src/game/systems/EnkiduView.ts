import type Phaser from 'phaser';
import { ENKIDU_ID, enkiduDry, enkiduHome } from '../../content/enkidu';
import { orthogonalNeighbours } from '../../world/rivers';
import type { Point, World } from '../../world/types';
import { EventBus } from '../EventBus';
import { depthFor, ROW_SLOT } from '../frames';
import { animFor, facingFromStep, figureScale, type Facing } from '../player';
import { SHADOW_TEXTURE, TILE_SIZE } from '../tileTextures';

export class EnkiduView {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly home: Point | null;
  private position: Point | null = null;
  private previous: Point | null = null;
  private facing: Facing = 'down';
  private near = false;
  private following = false;
  private greetingUntil = 0;
  private waitUntil = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly world: World,
    landing: Point, occupied: readonly Point[]) {
    this.home = enkiduHome(world, landing, occupied);
    this.sprite = scene.add.sprite(0, 0, 'enkidu').setName('companion:enkidu')
      .setOrigin(0.5, 1).setScale(figureScale(TILE_SIZE)).setVisible(false);
    this.shadow = scene.add.image(0, 0, SHADOW_TEXTURE).setDisplaySize(86, 21).setVisible(false);
    this.sprite.setInteractive({ useHandCursor: true });
    this.sprite.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      if (!this.selectionTile()) return;
      event.stopPropagation();
      EventBus.emitEvent('traveller-tapped', { travellerId: ENKIDU_ID });
    });
  }

  report() {
    return { at: this.position, visible: this.sprite.visible, following: this.following };
  }

  selectionTile(): Point | null {
    return this.sprite.visible ? this.position : null;
  }

  selection() {
    const at = this.selectionTile();
    return at ? { at, sprite: this.sprite } : null;
  }

  waitForPlayer(): Point | null {
    const at = this.selectionTile();
    if (at) this.waitUntil = this.scene.time.now + 8_000;
    return at;
  }

  update(player: Point, discovered: ReadonlySet<string>, following: boolean, canFollow: boolean, resting: boolean, previouslyRecruited: boolean, guest: Point | null): void {
    resting = following && resting;
    const previous = this.previous;
    if (this.following !== following) {
      this.position = null;
      this.following = following;
    }
    this.previous = player;
    const adjacent = (p: Point) => Math.abs(p.x - player.x) + Math.abs(p.y - player.y) === 1;
    let destination = previouslyRecruited ? this.home : guest;
    if (guest && !following && this.position && this.scene.time.now < this.waitUntil) destination = this.position;
    if (following) {
      destination = null;
      if (canFollow && enkiduDry(this.world, player)) {
        destination = previous && adjacent(previous) && enkiduDry(this.world, previous) ? previous
          : this.position && adjacent(this.position) ? this.position
          : orthogonalNeighbours(player, this.world.width, this.world.height).find((p) => enkiduDry(this.world, p)) ?? null;
      }
    }
    const shown = !!destination && (following || discovered.has(`${destination.x},${destination.y}`));
    this.sprite.setVisible(shown);
    this.shadow.setVisible(shown);
    const near = shown && !!destination && Math.max(Math.abs(destination.x - player.x), Math.abs(destination.y - player.y)) <= 1;
    if (near !== this.near) {
      this.near = near;
      if (near && !following) this.greetingUntil = this.scene.time.now + 1100;
    }
    if (!destination) {
      this.position = null;
      return;
    }
    const prior = this.position;
    const moved = !prior || destination.x !== prior.x || destination.y !== prior.y;
    if (moved) {
      this.position = destination;
      this.scene.tweens.killTweensOf(this.sprite);
      const x = (destination.x + 0.5) * TILE_SIZE;
      const y = (destination.y + 1) * TILE_SIZE - 3;
      this.sprite.setDepth(depthFor(destination.y, ROW_SLOT.walker));
      if (prior && (following || guest) && Math.abs(prior.x - destination.x) + Math.abs(prior.y - destination.y) === 1) {
        this.facing = facingFromStep(destination.x - prior.x, destination.y - prior.y, this.facing);
        this.scene.tweens.add({ targets: this.sprite, x, y, duration: 230 });
      } else {
        this.sprite.setPosition(x, y);
      }
    }
    this.shadow.setPosition(this.sprite.x, this.sprite.y - 1).setDepth(this.sprite.depth - 1);
    const now = this.scene.time.now;
    const still = !this.scene.tweens.isTweening(this.sprite);
    const gesture = !resting && still
      ? now < this.greetingUntil ? 2 : now % 11_000 < 450 ? 3 : now % 3900 < 145 ? 1 : null
      : null;
    if (gesture !== null && this.facing === 'down') {
      this.sprite.stop().setTexture('caravan-enkidu-gestures', gesture);
      return;
    }
    if (this.sprite.texture.key !== 'enkidu') this.sprite.setTexture('enkidu', 0);
    const animation = animFor('enkidu', resting ? 'down' : this.facing,
      this.scene.tweens.isTweening(this.sprite) ? 'walk' : resting ? 'sit' : 'idle');
    this.sprite.setFlipX(animation.flipX).play(animation.key, true);
  }
}
