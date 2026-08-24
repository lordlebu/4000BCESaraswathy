// The field notes along the bottom of the screen: where you are, and what is here.
//
// The floor of the `Here` surface — what the traveller is looking at *right now*, on every
// step, authored place or bare tile. A place panel layers over these; the travel log, which is
// about the whole trip rather than this moment, is a separate thing entirely.
//
// Presentation only — every string arrives already written.

import type { ReactNode } from 'react';
import type { FieldNote, JournalEntry } from '../content/journal';
import { SpeciesIcon } from './SpeciesIcon';
import { plateFor } from './plates';

/**
 * A specimen label: what it is called, and what it is.
 *
 * A description list rather than two paragraphs, because that is precisely the shape of the
 * content — a term and its description — and it reads that way to a screen reader too. With
 * nothing to record there is no term, so the empty-handed line stands on its own.
 */
function Note({ note, kind }: { note: FieldNote; kind: 'creature' | 'flora' }) {
  if (!note.name) return <p className="note-empty">{note.note}</p>;

  // A painted plate if one exists for this animal, and a mark on the line if not.
  //
  // Two shapes rather than one, because they are not the same thing at different sizes. The mark
  // is punctuation beside a name -- it belongs on the line, at text height, and says no more than
  // "crocodile" or "grass". A plate is a picture and wants a block of its own, the way
  // `endgame.png` frames it.
  //
  // Canon holds 297 species and a plate is a session's work each, so the mark is the normal case
  // and the plate is the exception. Adding one takes no code: see `plates.ts`.
  // Creatures only. Plants are named with an emoji on the line -- see `SpeciesIcon` -- and that is
  // a decision about what a plant *is* in the notes, not a queue that has not reached them yet.
  // Reading `kind` here rather than relying on there being no flora plates keeps it that way: drop
  // `neem.png` into src/ui/plates/ and it still will not open a block in the field notes.
  const plate = kind === 'creature' && note.species ? plateFor(note.species.id) : null;

  return (
    <dl className={plate ? 'note note-plated' : 'note'}>
      <dt>
        {!plate && note.species && <SpeciesIcon species={note.species} />}
        <span>{note.name}</span>
      </dt>
      <dd>
        {plate && (
          // Decorative: the name and the note beside it already say what this is, and a screen
          // reader announcing the species a third time is worse than one announcing it twice.
          <img className="note-plate" src={plate} alt="" aria-hidden="true" loading="lazy" />
        )}
        {note.note}
      </dd>
    </dl>
  );
}

/**
 * What the button says, which is the whole of how shelter is explained.
 *
 * No tooltip, no legend, no icon: the label tells the player what kind of night this will be
 * before they commit to it, in the same voice everything else here uses.
 */
const SHELTER_LABEL: Record<string, string> = {
  roof: 'Sleep under the roof',
  camp: 'Make camp for the night',
  bedroll: 'Unroll the bedding here',
  none: 'Sit out the night'
};

export interface JournalPanelProps {
  entry: JournalEntry | null;
  surroundings: string;
  hint: string;
  /** Where there is still something to see, and where to sleep. Empty when there is nothing. */
  whereNext: string;
  /** How tired the traveller is, or null when there is nothing to say. */
  fatigue: string | null;
  /** A word about the fading light, or null while there is plenty. */
  dusk: string | null;
  /** The best shelter here: a roof, a camp, or his own bedroll. */
  shelter: 'roof' | 'camp' | 'bedroll' | 'none';
  /** Whether stopping for the night would do anything. */
  canCamp: boolean;
  onCamp: () => void;
  discovered: number;
  atLandmark: boolean;
  memory: string;
  /**
   * Canon, when a service is listening.
   *
   * It sits here rather than in a panel of its own because it answers the same question these
   * notes do — what is here — only from the corpus instead of the bundle. It used to float
   * inside the travel log, which is about the whole trip and so was never where a reader would
   * look for it.
   */
  children?: ReactNode;
}

export function JournalPanel({
  entry,
  surroundings,
  hint,
  whereNext,
  fatigue,
  dusk,
  shelter,
  canCamp,
  onCamp,
  discovered,
  atLandmark,
  memory,
  children
}: JournalPanelProps) {
  if (!entry) {
    return (
      <section className="journal" aria-live="polite">
        <p className="muted">Unrolling the map…</p>
      </section>
    );
  }

  return (
    <section className="journal" aria-live="polite">
      <header className="journal-head">
        <div>
          {/* The dingbat is decorative and says so: the heading beside it already names the
              place, and a screen reader announcing "flower, Wetland at 28, 29" is worse. */}
          <h2>
            <span className="journal-mark" aria-hidden="true">
              &#10047;
            </span>
            {entry.title}
          </h2>
          <p className="journal-place">{entry.description}</p>
        </div>
      </header>

      <p className="surroundings">{surroundings}</p>

      {/* Side by side where there is room, stacked where there is not — see styles.css. */}
      <div className="journal-notes">
        <div>
          <h3>Creatures</h3>
          {/* Reserved height: this is the one line that changes on its own, and a panel that
              resizes as the day turns drags the camera with it. */}
          {entry.doing && <p className="doing">{entry.doing}</p>}
          <Note note={entry.creature} kind="creature" />
        </div>
        <div>
          <h3>Growing here</h3>
          <Note note={entry.flora} kind="flora" />
        </div>
      </div>

      {memory && <p className="memory">{memory}</p>}

      {children}

      <footer className="journal-foot">
        <p className={atLandmark ? 'status status-arrived' : 'status'}>{hint}</p>
        {/* Rendered only when it has something to say. An empty paragraph still takes vertical
            space in a panel that is deliberately tight on a phone. */}
        {whereNext && <p className="status-next">{whereNext}</p>}
        {dusk && <p className="status-dusk">{dusk}</p>}
        {fatigue && <p className="status-tired">{fatigue}</p>}
        {canCamp && (
          <button type="button" className="camp-button" onClick={onCamp}>
            {SHELTER_LABEL[shelter]}
          </button>
        )}
        <p className="muted">{discovered} places discovered.</p>
      </footer>
    </section>
  );
}
