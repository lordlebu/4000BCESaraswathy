// The field notes along the bottom of the screen: where you are, and what is here.
//
// The floor of the `Here` surface — what the traveller is looking at *right now*, on every
// step, authored place or bare tile. A place panel layers over these; the travel log, which is
// about the whole trip rather than this moment, is a separate thing entirely.
//
// Presentation only — every string arrives already written.

import type { ReactNode } from 'react';
import type { FieldNote, JournalEntry } from '../content/journal';

/**
 * A specimen label: what it is called, and what it is.
 *
 * A description list rather than two paragraphs, because that is precisely the shape of the
 * content — a term and its description — and it reads that way to a screen reader too. With
 * nothing to record there is no term, so the empty-handed line stands on its own.
 */
function Note({ note }: { note: FieldNote }) {
  if (!note.name) return <p className="note-empty">{note.note}</p>;
  return (
    <dl className="note">
      <dt>{note.name}</dt>
      <dd>{note.note}</dd>
    </dl>
  );
}

export interface JournalPanelProps {
  entry: JournalEntry | null;
  surroundings: string;
  hint: string;
  /** Where there is still something to see, and where to sleep. Empty when there is nothing. */
  whereNext: string;
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
          <h2>{entry.title}</h2>
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
          <Note note={entry.creature} />
        </div>
        <div>
          <h3>Growing here</h3>
          <Note note={entry.flora} />
        </div>
      </div>

      {memory && <p className="memory">{memory}</p>}

      {children}

      <footer className="journal-foot">
        <p className={atLandmark ? 'status status-arrived' : 'status'}>{hint}</p>
        {/* Rendered only when it has something to say. An empty paragraph still takes vertical
            space in a panel that is deliberately tight on a phone. */}
        {whereNext && <p className="status status-next">{whereNext}</p>}
        <p className="muted">{discovered} places discovered.</p>
      </footer>
    </section>
  );
}
