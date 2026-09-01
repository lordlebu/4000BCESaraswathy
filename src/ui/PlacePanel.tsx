// Standing in an authored place.
//
// This is where the diary gets written. Everything the player can actually *do* to advance —
// look closer at something, listen to whoever is here, go deeper into the place — happens on
// this panel, and every one of those is a call into `journey.ts` rather than a rule restated.
//
// The three things it shows are deliberately in this order: what is here to look at, who is
// here to talk to, and what is further in. That is the order a person arriving somewhere
// actually works through it.

import { useCallback, useState } from 'react';
import {
  type Progress,
  type WorldMoment,
  blockedBy,
  blockedFrom,
  canAdvance,
  canEnter,
  entryFor,
  isComplete,
  isFirstMeeting,
  lineIsSpent,
  linesFor,
  rungOf
} from '../journey';
import { discovery } from '../content/knowledge';
import { npcsAt, poi, type Line, type Npc } from '../content/places';
import { beats, meeting, moreAfter, quietNote } from '../content/conversation';
import { Dialogue } from './Dialogue';
import { PersonPortrait } from './PersonPortrait';

/**
 * How large a person is drawn while they are talking.
 *
 * 96 rather than the 26 the mark was: at 26 a portrait is punctuation beside a name, and the point
 * of this one is that somebody is on the other side of the words. It is also what the built
 * portraits are sized against -- `tools/build-plates.js --portraits` writes 256, which covers this
 * on a 2x screen with the same margin a plate gets.
 */
const PORTRAIT_SIZE = 96;

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
 * One person, talking.
 *
 * **Being told something is how you hear it.** The old panel made the player click "Write it
 * down" beside each line, which was paperwork -- the diary is Varuna's and he does not need
 * permission to use it. What replaced it recorded the line on mount instead, which fixed the
 * clicking and introduced a subtler version of the same fault: a line counted as heard before it
 * was legible, so a player who left mid-sentence had still "heard" it. `Dialogue` now reports each
 * beat as it *finishes*, and the last beat of a line is what writes it down.
 *
 * **A first meeting is longer than a visit.** Measured against the shipped bundle: everybody opens
 * with two or three ungated lines -- nineteen across the eight of them -- and `saysNow` returns
 * exactly one, so about two fifths of the introductions were authored and never shown. `meeting`
 * plays all of them the first time and hands back to `saysNow` afterwards.
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
  const available = linesFor(progress, person.id);
  const spent = (l: Line) => lineIsSpent(progress, l);
  const first = isFirstMeeting(progress, person.id);

  // Held for the length of the exchange. Recomputing on every render would rebuild the turns from
  // a `Progress` that the exchange itself is changing -- so hearing the first line of a meeting
  // would end the meeting.
  const [turns] = useState(() => meeting(available, spent, first));
  const [over, setOver] = useState(false);

  const beatsOf = turns.map((t) => beats(t.line.text));
  const flat = beatsOf.flat();

  // Which turn a flattened beat index belongs to, so a finished beat can record the right line.
  const owner: number[] = [];
  beatsOf.forEach((bs, turnIndex) => bs.forEach(() => owner.push(turnIndex)));

  const heardBeat = useCallback(
    (beatIndex: number) => {
      const turnIndex = owner[beatIndex];
      if (turnIndex === undefined) return;
      // The line is written down when its *last* beat lands, not its first.
      const isLastOfTurn = owner[beatIndex + 1] !== turnIndex;
      const turn = turns[turnIndex];
      if (isLastOfTurn && turn && turn.gives) onListen(person.id, turn.index);
    },
    [owner, turns, person.id, onListen]
  );

  const more = moreAfter(available, spent, turns);

  const talking = flat.length > 0 && !over;

  return (
    <div className="person">
      {/* The portrait sits beside what is being said rather than above it, and at a size worth
          looking at. A speaking portrait is the third of the four things the genre does -- it does
          not need expressions, it needs to be large, next to the words, and to move a little while
          its owner talks. */}
      <div className="person-speaking">
        <PersonPortrait person={person} size={PORTRAIT_SIZE} speaking={talking} />
        <div className="person-words">
          <h4>
            {person.name} <span className="muted">· {person.role}</span>
          </h4>
          {talking ? (
            <Dialogue
              beats={flat}
              onBeatDone={heardBeat}
              onDone={() => setOver(true)}
              doneLabel={null}
            />
          ) : (
            <p className="muted">{quietNote(person.name)}</p>
          )}
          {over && more && <p className="muted said-more">There is more they could tell you.</p>}
        </div>
      </div>
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
