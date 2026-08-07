// The travel journal. Presentation only — every string arrives already written.

import type { JournalEntry } from '../content/journal';

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
        <h2>Travel Journal</h2>
        <p className="muted">Unrolling the map…</p>
      </section>
    );
  }

  return (
    <section className="journal" aria-live="polite">
      <h2>{entry.title}</h2>
      <p>{entry.description}</p>
      <p className="surroundings">{surroundings}</p>

      <h3>Creatures</h3>
      <p>{entry.creature}</p>

      <h3>Growing here</h3>
      <p>{entry.flora}</p>

      <button type="button" onClick={onObserve} disabled={!canObserve || alreadySketched}>
        {alreadySketched ? 'Creature sketch recorded' : 'Observe creature'}
      </button>
      {memory && <p className="memory">{memory}</p>}

      <p className={atLandmark ? 'status status-arrived' : 'status'}>{hint}</p>
      <p className="muted">{discovered} places discovered.</p>
    </section>
  );
}
