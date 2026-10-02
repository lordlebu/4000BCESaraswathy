// Standing in an authored place.
//
// This is where the diary gets written. Everything the player can actually *do* to advance —
// look closer at something, listen to whoever is here, go deeper into the place — happens on
// this panel, and every one of those is a call into `journey.ts` rather than a rule restated.
//
// The things it shows are deliberately in this order: who is here, what is here to look at, and
// what is further in. People came second until play showed a player walking in could not tell who
// was there -- the map draws nobody at a place, so this panel is the only place they are.

import { useState } from 'react';
import {
  type Progress,
  blockedBy,
  blockedFrom,
  canAdvance,
  canEnter,
  entryFor,
  isComplete,
  rungOf
} from '../journey';
import { discovery, offeredAt } from '../content/knowledge';
import { poi } from '../content/places';
import { awayLine, type Presence } from '../content/presence';
import { PersonPortrait } from './PersonPortrait';
import { placeArt } from './places';
import { StationBoard } from './StationBoard';
import { stationsAt, stationsMissing, type Station } from '../content/stations';

/** The face beside a name in the list of who is here. Small: this is an index, not a meeting. */
const FACE_SIZE = 44;

// `handOver` moved to `Conversation.tsx` with the person who says it. `test/panels.test.tsx` and
// `test/conversation.test.ts` import it from there.

/** Why a rung will not move, in words. Mirrors the diary's phrasing on purpose. */
function why(progress: Progress, id: string): string {
  const missing = blockedBy(progress, id);
  const first = missing[0];
  if (!first) return '';
  if (first.startsWith('word_')) return 'There is a word for this you do not have yet.';
  return `You would need to understand ${discovery(first)?.name ?? 'something else'} first.`;
}

/** The homestead as one place sees it: a heading, what is true, and the one thing to do next. */
export interface SettlingView {
  title: string;
  lines: string[];
  action: { label: string; blocked: string | null; onDo: () => void } | null;
  /** The next stage as a pin, so the dock counts off what it wants. Absent once nothing is next. */
  pin?: { on: boolean; toggle: () => void };
}

export interface PlacePanelProps {
  poiId: string | null;
  /**
   * Who is here now and where the place's other people have gone -- `whoIsHere` in
   * `content/presence.ts`, asked by App because App holds what the scene reported. Null lists
   * nobody, which is only right while there is no place.
   */
  presence: Presence | null;
  /**
   * Building here, when this place is a homestead's ground -- asked of `content/homestead.ts` by
   * App, which holds the journey's flags. Null at every other place.
   */
  settling?: SettlingView | null;
  progress: Progress;
  /** True the first time this place is entered in a session — the long prose goes up once. */
  firstVisit: boolean;
  // `satchel` moved to `Conversation` with the lines it gates. The note on why it is needed at all
  // is there: canon prices two lines, and without it the panel asked what somebody says to a
  // traveller carrying nothing, which made two gift lines invisible.
  onLook: (discoveryId: string) => void;
  /** Listen to somebody. They take the dock; this panel comes back when they are done. */
  onTalkTo: (npcId: string) => void;
  /**
   * Open the workshop at one of this place's benches, or null to draw the board as a readout.
   *
   * Null at `peek`: a pressable mark owes the 44px touch floor where a readout owes 26, and the
   * dock has measured that difference in chips falling off a landscape phone.
   */
  onOpenStation: ((station: Station) => void) | null;
  onClose: () => void;
}

export function PlacePanel({
  poiId,
  presence,
  settling = null,
  progress,
  firstVisit,
  onLook,
  onTalkTo,
  onOpenStation,
  onClose
}: PlacePanelProps) {
  const [openSub, setOpenSub] = useState<string | null>(null);
  const place = poiId ? poi(poiId) : null;
  if (!place) return null;

  // Asked of canon's two lists together -- see `offeredAt` for the eighteen the place's own missed.
  const offered = offeredAt(place.id, place.discoveries);
  const people = presence?.here ?? [];
  const away = presence ? awayLine(presence) : null;
  const sub = openSub ? place.subLocations.find((s) => s.id === openSub) : null;

  // **No veil.** This used to draw its own full-screen wrapper and position itself above the field
  // notes, so the two divided the bottom of the screen and each got half of a half. It is an
  // occupant of the dock now -- see `Here.tsx` -- and the slot it stands in is the whole of the
  // bottom rather than a share of it.
  // A painted view of the place, or of its kind, or nothing at all — which is every place today.
  // The panel reads perfectly well without one and always has; this is the hook that makes the
  // first painting a file rather than a sprint. See `src/ui/places.ts`.
  const view = placeArt(place.id, place.kind);

  return (
    <section className="place" aria-live="polite">
        {view && (
          // Decorative: the arrival prose below says what this place is, and a screen reader
          // announcing a painting of a harbour adds nothing to it. `SpeciesIcon` and the activity
          // card make the same call.
          <img className="place-view" src={view} alt="" aria-hidden="true" />
        )}
        <header className="place-head">
          <div>
            <h2>{place.name}</h2>
            <p className="place-kind">{place.kind.replace(/_/g, ' ')}</p>
          </div>
          <button type="button" className="diary-close" onClick={onClose}>
            Leave
          </button>
        </header>

        {/* **Who is here, first.** Reported from play: walking into a place, a player could not tell
            who was in it. The map draws nobody standing at a place, so this is where they are, with
            their faces, before the prose -- and one line under them says where anybody else who
            belongs here has gone. Not inside a sub-location, which has its own description. */}
        {!sub && (people.length > 0 || away) && (
          <section className="place-section place-people">
            <h3>Who is here</h3>
            {/* **Names and faces, not three people talking at once.** Choosing somebody opens them
                in the dock at full height -- see `Conversation.tsx` for what that fixed. */}
            {people.length > 0 ? (
              <ul className="who-list">
                {people.map((n) => (
                  <li key={n.id}>
                    <button type="button" className="who" onClick={() => onTalkTo(n.id)}>
                      <PersonPortrait person={n} size={FACE_SIZE} />
                      <span className="who-words">
                        <span className="who-name">{n.name}</span>
                        <span className="who-role">{n.role}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="who-away">Nobody is here just now.</p>
            )}
            {away && <p className="who-away">{away}</p>}
          </section>
        )}

        {/* What this place can work, before the prose rather than after it: a player who has
            walked in to use a bench should not have to read a paragraph to find out there is one.
            `stations.ts` derives it from who is standing here — see that file, and
            `docs/activity-boards-plan.md`. */}
        {/* **Building here**, at a homestead's ground: what it is, and the one thing to do next. A
            refusal is a sentence, as the action rail's are -- it is how settling is taught. */}
        {settling && !sub && (
          <section className="place-section settling">
            <h3>Building here</h3>
            <h4 className="settling-title">{settling.title}</h4>
            {settling.lines.map((line) => (
              <p key={line} className="settling-line">
                {line}
              </p>
            ))}
            {settling.action && (
              <div className="look">
                <div className="look-text">
                  {settling.action.blocked && <p className="muted">{settling.action.blocked}</p>}
                </div>
                <button type="button" onClick={settling.action.onDo} disabled={settling.action.blocked !== null}>
                  {settling.action.label}
                </button>
                {settling.pin && (
                  <button
                    type="button"
                    className="recipe-pin"
                    aria-pressed={settling.pin.on}
                    aria-label={settling.pin.on ? `Unpin ${settling.action.label}` : `Pin ${settling.action.label}`}
                    onClick={settling.pin.toggle}
                  >
                    {settling.pin.on ? 'Unpin' : 'Pin'}
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        <StationBoard
          here={stationsAt(place)}
          missing={stationsMissing(place)}
          onOpen={onOpenStation}
        />

        {/* Arrival prose is the writing the place exists for, so it gets room — but only the
            first time. Afterwards the shorter line is the honest thing to show. */}
        <p className="place-arrival">{firstVisit ? place.arrival : place.description}</p>

        {sub ? (
          <div className="sub">
            <h3>{sub.name}</h3>
            <p>{sub.description}</p>
            <button type="button" className="ghost" onClick={() => setOpenSub(null)}>
              Back out
            </button>
          </div>
        ) : (
          <>
            {offered.length > 0 && (
              <section className="place-section">
                <h3>Here</h3>
                {offered.map((id) => {
                  const d = discovery(id);
                  if (!d) return null;
                  const seen = rungOf(progress, id) >= 0;
                  const done = isComplete(progress, id);
                  const can = canAdvance(progress, id);
                  return (
                    <div key={id} className="look">
                      <div className="look-text">
                        <h4>{seen ? d.name : 'Something you have not looked at'}</h4>
                        <p>{seen ? entryFor(progress, id) : 'You have walked past this.'}</p>
                        {!done && !can && seen && <p className="muted">{why(progress, id)}</p>}
                      </div>
                      <button type="button" onClick={() => onLook(id)} disabled={!can}>
                        {done ? 'Understood' : can ? 'Look closer' : 'Not yet'}
                      </button>
                    </div>
                  );
                })}
              </section>
            )}

            {place.subLocations.length > 0 && (
              <section className="place-section">
                <h3>Further in</h3>
                {place.subLocations.map((s) => {
                  const may = canEnter(progress, place.id, s.id);
                  const missing = blockedFrom(progress, place.id, s.id);
                  return (
                    <div key={s.id} className="look">
                      <div className="look-text">
                        <h4>{s.name}</h4>
                        {!may && (
                          <p className="muted">
                            {missing.some((m) => m.startsWith('word_'))
                              ? 'You would need a word you do not have.'
                              : `Not until you understand ${
                                  discovery(missing[0] ?? '')?.name ?? 'more than you do'
                                }.`}
                          </p>
                        )}
                      </div>
                      <button type="button" onClick={() => setOpenSub(s.id)} disabled={!may}>
                        {may ? 'Go in' : 'Closed to you'}
                      </button>
                    </div>
                  );
                })}
              </section>
            )}
          </>
        )}
    </section>
  );
}
