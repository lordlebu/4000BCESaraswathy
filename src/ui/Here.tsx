// Here: what is in front of you, right now.
//
// One surface with two layers. The field notes are the floor -- what is on this tile, every
// step, whether or not anything is authored here. The place sits over them when the traveller
// is standing somewhere with a name, and closing it reveals the notes rather than the map.
//
// That layering is the whole point of the component. Phase one learned it the hard way: fold
// the two into a single flag and "Leave" closes both, which is exactly the dead end the place
// panel's close button was added to fix. The rule now lives in `surface.ts`; this renders it.
//
// Canon comes in as a section rather than a panel. It answers the same question the notes do --
// what is here -- from a source that is usually absent, and a floating panel for something that
// renders nothing 95% of the time was never worth the slot it took.
//
// Presentation only. Every rule about what a player may do is a call into `journey.ts`, made by
// the panels below.

import type { ReactNode } from 'react';
import { JournalPanel, type JournalPanelProps } from './JournalPanel';
import { PlacePanel, type PlacePanelProps } from './PlacePanel';
import { TileActions, type TileAction } from './TileActions';

export interface HereProps {
  /** Whether the surface holds the screen at all. */
  open: boolean;
  /** The field notes: the floor of this surface. */
  notes: JournalPanelProps;
  /** The place over them, if the traveller is standing in one and reading it. */
  place: PlacePanelProps;
  /** Canon, when a service is listening. Usually nothing at all. */
  canon?: ReactNode;
  /**
   * Everything that can be done on this tile.
   *
   * Above the notes rather than inside them: the notes are prose about where you are, and these
   * are the things you can do about it. Mixing them is how taking a reed ended up inside the
   * satchel and unrolling the bedding inside the field notes.
   */
  actions: readonly TileAction[];
}

export function Here({ open, notes, place, canon, actions }: HereProps) {
  if (!open) return null;

  return (
    <>
      {/* The place renders itself as null when there is nowhere to be, so this is not a
          conditional -- `poiId` already carries "am I being read" from the reducer. */}
      <PlacePanel {...place} />
      <JournalPanel {...notes}>
        <TileActions actions={actions} />
        {canon}
      </JournalPanel>
    </>
  );
}
