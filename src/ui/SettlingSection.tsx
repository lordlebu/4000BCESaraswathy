// A map's road to settling, at the top of the diary.
//
// Presentation only: `content/settlingRoad.ts` reads every step off the save. See there for why a
// player needs this page at all -- the first play-through never found that settling existed.

import type { SettlingRoad } from '../content/settlingRoad';

const MARK: Record<string, string> = { done: '✓', now: '→', later: '·' };

export function SettlingSection({ road }: { road: SettlingRoad | null }) {
  if (!road) return null;
  return (
    <section className="diary-section settling-road" aria-label="Settling">
      <h3>Settling: {road.title}</h3>
      {road.steps.length === 0 ? (
        <p className="muted">Nobody settles here. This is a crossing, and the people on it are passing through.</p>
      ) : (
        <ol className="settling-steps">
          {road.steps.map((step) => (
            <li key={step.id} className="settling-step" data-state={step.state}>
              <span className="settling-mark" aria-hidden="true">
                {MARK[step.state]}
              </span>
              <div>
                <b>{step.label}</b>
                {step.state !== 'later' && step.detail.map((line) => <p key={line}>{line}</p>)}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
