// The player sprite and its animations.
//
// `assets/varuna-overworld.png` is built by `tools/build-sprite-sheet.js` from the artist's
// full-size sheet: twelve figures cropped, point-sampled down to the game's grid, and snapped to a
// shared 30-colour palette. 4.7 KB for all twelve.
//
// The sheet also carries four much larger figures for a zoomed-in view later; the build skips them
// by height (`SPRITE_MAX_HEIGHT`), so they can be pulled into their own sheet when that view exists.

import Phaser from 'phaser';

export const PLAYER_SHEET = 'varuna';

/** One cell. Frames are bottom-aligned in the cell, so the feet sit on the anchor point. */
export const PLAYER_FRAME = { width: 20, height: 30 };

/** Drawn at 2x, an exact integer scale — a fractional one makes pixel art shimmer as it moves. */
export const PLAYER_SCALE = 2;

/**
 * Which frame of the sheet is which posture.
 *
 * Frames are numbered left-to-right, top-to-bottom as they appear in
 * `assets/source/Varuna_final.png`:
 *
 * | # | Reading |
 * | --- | --- |
 * | 0, 1, 5 | facing the viewer, standing — 5 is the clearest, 1 has the feet apart |
 * | 2 | profile, facing right |
 * | 8, 11 | profile, facing left |
 * | 7, 9 | seen from behind — 9 has an arm out |
 * | 3, 4, 6, 10 | seated or crouched; 4 and 10 are holding something |
 *
 * ⚠ Read off the silhouettes rather than known from the brief, so worth a second opinion. Changing
 * a row here is the whole job — nothing else needs to move.
 *
 * The sheet has no true walk cycle: no direction carries a pair of frames that differ only in leg
 * position, so `walkSide` is a single frame and the traveller glides rather than strides. See the
 * "Missing keyframes" note in `docs/art-brief.md`.
 */
export const FRAMES = {
  /** Facing the viewer. Two frames so standing still has a little life in it. */
  idleDown: [5, 0],
  walkDown: [0, 1],
  /** Profile. Mirrored for leftward travel — 8 and 11 are held back until the reading is confirmed. */
  idleSide: [2],
  walkSide: [2],
  /** Seen from behind. */
  idleUp: [7],
  walkUp: [7, 9],
  /** Sitting — used at the landmark, where the journal invites the player to stay a while. */
  sit: [3, 4]
} as const;

export type Facing = 'up' | 'down' | 'left' | 'right';

export const ANIMS = {
  idleDown: 'varuna-idle-down',
  walkDown: 'varuna-walk-down',
  idleSide: 'varuna-idle-side',
  walkSide: 'varuna-walk-side',
  idleUp: 'varuna-idle-up',
  walkUp: 'varuna-walk-up',
  sit: 'varuna-sit'
} as const;

/** The animation to play, and whether the sprite needs mirroring. */
export function animFor(facing: Facing, moving: boolean, sitting: boolean): { key: string; flipX: boolean } {
  if (sitting) return { key: ANIMS.sit, flipX: false };
  switch (facing) {
    case 'left':
      return { key: moving ? ANIMS.walkSide : ANIMS.idleSide, flipX: true };
    case 'right':
      return { key: moving ? ANIMS.walkSide : ANIMS.idleSide, flipX: false };
    case 'up':
      return { key: moving ? ANIMS.walkUp : ANIMS.idleUp, flipX: false };
    case 'down':
    default:
      return { key: moving ? ANIMS.walkDown : ANIMS.idleDown, flipX: false };
  }
}

/** The facing implied by a step. */
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

/**
 * Register every animation. Safe to call again after a scene restart — Phaser keeps animations on
 * the game, not the scene, so a second call would otherwise warn about duplicate keys.
 *
 * Idles are slow on purpose. This is a game about walking somewhere quiet; a briskly bobbing
 * character would be at odds with everything else on the screen.
 */
export function createPlayerAnimations(scene: Phaser.Scene): void {
  const define = (key: string, frames: readonly number[], frameRate: number) => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: frames.map((frame) => ({ key: PLAYER_SHEET, frame })),
      frameRate,
      repeat: -1
    });
  };

  define(ANIMS.idleDown, FRAMES.idleDown, 1.4);
  define(ANIMS.idleSide, FRAMES.idleSide, 1.4);
  define(ANIMS.idleUp, FRAMES.idleUp, 1.4);
  // Roughly a frame per step at the pace the player actually walks.
  define(ANIMS.walkDown, FRAMES.walkDown, 6);
  define(ANIMS.walkSide, FRAMES.walkSide, 6);
  define(ANIMS.walkUp, FRAMES.walkUp, 6);
  define(ANIMS.sit, FRAMES.sit, 0.8);
}
