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

// **Type-only, and that is what keeps this file testable.** CLAUDE.md lists `player.ts` among the
// files in `game/` that import no Phaser so `test/` can cover them, and that was true of the
// intent and false of the code: a value import pulls in the engine, which reaches for a real 2D
// canvas on load and so runs under neither Node nor jsdom. `Phaser` appears here only as the type
// of a scene being handed in, so `import type` says exactly that and disappears at compile time.
import type Phaser from 'phaser';
import { type Look, lookKey, recolourTable } from '../content/looks';
import { recolourPixels } from './recolour';
import { SHARED_FRAME } from './characters';



/**
 * One cell. Frames are bottom-aligned in the cell, so the feet sit on the anchor point.
 *
 * The shared cell; a sheet may be built at its own (`CharacterArt.frame`, `frameOf`), and then is
 * loaded, cut and drawn at that size. The player's five all use this one.
 */
export const PLAYER_FRAME = SHARED_FRAME;

/**
 * The grid the figures were drawn against: a 26x40 frame inside a 32-pixel cell.
 *
 * Named rather than written `/ 32` at each use, because two call sites scale a figure and they have
 * to agree about what they are scaling from.
 */
export const FIGURE_CELL = 32;

/**
 * How much bigger than its art a figure is drawn, on this tile size.
 *
 * **Whole numbers only, and that is the whole reason this is a function.** A fractional scale is
 * what makes pixel art shimmer as it moves -- the same argument the ground's textures make -- so
 * this floors rather than fits, and never goes below 1.
 */
export function figureScale(tileSize: number): number {
  return Math.max(1, Math.floor(tileSize / FIGURE_CELL));
}

/**
 * How much smaller everybody else on the road is drawn than the person you are.
 *
 * **Two, because two is the only answer that keeps the scale whole.** At a 128 tile the player is
 * drawn at 4x -- 104x160 pixels -- and halving that is 2x, or 52x80. A quarter would be 1x: the art
 * at native size, 26 pixels across a 128-pixel tile, which reads as a bird rather than as a person
 * and is also the point at which the figure stops being legible at all. Anything between the two is
 * a fractional scale and shimmers.
 *
 * The reason they are smaller is not modesty about other people: it is that every traveller carries
 * a `conveyance` and at the player's size there is nowhere to draw one. 104x160 pixels covers a 128
 * tile outright, so the mount would be behind the rider whatever order it went in. The figure gives
 * the animal room *before* the animal exists, which is the order this has to happen in -- no vehicle
 * sheet is loaded by anything today.
 */
export const TRAVELLER_SHRINK = 2;

/** The scale everybody else on the road is drawn at. Whole, for `figureScale`'s reason. */
export function travellerScale(tileSize: number): number {
  return Math.max(1, Math.floor(figureScale(tileSize) / TRAVELLER_SHRINK));
}

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

/**
 * **A seated side view is the left profile, mirrored for right.** Frame 18 is meant to face right,
 * and on no sheet did it: looked at by eye at 8x beside each character's walking profiles, four of
 * the five players have two left-facing seated frames, and Varuna's pair was swapped. Nobody saw it
 * until the dugout, where he sat facing the stern of a boat going the other way.
 *
 * The walk is not mirrored (see `FLIP_X`), because a satchel changing shoulder every other step
 * reads as a different person. A seated figure does not step, so there is no alternation to see.
 */
const SEATED_PROFILE = SIT_ROW.left;
export const sitFrame = (facing: Facing): { frame: number; flipX: boolean } =>
  facing === 'left' || facing === 'right'
    ? { frame: SEATED_PROFILE, flipX: facing === 'right' }
    : { frame: SIT_ROW[facing], flipX: false };

export type Facing = 'up' | 'down' | 'left' | 'right';

/**
 * Both walking profiles are drawn, so no walk is mirrored. Mirroring a hand-drawn walk moves the
 * satchel to the other shoulder, which reads as a different person on alternate steps.
 */
const FLIP_X = false;

/** Contact, pass, contact, pass — the classic four-frame walk, built from the row's own poses. */
const walkOrder = (row: number): number[] => [row + 2, row + 0, row + 3, row + 1];

/** Frames in a walk cycle, and the rate they were authored at. */
export const WALK_FRAMES = 4;
export const WALK_FPS = 7;

/**
 * How fast to run the walk so the feet keep up with the ground.
 *
 * **A fixed frame rate cannot match a variable step.** The cycle is four frames at 7fps, so it
 * takes 571ms; a step across plains takes 425ms and a step through wetland twice that. At a fixed
 * rate the legs and the ground disagree on every tile but the one the rate happened to suit, which
 * is what makes a walk read as skating.
 *
 * So the cycle is scaled to the step: one full stride per tile, whatever the tile costs. Slow
 * ground now slows the legs as well as the traveller, which is the reading `travelCost` always
 * wanted -- wading looks like wading rather than like the same walk playing over slower movement.
 *
 * Clamped, because a pathological duration should degrade to a strange-looking walk rather than to
 * a blur or a freeze.
 */
export function walkTimeScale(stepMs: number): number {
  if (!Number.isFinite(stepMs) || stepMs <= 0) return 1;
  const cycleMs = (WALK_FRAMES / WALK_FPS) * 1000;
  return Math.min(2, Math.max(0.5, cycleMs / stepMs));
}

/** Two near-identical standing poses, so idling breathes rather than freezes. */
const idleOrder = (row: number): number[] => [row + 0, row + 1];

// The cast lives in `characters.ts`, which imports no Phaser so it can be tested under Node.
// Re-exported here because everything that draws a character already imports this file.
export {
  CHARACTERS,
  TRAVELLER_ART,
  characterFor,
  everyCharacter,
  everySheet,
  frameOf,
  type CharacterArt,
  type CharacterId
} from './characters';

const animKey = (character: string, action: string, facing: Facing): string =>
  `${character}-${action}-${facing}`;

export function loadCharacterSheet(
  scene: Phaser.Scene,
  key: string,
  url: string,
  frame: { width: number; height: number } = PLAYER_FRAME
): void {
  if (scene.textures.exists(key)) return;
  scene.load.spritesheet(key, url, {
    frameWidth: frame.width,
    frameHeight: frame.height
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
    // The base rate. `walkTimeScale` stretches it to the step actually being taken, so this is the
    // rate for a step of average cost rather than the rate every step runs at.
    define('walk', facing, walkOrder(walk), WALK_FPS);

    // One frame, so there is nothing to cycle. Kept as an animation rather than a static frame so
    // `animFor` returns the same shape for all three actions and the scene needs no special case.
    define('sit', facing, [sitFrame(facing).frame], 0.9);
  }
}

/**
 * A traveller body re-dyed to one look, as a texture of its own. Returns the key to draw with.
 *
 * **Built once per distinct look, at runtime, from the sheet already loaded.** Three bodies times
 * four skins times fifty-six dye pairs is far too many sheets to build and ship, and every one of
 * them would be a PNG in the bundle -- where this is a canvas the size of one sheet, made only for
 * the handful of people actually on the map. The bundle does not grow by a byte.
 *
 * Falls back to the undyed body if anything is missing, because a stranger in the painter's own
 * colours is a working game and a missing texture is a green box.
 */
export function dyeSheet(
  scene: Phaser.Scene,
  baseKey: string,
  look: Look,
  frame: { width: number; height: number } = PLAYER_FRAME
): string {
  const key = lookKey(look);
  if (scene.textures.exists(key)) return key;
  if (!scene.textures.exists(baseKey)) return baseKey;

  const source = scene.textures.get(baseKey).getSourceImage() as { width: number; height: number };
  const { width, height } = source;
  const canvas = scene.textures.createCanvas(key, width, height);
  const context = canvas?.getContext();
  if (!canvas || !context) return baseKey;

  context.drawImage(source as CanvasImageSource, 0, 0);
  const pixels = context.getImageData(0, 0, width, height);
  recolourPixels(pixels.data, recolourTable(look));
  context.putImageData(pixels, 0, 0);

  // The same cells `loadCharacterSheet` cuts, numbered the same way, so every animation and frame
  // index that works on the body works on its dyed copy unchanged.
  const frames = Math.floor(width / frame.width);
  for (let i = 0; i < frames; i += 1) {
    canvas.add(i, 0, i * frame.width, 0, frame.width, frame.height);
  }
  canvas.refresh();
  createCharacterAnimations(scene, key);
  return key;
}

/**
 * Release a dyed sheet and every animation cut from it.
 *
 * **Both, or neither.** Animations live on the game rather than the scene, and each holds the
 * frames of the texture it was made from. Removing only the texture leaves `walk` and `idle` naming
 * frames that no longer exist -- and `createCharacterAnimations` skips a key that exists, so the
 * same look rebuilt on a return visit would play the dead ones.
 */
export function forgetSheet(scene: Phaser.Scene, key: string): void {
  for (const action of ['idle', 'walk', 'sit']) {
    for (const facing of ['down', 'up', 'left', 'right'] as const) scene.anims.remove(animKey(key, action, facing));
  }
  if (scene.textures.exists(key)) scene.textures.remove(key);
}

export type Action = 'idle' | 'walk' | 'sit';

/** The animation to play, and whether the sprite needs mirroring. */
export function animFor(
  character: string,
  facing: Facing,
  action: Action
): { key: string; flipX: boolean } {
  const flipX = action === 'sit' ? sitFrame(facing).flipX : FLIP_X;
  return { key: animKey(character, action, facing), flipX };
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
