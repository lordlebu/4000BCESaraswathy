// The field notes along the bottom of the screen: where you are, and what is here.
//
// This is what the traveller is looking at *right now*. The journey log — the whole route, the
// sketches, the place at the end of it — floats separately in `JourneyLog.tsx`, because those
// answer different questions and only one of them changes on every step.
//
// Presentation only — every string arrives already written.

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
  discovered: number;
  atLandmark: boolean;
  memory: string;
  canObserve: boolean;
  alreadySketched: boolean;
  onObserve: () => void;
}

export function JournalPanel({
  entry,
  surroundings,
  hint,
  discovered,
  atLandmark,
  memory,
  canObserve,
  alreadySketched,
  onObserve
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
        <button type="button" onClick={onObserve} disabled={!canObserve || alreadySketched}>
          {alreadySketched ? 'Sketch recorded' : 'Observe creature'}
        </button>
      </header>

      <p className="surroundings">{surroundings}</p>

      {/* Side by side where there is room, stacked where there is not — see styles.css. */}
      <div className="journal-notes">
        <div>
          <h3>Creatures</h3>
          <Note note={entry.creature} />
        </div>
        <div>
          <h3>Growing here</h3>
          <Note note={entry.flora} />
        </div>
      </div>

      {memory && <p className="memory">{memory}</p>}

      <footer className="journal-foot">
        <p className={atLandmark ? 'status status-arrived' : 'status'}>{hint}</p>
        <p className="muted">{discovered} places discovered.</p>
      </footer>
    </section>
  );
}
