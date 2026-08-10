// The player sprite and its animations.
//
// `assets/varuna-overworld.png` is built by `tools/build-sprite-sheet.js` from the artist's
// full-size sheet: sixteen figures cropped, point-sampled down to the game's grid, and snapped to a
// shared 26-colour palette. 8.3 KB for the lot.
//
// `assets/mithra-overworld.png` is a second character on exactly the same layout, so anything here
// works for either — see `CHARACTERS`.

import Phaser from 'phaser';

/** One cell. Frames are bottom-aligned in the cell, so the feet sit on the anchor point. */
export const PLAYER_FRAME = { width: 26, height: 40 };

/**
 * The sheet is four rows of four, and the layout was measured rather than assumed:
 *
 * - the back row carries almost no skin-toned pixels, which is what identifies it;
 * - the two profile rows match each other at 71–78% when one is mirrored but only 52–61% as-is,
 *   so they are a genuine left/right pair rather than one row used twice;
 * - the face sits right of the body's centre in row 2 and left of it in row 3, which settles which
 *   is which.
 *
 * Within a row, frames 0 and 1 barely differ below the waist while 2 and 3 move the legs, so 0/1
 * are the passing pose and 2/3 are the contacts.
 */
const ROW = { down: 0, up: 4, right: 8, left: 12 } as const;

export type Facing = 'up' | 'down' | 'left' | 'right';

/**
 * Both profiles are drawn, so nothing is mirrored. Mirroring a hand-drawn walk moves the satchel
 * to the other shoulder, which reads as a different person on alternate steps.
 */
const FLIP_X = false;

/** Contact, pass, contact, pass — the classic four-frame walk, built from the row's own poses. */
const walkOrder = (row: number): number[] => [row + 2, row + 0, row + 3, row + 1];

/** Two near-identical standing poses, so idling breathes rather than freezes. */
const idleOrder = (row: number): number[] => [row + 0, row + 1];

export interface CharacterArt {
  /** Texture key, also the prefix for its animation keys. */
  key: string;
  /** Human name, for the journal and for debugging. */
  name: string;
}

export const CHARACTERS = {
  varuna: { key: 'varuna', name: 'Varuna' },
  mithra: { key: 'mithra', name: 'Mithra' }
} as const satisfies Record<string, CharacterArt>;

export type CharacterId = keyof typeof CHARACTERS;

const animKey = (character: string, action: string, facing: Facing): string =>
  `${character}-${action}-${facing}`;

export function loadCharacterSheet(scene: Phaser.Scene, key: string, url: string): void {
  if (scene.textures.exists(key)) return;
  scene.load.spritesheet(key, url, {
    frameWidth: PLAYER_FRAME.width,
    frameHeight: PLAYER_FRAME.height
  });
}

/**
 * Register every animation for a character. Safe to call again after a scene restart — Phaser keeps
 * animations on the game rather than the scene, so a second call would otherwise warn about
 * duplicate keys.
 *
 * Idles are slow on purpose. This is a game about walking somewhere quiet; a briskly bobbing
 * character would be at odds with everything else on the screen.
 */
export function createCharacterAnimations(scene: Phaser.Scene, key: string): void {
  const define = (action: string, facing: Facing, frames: number[], frameRate: number) => {
    const name = animKey(key, action, facing);
    if (scene.anims.exists(name)) return;
    scene.anims.create({
      key: name,
      frames: frames.map((frame) => ({ key, frame })),
      frameRate,
      repeat: -1
    });
  };

  for (const facing of ['down', 'up', 'left', 'right'] as const) {
    const row = ROW[facing];
    define('idle', facing, idleOrder(row), 1.2);
    // Roughly a frame per step at the pace the player actually walks.
    define('walk', facing, walkOrder(row), 7);
  }
}

/** The animation to play, and whether the sprite needs mirroring. */
export function animFor(
  character: string,
  facing: Facing,
  moving: boolean
): { key: string; flipX: boolean } {
  return { key: animKey(character, moving ? 'walk' : 'idle', facing), flipX: FLIP_X };
}

/** The facing implied by a step. */
export function facingFromStep(dx: number, dy: number, previous: Facing): Facing {
  if (dx > 0) return 'right';
  if (dx < 0) return 'left';
  if (dy > 0) return 'down';
  if (dy < 0) return 'up';
  return previous;
}
