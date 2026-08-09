// The player sprite.
//
// `assets/varuna-walk.png` is built by `tools/build-sprite-sheet.js` from the artist's full-size
// renders: two frames, front and side, resampled to the game's grid and snapped to a 22-colour
// palette. 1.3 KB for both, against 418 KB for the single unprocessed figure it replaces.
//
// There is no back view yet, so walking away shows the front frame. That reads acceptably at this
// scale — the hat and robe carry the silhouette — and a third frame drops straight in here when
// the art arrives.

import Phaser from 'phaser';

export const PLAYER_SHEET = 'varuna';

/** One cell of the sheet. Frames are bottom-aligned in the cell, so the feet sit on the anchor. */
export const PLAYER_FRAME = { width: 32, height: 48 };

/** Frame indices, in the order `build-sprite-sheet.js` was given the files. */
export const enum PlayerFrame {
  Front = 0,
  Side = 1
}

export type Facing = 'up' | 'down' | 'left' | 'right';

/** Which frame to show, and whether it needs mirroring. */
export function frameFor(facing: Facing): { frame: PlayerFrame; flipX: boolean } {
  switch (facing) {
    case 'left':
      return { frame: PlayerFrame.Side, flipX: true };
    case 'right':
      return { frame: PlayerFrame.Side, flipX: false };
    // Walking away has no art of its own yet; the front frame stands in.
    case 'up':
    case 'down':
    default:
      return { frame: PlayerFrame.Front, flipX: false };
  }
}

/** The facing implied by a step. Sideways wins over vertical, because it has real art. */
export function facingFromStep(dx: number, dy: number, previous: Facing): Facing {
  if (dx > 0) return 'right';
  if (dx < 0) return 'left';
  if (dy > 0) return 'down';
  if (dy < 0) return 'up';
  return previous;
}

export function loadPlayerSheet(scene: Phaser.Scene, url: string): void {
  if (scene.textures.exists(PLAYER_SHEET)) return;
  scene.load.spritesheet(PLAYER_SHEET, url, {
    frameWidth: PLAYER_FRAME.width,
    frameHeight: PLAYER_FRAME.height
  });
}
