// The player sprite and its animations.
//
// `assets/varuna-overworld.png` is built by `tools/build-sprite-sheet.js` from the artist's
// full-size sheet: sixteen figures cropped, point-sampled down to the game's grid, and snapped to a
// small palette. 14 KB for the lot.
//
// The palette is per-character, not shared: Varuna's 30 colours and Mithra's 26 have none in
// common. That is the design rather than an oversight — each figure is a tight tonal ramp around
// one hue, so at 26x40 it is hue that tells one person from another.
//
// `assets/mithra-overworld.png` is a second character on exactly the same layout, so anything here
// works for either — see `CHARACTERS`.

import Phaser from 'phaser';

/** One cell. Frames are bottom-aligned in the cell, so the feet sit on the anchor point. */
export const PLAYER_FRAME = { width: 26, height: 40 };

/**
 * The sheet is two source images concatenated — a walk sheet then a sitting sheet, each four rows
 * of four — and both layouts were measured rather than assumed:
 *
 * - the back row carries almost no skin-toned pixels (5 against ~115), which is what identifies it;
 * - the two profile rows match each other at 71–78% when one is mirrored but only 52–61% as-is,
 *   so they are a genuine left/right pair rather than one row used twice;
 * - the face sits right of the body's centre in one profile row and left of it in the other, which
 *   settles which is which.
 *
 * Within a walking row, frames 0 and 1 barely differ below the waist while 2 and 3 move the legs,
 * so 0/1 are the passing pose and 2/3 are the contacts.
 */
const WALK_ROW = { down: 0, up: 4, right: 8, left: 12 } as const;

/**
 * Sitting is **one frame a facing**, not four.
 *
 * It was four -- `{ down: 16, up: 20, right: 24, left: 28 }` -- back when Varuna's sitting art was
 * drawn as a full 4x4 and he was the only character. The sheets built from the new art give one
 * pose per direction instead, which is enough: a seated figure has nowhere to walk to, and the
 * second frame of an idle exists to breathe rather than to move.
 *
 * **This is the constant that has to agree with `tools/characters.json`.** A sheet is 20 frames --
 * sixteen walking, four sitting -- and `build-characters.js --check` refuses one that is short.
 * When the old four-frame layout outlived the art, Phaser warned twelve times a boot that
 * "Texture varuna has no frame 25" and every test still passed, because a missing frame is a
 * console warning rather than a thrown error.
 */
const SIT_ROW = { down: 16, up: 17, right: 18, left: 19 } as const;

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
    const walk = WALK_ROW[facing];
    define('idle', facing, idleOrder(walk), 1.2);
    // Roughly a frame per step at the pace the player actually walks.
    define('walk', facing, walkOrder(walk), 7);

    // One frame, so there is nothing to cycle. Kept as an animation rather than a static frame so
    // `animFor` returns the same shape for all three actions and the scene needs no special case.
    define('sit', facing, [SIT_ROW[facing]], 0.9);
  }
}

export type Action = 'idle' | 'walk' | 'sit';

/** The animation to play, and whether the sprite needs mirroring. */
export function animFor(
  character: string,
  facing: Facing,
  action: Action
): { key: string; flipX: boolean } {
  return { key: animKey(character, action, facing), flipX: FLIP_X };
}

/**
 * What the traveller is doing.
 *
 * Moving wins. Sitting used to take priority, on the reasoning that arriving is the end of the
 * walk — but the flag stayed true for the rest of the journey, so leaving the landmark slid the
 * traveller across the map still cross-legged. Whatever else is true, someone in motion is not
 * sitting down.
 */
export function actionFor(moving: boolean, sitting: boolean): Action {
  if (moving) return 'walk';
  return sitting ? 'sit' : 'idle';
}

/** The facing implied by a step. */
export function facingFromStep(dx: number, dy: number, previous: Facing): Facing {
  if (dx > 0) return 'right';
  if (dx < 0) return 'left';
  if (dy > 0) return 'down';
  if (dy < 0) return 'up';
  return previous;
}
