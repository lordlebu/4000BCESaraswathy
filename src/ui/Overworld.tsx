// The travel layer: which country you are in, and what you can reach from it.
//
// This used to say a drawn map would be "the engine making up canon", and it was right at the
// time: canon stated the edges between field maps and nothing else -- no coordinates, no routes,
// no distances. Canon now holds coordinates, so drawing them is reading canon rather than
// inventing it, and the noun/verb line is intact. The geometry is worked out in
// `content/overworldMap.ts`, which is pure and tested; this file only paints it.
//
// **The list stays.** It is the accessible rendering -- `e2e/reachable.spec.ts` requires every
// control to be a 40px target at six viewport sizes, and an SVG node is not that. The drawing
// sits above it as orientation, and every place remains reachable by a real button underneath.

import { fieldMap, fieldMaps, neighboursOf, poisOn } from '../content/places';
import { labelAnchor, nodeFor, overworldShape, viewBoxFor } from '../content/overworldMap';
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

/**
 * The continent, drawn.
 *
 * Orientation rather than navigation: nothing here is clickable, because the buttons below are
 * the way to travel and two ways to do one thing is two things to keep in step.
 *
 * The viewBox is fitted to the placed maps rather than set to canon's full 0-100 square. Four
 * maps never fill that square, and drawing it whole left a band of empty page below the
 * continent as tall as the continent itself.
 */
function OverworldSketch({ current, reachable }: { current: string; reachable: string[] }) {
  const shape = overworldShape();
  if (shape.nodes.length === 0) return null;

  const near = new Set(reachable);
  return (
    <section className="diary-section">
      <h3>The country</h3>
      <svg
        className="overworld-sketch"
        viewBox={viewBoxFor(shape)}
        role="img"
        aria-label="A sketch of the known world, with roads between the places you can walk to."
      >
        {shape.edges.map((e) => {
          const a = nodeFor(shape, e.from)!;
          const b = nodeFor(shape, e.to)!;
          return (
            <line
              key={`${e.from}|${e.to}`}
              className="overworld-road"
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
            />
          );
        })}
        {shape.nodes.map((n) => {
          const state =
            n.id === current ? 'overworld-here' : near.has(n.id) ? 'overworld-near' : 'overworld-far';
          return (
            <g key={n.id} className={state}>
              <circle className="overworld-dot" cx={n.x} cy={n.y} r={n.id === current ? 4 : 3} />
              {/* The outermost labels anchor inward, or the easternmost name runs off the
                  viewBox -- padding is in canon's units and a name's width is in glyphs. */}
              <text
                className="overworld-name"
                x={n.x}
                y={n.y - 6}
                textAnchor={labelAnchor(shape, n)}
              >
                {n.name}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
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

        <OverworldSketch current={current} reachable={reachable.map((m) => m.id)} />

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
