// What the traveller could be working towards, at the head of the diary
// (`docs/satchel-and-hearth.md`, phase 8).
//
// The dock has room for one line -- the pin, or the next step -- and this is where the rest are
// listed: what is pinned, the next building stage, who has something new to say, and places not yet
// seen. Anything that can be pinned has its Pin or Unpin button here, so a goal is one tap from
// becoming the line in the dock. A readout otherwise; the rules are `content/goals.ts` and
// `content/guide.ts`, asked by App.

export interface GoalRow {
  /** A stable key. */
  id: string;
  line: string;
  /** Present when the row can be pinned or unpinned from here. */
  pin?: { on: boolean; label: string; toggle: () => void };
}

export function GoalsSection({ rows }: { rows: readonly GoalRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="diary-section goals">
      <h3>Goals</h3>
      <ul className="goal-list">
        {rows.map((row) => (
          <li key={row.id} className="goal-row">
            <span className="goal-line">{row.line}</span>
            {row.pin && (
              <button
                type="button"
                className="recipe-pin"
                aria-pressed={row.pin.on}
                aria-label={`${row.pin.on ? 'Unpin' : 'Pin'} ${row.pin.label}`}
                onClick={row.pin.toggle}
              >
                {row.pin.on ? 'Unpin' : 'Pin'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
