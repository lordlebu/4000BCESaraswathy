// Standing in an authored place.
//
// This is where the diary gets written. Everything the player can actually *do* to advance —
// look closer at something, listen to whoever is here, go deeper into the place — happens on
// this panel, and every one of those is a call into `journey.ts` rather than a rule restated.
//
// The three things it shows are deliberately in this order: what is here to look at, who is
// here to talk to, and what is further in. That is the order a person arriving somewhere
// actually works through it.

import { useEffect, useState } from 'react';
import {
  type Progress,
  type WorldMoment,
  blockedBy,
  blockedFrom,
  canAdvance,
  canEnter,
  entryFor,
  isComplete,
  lineIsSpent,
  linesFor,
  rungOf
} from '../journey';
import { discovery } from '../content/knowledge';
import { npcsAt, poi, type Npc } from '../content/places';
import { quietNote, saysNow } from '../content/conversation';
import { PersonPortrait } from './PersonPortrait';

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
  onLook: (discoveryId: string) => void;
  onListen: (npcId: string, lineIndex: number) => void;
  onClose: () => void;
}

/**
 * One person, saying one thing.
 *
 * **Being told something is how you hear it.** The old panel made the player click "Write it
 * down" beside each line, which is the paperwork this phase exists to remove -- the diary is
 * Varuna's and he does not need permission to use it. So the effect below records the line as
 * heard the moment it is shown, and the button that remains asks for the *next* thing rather than
 * for consent to remember this one.
 *
 * The effect keys on the line's text rather than the person, so walking away and coming back does
 * not re-give what was already given: `lineIsSpent` will have started returning true and
 * `saysNow` will have moved on.
 */
function Person({
  person,
  progress,
  onListen
}: {
  person: Npc;
  progress: Progress;
  onListen: (npcId: string, lineIndex: number) => void;
}) {
  const said = saysNow(linesFor(progress, person.id), (l) => lineIsSpent(progress, l));
  const text = said.line?.text ?? null;
  const index = said.index;
  const gives = said.gives;

  useEffect(() => {
    if (text !== null && gives) onListen(person.id, index);
  }, [person.id, text, index, gives, onListen]);

  return (
    <div className="person">
      <h4>
        <PersonPortrait person={person} />
        <span>
          {person.name} <span className="muted">· {person.role}</span>
        </span>
      </h4>
      {said.line ? (
        <p className="said">
          <span aria-hidden="true">“</span>
          {said.line.text}
          <span aria-hidden="true">”</span>
        </p>
      ) : (
        <p className="muted">{quietNote(person.name)}</p>
      )}
      {said.more && <p className="muted said-more">There is more they could tell you.</p>}
    </div>
  );
}

export function PlacePanel({
  poiId,
  progress,
  moment,
  firstVisit,
  onLook,
  onListen,
  onClose
}: PlacePanelProps) {
  const [openSub, setOpenSub] = useState<string | null>(null);
  const place = poiId ? poi(poiId) : null;
  if (!place) return null;

  const people = npcsAt(place.id);
  const sub = openSub ? place.subLocations.find((s) => s.id === openSub) : null;

  return (
    <div className="place-veil">
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
                {people.map((n) => (
                  <Person
                    key={n.id}
                    person={n}
                    progress={progress}
                    onListen={onListen}
                  />
                ))}
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
    </div>
  );
}
