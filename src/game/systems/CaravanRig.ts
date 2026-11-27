import type Phaser from 'phaser';
import { caravanPhase, caravanStageAt, type Encampment } from '../../content/encampments';
import type { Point, World } from '../../world/types';
import { depthFor, ROW_SLOT } from '../frames';
import { SHADOW_TEXTURE, TILE_SIZE } from '../tileTextures';

const urls = import.meta.glob<string>('../../../assets/twins/caravan/*.png', {
  eager: true, query: '?no-inline&url', import: 'default'
});

export const caravanKey = (name: string) => `caravan-${name}`;
const vehicleArt = new Set(['croc', 'covered', 'open', 'croc-pose', 'croc-walk']);

export function loadCaravanArt(scene: Phaser.Scene): void {
  for (const [path, url] of Object.entries(urls)) {
    const name = path.split('/').at(-1)!.replace('.png', '');
    if (scene.textures.exists(caravanKey(name))) continue;
    if (vehicleArt.has(name)) {
      scene.load.spritesheet(caravanKey(name), url, { frameWidth: 112, frameHeight: 88 });
    } else if (name === 'enkidu-gestures') {
      scene.load.spritesheet(caravanKey(name), url, { frameWidth: 26, frameHeight: 40 });
    } else {
      scene.load.image(caravanKey(name), url);
    }
  }
}

export class CaravanRig {
  private readonly wagon: Phaser.GameObjects.Image;
  private readonly animal: Phaser.GameObjects.Image;
  private readonly shadows: readonly Phaser.GameObjects.Image[];
  private readonly harness: Phaser.GameObjects.Graphics;
  private readonly driver: Phaser.GameObjects.Image;
  private readonly cargo: Phaser.GameObjects.Image;

  constructor(private readonly scene: Phaser.Scene, private readonly camp: Encampment,
    private readonly campAnimal: Point) {
    const { wagon } = camp.caravan!;
    this.wagon = scene.add.image(0, 0, caravanKey(wagon)).setOrigin(0.5, 1).setScale(1.25).setName('caravan-wagon');
    this.animal = scene.add.image(0, 0, caravanKey('croc')).setOrigin(0.5, 1).setScale(1.35).setName('caravan-croc');
    this.harness = scene.add.graphics();
    this.shadows = [this.wagon, this.animal].map(() => scene.add.image(0, 0, SHADOW_TEXTURE).setDisplaySize(90, 15));
    this.driver = scene.add.image(0, 0, 'elamite-handler', 16).setOrigin(0.5, 1).setScale(1.4).setName('caravan-driver');
    this.cargo = scene.add.image(0, 0, caravanKey('storage')).setOrigin(0.5, 1).setScale(.34);
  }

  destroy(): void {
    for (const piece of [this.wagon, this.animal, this.harness, this.driver, this.cargo, ...this.shadows]) piece.destroy();
  }

  update(world: World, day: number, phase: number, seen: ReadonlySet<string>): void {
    const visit = this.camp.caravan!;
    const state = caravanStageAt(world, this.camp, day, phase);
    if (!state) return;
    const { stage, routeProgress } = state;
    const parked = stage === 'established' || stage === 'pitching' || stage === 'packing';
    const moving = stage === 'travelling' || stage === 'departure';
    const along = routeProgress * (visit.route.length - 1);
    const index = Math.min(Math.floor(along), visit.route.length - 2);
    const a = visit.route[index]!;
    const b = visit.route[index + 1]!;
    const direction = stage === 'departure' ? -1 : 1;
    const dx = (b.x - a.x) * direction, dy = (b.y - a.y) * direction;
    const center = { x: a.x + (b.x - a.x) * (along - index), y: a.y + (b.y - a.y) * (along - index) };
    const frame = dx > 0 ? 2 : dx < 0 ? 3 : dy < 0 ? 1 : 0;
    const stride = Math.sin(this.scene.time.now / 160) * (moving ? 4 : 1);
    const known = (p: Point) => seen.has(`${Math.round(p.x)},${Math.round(p.y)}`);
    const wagonAt = parked ? visit.route.at(-2)! : { x: center.x - dx * .52, y: center.y - dy * .52 };
    const animalAt = parked ? this.campAnimal : { x: center.x + dx * .52, y: center.y + dy * .52 };
    const wagonVisible = stage !== 'aftermath' && (known(center) || known(wagonAt));
    const animalVisible = stage !== 'aftermath' && (known(center) || known(animalAt));
    const place = (img: Phaser.GameObjects.Image, p: Point, visible: boolean, bob: number) => {
      img.setPosition((p.x + .5) * TILE_SIZE, (p.y + .94) * TILE_SIZE + bob)
        .setDepth(depthFor(Math.floor(p.y + .5), ROW_SLOT.walker) + p.y / world.height)
        .setVisible(visible);
    };
    place(this.wagon, wagonAt, wagonVisible, moving ? stride * .28 : 0);
    place(this.animal, animalAt, animalVisible, stride);
    this.wagon.setFrame(parked ? 3 : frame);
    const hour = (caravanPhase(world, phase) * 24 + 6) % 24;
    const animalFrame = hour >= 12 && hour < 15 ? 1 : hour < 9 || hour >= 17 ? 2 : 0;
    if (stage === 'established') this.animal.setTexture(caravanKey('croc-pose'), animalFrame);
    else if (moving) this.animal.setTexture(caravanKey('croc-walk'), frame * 4 + Math.floor(this.scene.time.now / 140) % 4);
    else this.animal.setTexture(caravanKey('croc'), frame);
    this.driver.setPosition(this.wagon.x + dx * 38, this.wagon.y - 52 + dy * 19)
      .setDepth(this.wagon.depth + (dy < 0 ? -.1 : .15))
      .setFrame(16 + frame).setVisible(wagonVisible && !parked);
    for (const [i, piece] of [this.wagon, this.animal].entries()) {
      this.shadows[i]!.setPosition(piece.x, piece.y - 4).setDepth(piece.depth - 1).setVisible(piece.visible);
    }
    this.cargo.setPosition(this.wagon.x + 12, this.wagon.y - 48).setDepth(this.wagon.depth + .1)
      .setVisible(wagonVisible && !parked && visit.wagon === 'open' && visit.cargoLayout === 1);
    this.harness.clear();
    if (!parked && wagonVisible && animalVisible) {
      this.harness.setDepth(Math.min(this.animal.depth, this.wagon.depth) - .1).lineStyle(3, 0x776046)
        .lineBetween(this.wagon.x + dx * 43, this.wagon.y - 26 + dy * 18,
          this.animal.x - dx * 42, this.animal.y - 36 - dy * 18);
    }
  }
}
