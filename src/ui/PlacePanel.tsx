// Standing in an authored place.
//
// This is where the diary gets written. Everything the player can actually *do* to advance —
// look closer at something, listen to whoever is here, go deeper into the place — happens on
// this panel, and every one of those is a call into `journey.ts` rather than a rule restated.
//
// The three things it shows are deliberately in this order: what is here to look at, who is
// here to talk to, and what is further in. That is the order a person arriving somewhere
// actually works through it.

import { useState } from 'react';
import {
  type Progress,
  type WorldMoment,
  blockedBy,
  blockedFrom,
  canAdvance,
  canEnter,
  entryFor,
  isComplete,
  rungOf
} from '../journey';
import { discovery } from '../content/knowledge';
import { npcsAt, poi } from '../content/places';
import { PersonPortrait } from './PersonPortrait';

/** The face beside a name in the list of who is here. Small: this is an index, not a meeting. */
const FACE_SIZE = 44;

// `handOver` moved to `Conversation.tsx` with the person who says it. `test/panels.test.tsx` and
// `test/conversation.test.ts` import it from there.

/** Why a rung will not move, in words. Mirrors the diary's phrasing on purpose. */
function why(progress: Progress, id: string, moment: WorldMoment | null): string {
  const missing = blockedBy(progress, id, moment);
  if (missing.includes('conditions')) {
    const d = discovery(id);
    const next = d?.rungs[rungOf(progress, id) + 1];
    const when = [
      next?.conditions?.timeOfDay.length ? next.conditions.timeOfDay.join(' or ') : null,
      next?.conditions?.weather.length ? next.conditions.weather.join(' or ') : null
    ]
      .filter(Boolean)
      .join(', in ');
    return when ? `Come back at ${when}.` : 'Not in this weather.';
  }
  const first = missing[0];
  if (!first) return '';
  if (first.startsWith('word_')) return 'There is a word for this you do not have yet.';
  return `You would need to understand ${discovery(first)?.name ?? 'something else'} first.`;
}

export interface PlacePanelProps {
  poiId: string | null;
  progress: Progress;
  moment: WorldMoment | null;
  /** True the first time this place is entered in a session — the long prose goes up once. */
  firstVisit: boolean;
  // `satchel` moved to `Conversation` with the lines it gates. The note on why it is needed at all
  // is there: canon prices two lines, and without it the panel asked what somebody says to a
  // traveller carrying nothing, which made two gift lines invisible.
  onLook: (discoveryId: string) => void;
  /** Listen to somebody. They take the dock; this panel comes back when they are done. */
  onTalkTo: (npcId: string) => void;
  onClose: () => void;
}

export function PlacePanel({
  poiId,
  progress,
  moment,
  firstVisit,
  onLook,
  onTalkTo,
  onClose
}: PlacePanelProps) {
  const [openSub, setOpenSub] = useState<string | null>(null);
  const place = poiId ? poi(poiId) : null;
  if (!place) return null;

  const people = npcsAt(place.id);
  const sub = openSub ? place.subLocations.find((s) => s.id === openSub) : null;

  // **No veil.** This used to draw its own full-screen wrapper and position itself above the field
  // notes, so the two divided the bottom of the screen and each got half of a half. It is an
  // occupant of the dock now -- see `Here.tsx` -- and the slot it stands in is the whole of the
  // bottom rather than a share of it.
  return (
    <section className="place" aria-live="polite">
        <header className="place-head">
          <div>
            <h2>{place.name}</h2>
            <p className="place-kind">{place.kind.replace(/_/g, ' ')}</p>
          </div>
          <button type="button" className="diary-close" onClick={onClose}>
            Leave
          </button>
        </header>

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
            {place.discoveries.length > 0 && (
              <section className="place-section">
                <h3>Here</h3>
                {place.discoveries.map((id) => {
                  const d = discovery(id);
                  if (!d) return null;
                  const seen = rungOf(progress, id) >= 0;
                  const done = isComplete(progress, id);
                  const can = canAdvance(progress, id, moment);
                  return (
                    <div key={id} className="look">
                      <div className="look-text">
                        <h4>{seen ? d.name : 'Something you have not looked at'}</h4>
                        <p>{seen ? entryFor(progress, id) : 'You have walked past this.'}</p>
                        {!done && !can && seen && <p className="muted">{why(progress, id, moment)}</p>}
                      </div>
                      <button type="button" onClick={() => onLook(id)} disabled={!can}>
                        {done ? 'Understood' : can ? 'Look closer' : 'Not yet'}
                      </button>
                    </div>
                  );
                })}
              </section>
            )}

            {people.length > 0 && (
              <section className="place-section">
                <h3>Who is here</h3>
                {/* **Names and faces, not three people talking at once.** Choosing somebody opens
                    them in the dock at full height -- see `Conversation.tsx` for what that fixed.
                    A list is also the honest shape for this: you can see who is here before
                    deciding who to listen to, which standing in a room of simultaneous typewriters
                    never let you do. */}
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
