// Who you have met.
//
// The last of the records to get a surface. Eight people across twenty places, forty-four lines
// between them, and no way to recall who told you what -- a word arrived in the diary with no note
// of whose grandfather half-remembered it.
//
// **Only people you have actually spoken to.** A roster of all eight, greyed where unmet, would be
// a checklist of content rather than a record of who you know, and it would quietly say where to
// go next in a game whose subject is finding out.
//
// It needs no search and no filter, unlike the album beside it. That is a measurement, not a
// preference: the album holds 145-193 species per map and this holds eight people, so tabs and
// search would be furniture around a list that fits on one screen.

import { type ReactNode, useEffect, useRef } from 'react';
import { type Acquaintance, met, threadWith } from '../content/people';
import { discovery, fieldQuestion, word } from '../content/knowledge';
import { recipe } from '../content/making';
import { poi } from '../content/places';
import type { Progress } from '../journey';
import { PersonPortrait } from './PersonPortrait';

/** How large a portrait is in the record. Smaller than the 96 of a conversation: nobody is speaking. */
const PORTRAIT_SIZE = 56;

/**
 * What one of the things a person handed over is called.
 *
 * Four id namespaces, four lookups, and the prefix decides which -- the same shape `receive` in
 * `journey.ts` uses to decide what taking something means. An id that resolves to nothing is
 * dropped rather than printed raw: a player should never be shown `word_kia_thal`.
 */
export function nameOfGift(id: string): string | null {
  if (id.startsWith('word_')) {
    const w = word(id);
    return w ? `${w.word} — ${w.gloss}` : null;
  }
  if (id.startsWith('question_')) return fieldQuestion(id)?.question ?? null;
  if (id.startsWith('recipe_')) return recipe(id)?.name ?? null;
  if (id.startsWith('discovery_')) return discovery(id)?.name ?? null;
  return null;
}

export interface PeoplePanelProps {
  progress: Progress;
  open: boolean;
  onClose: () => void;
  /** The records tab strip, rendered inside the panel rather than over it. */
  tabs?: ReactNode;
}

export function PeoplePanel({ progress, open, onClose, tabs }: PeoplePanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape closes it and focus starts on the way out, matching the diary and the album. The map
  // keeps running underneath: a book you opened, not a stopped world.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const people = met(progress);

  return (
    <div className="diary-veil" role="dialog" aria-modal="true" aria-label="People">
      <section className="diary diary-filling">
        {tabs}
        <header className="diary-head">
          <div>
            <h2>People</h2>
            <p className="diary-sub">
              {people.length === 0
                ? 'Nobody yet'
                : `${people.length} ${people.length === 1 ? 'person' : 'people'} met`}
            </p>
          </div>
          <button type="button" className="diary-close" ref={closeRef} onClick={onClose}>
            Close
          </button>
        </header>

        {people.length === 0 ? (
          <p className="muted people-none">
            You have not talked to anybody yet. People stand in the places worth stopping at.
          </p>
        ) : (
          <ul className="people">
            {people.map((a) => (
              <Person key={a.person.id} who={a} progress={progress} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Person({ who, progress }: { who: Acquaintance; progress: Progress }) {
  const { person, gave, helped } = who;
  const gifts = gave.map(nameOfGift).filter((n): n is string => n !== null);
  const thread = threadWith(progress, person);

  return (
    <li className="people-row">
      <PersonPortrait person={person} size={PORTRAIT_SIZE} />
      <div className="people-text">
        <h4>
          {person.name} <span className="muted">· {person.role}</span>
        </h4>

        {/* Where they were, from canon rather than from a memory of the walk. It is where they
            stand, not a marker: these people do not move, and knowing Thrali is at the dockyard is
            the kind of thing you would remember about somebody you had met. */}
        <p className="muted people-where">{person.foundAt.map(placeName).join(' · ')}</p>

        {gifts.length > 0 && (
          <ul className="people-gave">
            {gifts.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        )}

        {/* **What helping means, said once.** Knowledge is how you help in this game -- there is no
            favour to run and no reputation -- so this is true exactly when a discovery the player
            finished names them. It is the same test the ending splits on, so the two cannot
            disagree about who was helped. Whether they would *come* is the ending's to reveal. */}
        {helped && <p className="people-helped">You have been some use to them.</p>}

        {thread && <p className="muted said-more">{thread}</p>}
      </div>
    </li>
  );
}

/** A point of interest's name. Empty rather than the raw id for one canon never defined. */
function placeName(poiId: string): string {
  return poi(poiId)?.name ?? '';
}
