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
export type Surface = 'here' | 'collection' | 'progress' | 'people' | null;

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
  /**
   * The satchel: what is carried.
   *
   * An interrupt rather than a surface, on the same reasoning as the kit. A player opens it
   * deliberately, does a thing, and closes it — it must not silently discard the field notes
   * they were reading, which is exactly what putting it in `Surface` would do.
   *
   * It used to be "and what could be made of it". Making has its own surface now: a bag is a
   * thing you have and a workshop is a thing you do.
   */
  satchel: boolean;
  /** The workshop: what can be made, and what this place allows that open ground does not. */
  workshop: boolean;
}

/**
 * How much of the bottom of the screen the dock is taking.
 *
 * **Three settings where there used to be two.** The field notes were pinned full-bleed at 38-46dvh
 * with no state between "all of that" and *gone*, so a player who wanted to see the ground had to
 * take the notes away entirely. Measured before this: the chrome covered 48% of the screen standing
 * on ordinary ground and 73% standing in a place, on a desktop, and 83% on a landscape phone. See
 * `docs/ui-streamline-plan.md`.
 *
 * - `peek` — the title, where you are, what the light and your legs are doing, and what you can do
 *   here. A **fixed** fraction rather than a size that follows the content: the line about what a
 *   creature is doing changes while the player stands still, and a dock that breathes with it moves
 *   the camera under somebody who has not touched anything. `e2e/hours.spec.ts` has guarded that
 *   since before this dock existed, and it caught exactly that when peek was content-sized.
 * - `read` — the field notes in full, or the place with its prose. What the old panel always was.
 * - `full` — reading properly. Stage 5's conversation lives here.
 */
export type DockHeight = 'peek' | 'read' | 'full';

export interface SurfaceState {
  surface: Surface;
  /**
   * How much room the dock has.
   *
   * Kept here rather than in a component because it is arbitration, exactly like `surface`: the
   * notes, the place and (later) a conversation take turns in one slot, and how tall that slot is
   * is a fact about the slot rather than about whoever is standing in it.
   */
  dockHeight: DockHeight;
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
  /**
   * Who is talking, or null when nobody is.
   *
   * **A conversation is a third occupant of the dock, not a section of the place panel.** Every
   * person at a point of interest used to render at once, each with a 96-pixel portrait and its own
   * running typewriter, stacked in a scroller that showed a third of itself on a landscape phone.
   * Canon holds three of them at Lothal Camp and two at five other places; their lines average
   * thirty-two words and run to sixty-one. They are written to be listened to, and two at once is
   * not a presentation of them.
   *
   * Here rather than inside `PlacePanel` because it is arbitration -- who has the slot, and how
   * tall the slot is -- which is the whole of what this reducer is for. It is also why walking away
   * can end a conversation without the panel having to know it happened.
   */
  talkingTo: string | null;
  /**
   * Whether the satchel ribbon is showing.
   *
   * Its own flag rather than a `Surface`, because a surface is one-of-many and this is
   * independent of every other: reading the notes, standing in a place and carrying things are
   * three unrelated facts, and the ribbon has to survive all of them.
   *
   * Not an `Interrupt` either. An interrupt is something a player opens, does and closes; the
   * ribbon is the resting state with an off switch, which is the notes' relationship rather than
   * the satchel panel's.
   */
  satchelRibbon: boolean;
}

export type SurfaceAction =
  /** The player asked for a surface. Asking for the open one closes it. */
  | { type: 'toggle'; surface: Exclude<Surface, null> }
  /**
   * Show a surface outright, without the toggle's close-if-open behaviour.
   *
   * What a tab does. Pressing the tab you are already on must keep it open -- `toggle` would
   * close the sheet, which is the opposite of what a tab means and reads as the panel breaking.
   */
  | { type: 'show'; surface: Exclude<Surface, null> }
  /** Close whatever is open. */
  | { type: 'close' }
  /** Open or put away the place, without disturbing the notes beneath it. */
  | { type: 'toggle-place' }
  | { type: 'close-place' }
  | { type: 'open-interrupt'; which: keyof Interrupts }
  | { type: 'close-interrupt'; which: keyof Interrupts }
  /** The world says the traveller moved. `poiId` is null off an authored place. */
  | { type: 'standing-on'; poiId: string | null }
  /** Show or hide the satchel ribbon. */
  | { type: 'toggle-satchel-ribbon' }
  /** Listen to somebody. Takes the dock, at full height. */
  | { type: 'talk-to'; npcId: string }
  /** Stop listening, and go back to the place they are standing in. */
  | { type: 'stop-talking' }
  /** Give the dock a size. */
  | { type: 'dock'; height: DockHeight }
  /**
   * The player pulled the dock open, or pushed it shut.
   *
   * **Three steps, and the third one is not decoration.** This was two -- peek and read -- on the
   * reasoning that `full` belonged to a conversation and would be entered by starting one. Then the
   * measurement came in: at reading height the dock shows about 65% of a place against the 73% the
   * old full-bleed arrangement managed, because the handle and the rail take 117 pixels before any
   * writing is paid for. A player who wants the whole page needs somewhere to ask for it, and a
   * height nothing can reach is a height that does not exist -- which is this codebase's signature
   * bug, three times over.
   */
  | { type: 'dock-toggle' };

/**
 * The field notes are the game's resting state, not an extra.
 *
 * `notesOpen` started `true` before this reducer existed, and it had to: the notes are what the
 * traveller reads on every step, and a player who lands on a bare map has been given a walking
 * simulator. Starting at `null` looked tidier and quietly removed the default view.
 */
export const initialSurface: SurfaceState = {
  surface: 'here',
  // **Peek, not read, and this is the whole of stage 3 in one word.** The notes are still the
  // resting state -- see the note above, which is why this is not `null` -- but the resting state
  // is now where you are and what you can do, rather than a full-bleed page of prose on every step
  // of the walk. Opening them is one press, and arriving somewhere opens them for you.
  dockHeight: 'peek',
  interrupts: { ending: false, overworld: false, kit: false, satchel: false, workshop: false },
  standingOn: null,
  placeOpen: false,
  talkingTo: null,
  // Shown by default, on the same reasoning as the notes: a readout nobody has found is a
  // readout that does not exist. It closes because a permanent band that cannot be dismissed is
  // an obstruction rather than a convenience -- reported from play, and the map is the thing
  // somebody came to look at.
  satchelRibbon: true
};

export function surfaceReducer(state: SurfaceState, action: SurfaceAction): SurfaceState {
  switch (action.type) {
    case 'toggle':
      return {
        ...state,
        surface: state.surface === action.surface ? null : action.surface
      };

    case 'show':
      return { ...state, surface: action.surface };

    case 'close':
      // Closing the diary or the album returns to the field notes, not to a bare map. They are
      // the resting state, and under the old booleans they were simply still there underneath
      // -- closing something on top of them was never a way to end up with nothing. Only an
      // explicit `toggle` of `here` puts the notes away.
      return { ...state, surface: 'here', placeOpen: false };

    case 'toggle-place': {
      // Reading a place implies being on the `here` surface: it is the layer above the notes,
      // so opening it can never leave the player looking at the diary with a place panel on top.
      const placeOpen = !state.placeOpen;
      // A place is prose, so it opens at reading height; putting it away gives the map back. And
      // either way nobody is talking: there is no conversation without a place to have it in.
      return {
        ...state,
        surface: 'here',
        placeOpen,
        talkingTo: null,
        dockHeight: placeOpen ? 'read' : 'peek'
      };
    }

    case 'close-place':
      // Only the place closes. The notes it was covering stay, which is the whole point --
      // "Leave" should reveal what is underneath, not clear the screen. What has changed is that
      // they are revealed at peek: leaving somewhere is a move back towards the map.
      return { ...state, surface: 'here', placeOpen: false, talkingTo: null, dockHeight: 'peek' };

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
        // Arriving somewhere opens it at reading height. This is the one place the dock grows on
        // its own, and it is the moment the game has something to say.
        return {
          ...state,
          standingOn: action.poiId,
          surface: 'here',
          placeOpen: true,
          talkingTo: null,
          dockHeight: 'read'
        };
      }
      // Walking out gives the map back rather than leaving a page of prose open over it, and it
      // ends any conversation -- `Dialogue`'s own rule is that being walked out on still counts as
      // having been told, so nothing is lost by the panel going away.
      return { ...state, standingOn: null, placeOpen: false, talkingTo: null, dockHeight: 'peek' };
    }

    case 'talk-to':
      // Full height, because this is the one thing in the game that is nothing but reading: a
      // portrait, the words, and one control to go on.
      return { ...state, surface: 'here', talkingTo: action.npcId, dockHeight: 'full' };

    case 'stop-talking':
      // Back to the place they were standing in, at the height it opens at. Not to `peek`: somebody
      // who has just finished listening is still in the middle of being somewhere.
      return { ...state, talkingTo: null, dockHeight: 'read' };

    case 'dock':
      return { ...state, dockHeight: action.height };

    case 'dock-toggle': {
      // Open, open further, away. Collapsing from `full` goes straight to `peek` rather than
      // stepping back down through `read`, because somebody pushing a panel away wants the map and
      // not a smaller panel.
      const next: DockHeight = state.dockHeight === 'peek' ? 'read' : state.dockHeight === 'read' ? 'full' : 'peek';
      return { ...state, dockHeight: next };
    }

    case 'toggle-satchel-ribbon':
      // Nothing else moves. Hiding what you carry says nothing about the notes, the place under
      // foot, or anything open -- it is a request for a clean view of the map and must not be
      // read as anything more.
      return { ...state, satchelRibbon: !state.satchelRibbon };

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

/**
 * Whether the dock is showing more than its peek row.
 *
 * For the camera and for tests, neither of which should have to know what the three names mean.
 */
export function dockIsOpen(state: SurfaceState): boolean {
  return state.surface === 'here' && state.dockHeight !== 'peek';
}
