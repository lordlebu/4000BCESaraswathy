import Phaser from 'phaser';
import { TILE_SIZE } from './tileTextures';

export const COURTYARD_SHADOW = 'twins:harappa-neem-shadow';
const MASK_WIDTH = 64;
const MASK_HEIGHT = 32;
const FOOT_X = 19;
const FOOT_Y = 8;
// Above the courtyard surfaces and roads, below row-sorted objects and actors.
const COURTYARD_SHADOW_DEPTH = 80;

/** Project the approved neem silhouette onto the courtyard once per texture manager. */
export function addCourtyardShadow(scene: Phaser.Scene, neem: Phaser.GameObjects.Image): Phaser.GameObjects.Image | null {
  if (!scene.textures.exists(COURTYARD_SHADOW)) {
    const mask = scene.textures.createCanvas(COURTYARD_SHADOW, MASK_WIDTH, MASK_HEIGHT);
    if (!mask) return null;

    const context = mask.getContext();
    const frame = neem.frame;
    context.imageSmoothingEnabled = false;
    // A 48px tree on the logical ground pixel grid, flattened and projected southeast.
    context.setTransform(.70, .09, -.50, -.28, 26.2, 19.28);
    context.drawImage(frame.source.image as CanvasImageSource,
      frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, 0, 0, 48, 48);
    context.resetTransform();
    context.globalCompositeOperation = 'source-in';
    context.fillStyle = '#483b2c';
    context.fillRect(0, 0, MASK_WIDTH, MASK_HEIGHT);
    context.globalCompositeOperation = 'source-over';
    mask.refresh();
    mask.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  return scene.add.image(neem.x, neem.y - 12, COURTYARD_SHADOW)
    .setOrigin(FOOT_X / MASK_WIDTH, FOOT_Y / MASK_HEIGHT)
    .setDisplaySize(TILE_SIZE * 2, TILE_SIZE)
    .setAlpha(.28)
    .setDepth(COURTYARD_SHADOW_DEPTH)
    .setName(COURTYARD_SHADOW);
}
