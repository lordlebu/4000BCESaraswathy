// Which panel has the screen.
//
// This exists because seven independent booleans decided that between them, and nothing
// arbitrated: every panel positioned itself, and the camera insets were then computed by
// measuring whatever rectangles happened to be on the glass. Panels negotiated for space
// rather than being placed, which is the whole reason the layout drifted.
//
// One value replaces the arbitration. Two surfaces cannot overlap because there is only one
// slot to be in -- not because some arithmetic noticed they would have.
//
// Pure: no React, no DOM, no Phaser. The reducer is exercised under Node in `test/`, which is
// the point of keeping it out of the component.

/**
 * The three things a player reads, and `null` for the map alone.
 *
 * - `here` — flora, fauna, landmarks, conversation, action: what is in front of you now.
 * - `collection` — the album of species met. Reference; gates nothing.
 * - `progress` — discoveries, rungs, open questions, words.
 */
export type Surface = 'here' | 'collection' | 'progress' | null;

/**
 * Panels that are *not* surfaces, because they interrupt rather than inform.
 *
 * The ending and the overworld map are entered deliberately and leave on their own terms, so
 * they are not competing for the same slot and must not close a surface by opening. Keeping
 * them out of `Surface` is what stops "open the map" from silently discarding what the player
 * was reading.
 */
export interface Interrupts {
  ending: boolean;
  overworld: boolean;
  /** The field kit, opened from within progress. */
  kit: boolean;
}

export interface SurfaceState {
  surface: Surface;
  interrupts: Interrupts;
  /**
   * Where the traveller is standing, if anywhere authored.
   *
   * Deliberately *not* the same thing as whether `here` is open. Keeping them apart is what
   * lets a dismissed panel be reopened without walking off the tile and back -- the distinction
   * the old `standingOn`/`placeOpen` pair existed to preserve, kept because it was right.
   */
  standingOn: string | null;
  /**
   * Whether the place is being read, on top of the field notes.
   *
   * `here` is one surface with two layers, not two rival surfaces: the notes are the floor of
   * it and the place sits over them, which is why closing a place *reveals* the notes rather
   * than clearing the screen. Collapsing these into one flag made "Leave" close both and dead-
   * ended the player exactly as the original bug report described.
   */
  placeOpen: boolean;
}

export type SurfaceAction =
  /** The player asked for a surface. Asking for the open one closes it. */
  | { type: 'toggle'; surface: Exclude<Surface, null> }
  /** Close whatever is open. */
  | { type: 'close' }
  /** Open or put away the place, without disturbing the notes beneath it. */
  | { type: 'toggle-place' }
  | { type: 'close-place' }
  | { type: 'open-interrupt'; which: keyof Interrupts }
  | { type: 'close-interrupt'; which: keyof Interrupts }
  /** The world says the traveller moved. `poiId` is null off an authored place. */
  | { type: 'standing-on'; poiId: string | null };

/**
 * The field notes are the game's resting state, not an extra.
 *
 * `notesOpen` started `true` before this reducer existed, and it had to: the notes are what the
 * traveller reads on every step, and a player who lands on a bare map has been given a walking
 * simulator. Starting at `null` looked tidier and quietly removed the default view.
 */
export const initialSurface: SurfaceState = {
  surface: 'here',
  interrupts: { ending: false, overworld: false, kit: false },
  standingOn: null,
  placeOpen: false
};

export function surfaceReducer(state: SurfaceState, action: SurfaceAction): SurfaceState {
  switch (action.type) {
    case 'toggle':
      return {
        ...state,
        surface: state.surface === action.surface ? null : action.surface
      };

    case 'close':
      // Closing the diary or the album returns to the field notes, not to a bare map. They are
      // the resting state, and under the old booleans they were simply still there underneath
      // -- closing something on top of them was never a way to end up with nothing. Only an
      // explicit `toggle` of `here` puts the notes away.
      return { ...state, surface: 'here', placeOpen: false };

    case 'toggle-place':
      // Reading a place implies being on the `here` surface: it is the layer above the notes,
      // so opening it can never leave the player looking at the diary with a place panel on top.
      return { ...state, surface: 'here', placeOpen: !state.placeOpen };

    case 'close-place':
      // Only the place closes. The notes it was covering stay, which is the whole point --
      // "Leave" should reveal what is underneath, not clear the screen.
      return { ...state, surface: 'here', placeOpen: false };

    case 'open-interrupt':
      return { ...state, interrupts: { ...state.interrupts, [action.which]: true } };

    case 'close-interrupt':
      return { ...state, interrupts: { ...state.interrupts, [action.which]: false } };

    case 'standing-on': {
      // Arriving somewhere opens it once; leaving closes it, because a panel about a place you
      // are no longer standing in is a lie about where you are. Unchanged from the old
      // `onStandingOn` -- but leaving must not disturb `collection` or `progress`, which are
      // not about this tile and have no business being dismissed by a footstep.
      if (action.poiId) {
        return { ...state, standingOn: action.poiId, surface: 'here', placeOpen: true };
      }
      return { ...state, standingOn: null, placeOpen: false };
    }

    default:
      return state;
  }
}

/**
 * Whether anything is covering the map.
 *
 * The camera asks this instead of measuring rectangles. A surface or an interrupt both count:
 * from the camera's side there is no difference between the two.
 */
export function mapIsCovered(state: SurfaceState): boolean {
  return state.surface !== null || Object.values(state.interrupts).some(Boolean);
}
