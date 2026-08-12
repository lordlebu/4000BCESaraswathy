// The travel layer: which country you are in, and what you can reach from it.
//
// Deliberately not a drawn map. Canon states the edges between field maps and nothing else —
// no coordinates, no routes, no distances — and inventing a geography here would be the engine
// making up canon. A list of named places and where each one leads is the honest rendering of
// what is actually authored, and it stays correct when a third map appears.

import { fieldMap, fieldMaps, neighboursOf, poisOn } from '../content/places';
import { discoveriesAt } from '../content/knowledge';
import { isComplete, rungOf, type Progress } from '../journey';

export interface OverworldProps {
  current: string;
  progress: Progress;
  open: boolean;
  onTravel: (fieldMapId: string) => void;
  onClose: () => void;
}

/** What the player has done here, so a place they have worked reads differently from a new one. */
function standing(progress: Progress, fieldMapId: string): { seen: number; done: number; of: number } {
  const ids = poisOn(fieldMapId).flatMap((p) => discoveriesAt(p.id).map((d) => d.id));
  const unique = [...new Set(ids)];
  return {
    seen: unique.filter((id) => rungOf(progress, id) >= 0).length,
    done: unique.filter((id) => isComplete(progress, id)).length,
    of: unique.length
  };
}

export function Overworld({ current, progress, open, onTravel, onClose }: OverworldProps) {
  if (!open) return null;

  const here = fieldMap(current);
  const reachable = neighboursOf(current);

  return (
    <div className="diary-veil" role="dialog" aria-modal="true" aria-label="Where to go">
      <section className="diary diary-filling">
        <header className="diary-head">
          <div>
            <h2>Where to go</h2>
            <p className="diary-sub">{here ? `You are on ${here.name}.` : 'Nowhere in particular.'}</p>
          </div>
          <button type="button" className="diary-close" onClick={onClose}>
            Close
          </button>
        </header>

        <section className="diary-section">
          <h3>From here</h3>
          {reachable.length === 0 ? (
            <p className="muted">
              Nothing is authored beyond this place yet. The road exists; the country at the end
              of it has not been written.
            </p>
          ) : (
            reachable.map((m) => {
              const s = standing(progress, m.id);
              return (
                <div key={m.id} className="look">
                  <div className="look-text">
                    <h4>{m.name}</h4>
                    <p className="muted">
                      {m.scale === 'large' ? 'A wide country' : 'A small place'} ·{' '}
                      {s.seen === 0
                        ? 'you have not been'
                        : `${s.done} of ${s.of} understood`}
                    </p>
                  </div>
                  <button type="button" onClick={() => onTravel(m.id)}>
                    Travel
                  </button>
                </div>
              );
            })
          )}
        </section>

        {/* Everywhere else canon knows about, including places not joined to this one. Shown
            rather than hidden: a naturalist knows the plateau exists before they can walk to it. */}
        {fieldMaps.length > reachable.length + 1 && (
          <section className="diary-section">
            <h3>Elsewhere</h3>
            {fieldMaps
              .filter((m) => m.id !== current && !reachable.some((r) => r.id === m.id))
              .map((m) => (
                <p key={m.id} className="muted">
                  {m.name} — no road from here.
                </p>
              ))}
          </section>
        )}
      </section>
    </div>
  );
}
