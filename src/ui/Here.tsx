// Here: what is in front of you, right now — and how much of the screen it is allowed to take.
//
// **One dock, one occupant, three heights.** The occupant is the field notes, the place under foot,
// or somebody talking -- and never two of them. The field notes and the place used to be two panels
// dividing the bottom of the screen between them, each getting half of a half; measured, that left
// the map at 27% on a desktop and **17% on a landscape phone**, with the place panel showing 29% of
// its own content in a 135-pixel window. The two are never wanted at once, so they take turns in
// one slot and whichever is showing gets all of it. See `docs/ui-streamline-plan.md`.
//
// The layering that this replaces was right about the thing it was built to fix, and that ruling
// survives: **leaving a place reveals the notes rather than clearing the screen.** What has changed
// is that the notes come back at `peek` — the title, where you are, and what you can do — instead of
// as a full-bleed page of prose. Closing something is a move back towards the map.
//
// **The actions sit in the dock, not in the occupant, and that is not tidiness.** Folding the
// notes and the place into one slot would otherwise hide every verb the moment you stood
// somewhere: no taking a reed, no unrolling the bedding, until you pressed Leave. They are pinned
// below whatever is showing, at every height, which is the plan's action rail arriving a stage
// early because this stage is what makes it necessary.
//
// Canon comes in as a section rather than a panel. It answers the same question the notes do --
// what is here -- from a source that is usually absent, and a floating panel for something that
// renders nothing 95% of the time was never worth the slot it took.
//
// Presentation only. Every rule about what a player may do is a call into `journey.ts`, made by
// the panels below; how tall the dock is belongs to `surface.ts`, which is pure and tested under
// Node.

import type { ReactNode } from 'react';
import { Conversation, type ConversationProps } from './Conversation';
import { JournalPanel, type JournalPanelProps } from './JournalPanel';
import { PlacePanel, type PlacePanelProps } from './PlacePanel';
import { TileActions, type TileAction } from './TileActions';
import type { DockHeight } from './surface';

/**
 * What the handle says it will do next, which is never where the dock is now.
 *
 * Three steps: open, open further, away. The middle one earns its place -- at reading height the
 * dock shows about two thirds of a place, and somebody who wants the whole page has to be able to
 * ask for it.
 */
const HANDLE_LABEL: Record<DockHeight, string> = {
  peek: 'Open the field notes',
  read: 'Open the field notes further',
  full: 'Put the field notes away'
};

export interface HereProps {
  /** Whether the surface holds the screen at all. */
  open: boolean;
  /** The field notes: the dock's occupant when the traveller is not reading a place. */
  notes: JournalPanelProps;
  /** The place, which takes the slot while it is being read. */
  place: PlacePanelProps;
  /**
   * Somebody talking, when a person has been chosen.
   *
   * Takes the slot over the place, because a conversation is the one thing in this game that is
   * nothing but reading -- and because every person at a point of interest used to talk at once.
   * See `Conversation.tsx`.
   */
  conversation: ConversationProps | null;
  /** Canon, when a service is listening. Usually nothing at all. */
  canon?: ReactNode;
  /**
   * Everything that can be done on this tile.
   *
   * Below the occupant rather than inside it: the notes are prose about where you are, and these
   * are the things you can do about it. Mixing them is how taking a reed ended up inside the
   * satchel and unrolling the bedding inside the field notes.
   */
  actions: readonly TileAction[];
  /** How much room the dock has. */
  height: DockHeight;
  /** Pull it open, or push it shut. */
  onHeight: () => void;
}

export function Here({
  open,
  notes,
  place,
  conversation,
  canon,
  actions,
  height,
  onHeight
}: HereProps) {
  if (!open) return null;

  // The reducer has already decided all of this -- `talkingTo` and `poiId` carry it -- so the whole
  // of the arbitration on this side is picking one of three and rendering nothing else.
  const reading = place.poiId !== null;

  return (
    <section
      className="dock"
      data-height={height}
      // Which of the three has the slot, stated on the element. The stylesheet needs it -- a
      // conversation is sized to its content where the other two are not -- and it is a better
      // thing for a test to read than the presence of a child.
      data-occupant={conversation ? 'conversation' : reading ? 'place' : 'notes'}
      aria-label="Here"
    >
      {/* A grip, and a real control. The dock can be opened and shut by dragging on a touch screen,
          but a drag is not discoverable and is not available to a keyboard -- so the same thing is
          a button that says what it does. */}
      <button
        type="button"
        className="dock-handle"
        aria-label={HANDLE_LABEL[height]}
        aria-expanded={height !== 'peek'}
        onClick={onHeight}
      >
        <span className="dock-grip" aria-hidden="true" />
      </button>

      <div className="dock-body">
        {conversation ? (
          <Conversation {...conversation} />
        ) : reading ? (
          <PlacePanel {...place} />
        ) : (
          <JournalPanel {...notes}>{canon}</JournalPanel>
        )}
      </div>

      {/* **Every action, at every height, pinned below whatever is showing.**
          Splitting this -- the verbs you can use in the rail, the ones you cannot in the part that
          scrolls -- was tried and reverted, because at peek it hid the blocked rows entirely and
          `TileActions` is emphatic that they are listed *at all times*: a greyed row reading "there
          is daylight left" is how a player learns that resting is a thing and that night is when it
          happens. What the height changes is the *reason*, which is a sentence and waits for the
          room to be a sentence in. */}
      <TileActions actions={actions} variant="rail" />
    </section>
  );
}
