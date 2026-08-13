// The last page: who would come with you, who would not, and what you put back.
//
// The design points at this the whole way through — knowledge is how you help, so the people
// you can gather are exactly the ones your finished discoveries named — and until now
// `gatherable()` had no caller anywhere. The rule was written and tested and unreachable, which
// is the third time that has happened in this codebase and the most expensive, because it was
// the ending.
//
// Two decisions worth stating, because both could reasonably have gone the other way:
//
//   **Nothing is locked and nothing is spent.** You can read this page at any point, including
//   before you have helped anybody, and reading it does not finish the game. This is a cozy
//   game with no fail states, and an ending you can walk up to, look at, and walk away from
//   suits it better than a commitment you cannot take back.
//
//   **The refusals are the point, not the shortfall.** Four of the ten people in the game will
//   not come, each for a reason of their own, and the page gives them their own words and as
//   much room as the ones who accept. A player who reads this should not feel they failed to
//   collect somebody.

import { useEffect, useRef } from 'react';
import { type Progress, gatherable, linesFor, restored, staying } from '../journey';
import { npc, poi } from '../content/places';

export interface EndingProps {
  progress: Progress;
  open: boolean;
  onClose: () => void;
}

/**
 * What somebody says when they turn you down.
 *
 * Their last reachable line. Canon writes a refusal as the deepest thing an NPC says — gated
 * on the discovery that helps them — so the last line available is the one they turn you down
 * with, and it arrives in their voice rather than as a status.
 */
function refusal(progress: Progress, npcId: string): string | null {
  return linesFor(progress, npcId).at(-1)?.text ?? null;
}

export function Ending({ progress, open, onClose }: EndingProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

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

  const coming = gatherable(progress);
  const stays = staying(progress);
  const put = restored(progress);
  const nobody = coming.length === 0 && stays.length === 0;

  return (
    <div className="diary-veil" role="dialog" aria-modal="true" aria-label="If you stopped here">
      <section className="diary diary-filling ending">
        <header className="diary-head">
          <div>
            <h2>If you stopped here</h2>
            <p className="diary-sub">
              {nobody
                ? 'Nobody yet. Understanding something is what makes it possible to help.'
                : `${coming.length} would come. ${stays.length} would stay.`}
            </p>
          </div>
          <button type="button" ref={closeRef} className="diary-close" onClick={onClose}>
            Close
          </button>
        </header>

        {nobody ? (
          <p className="diary-empty">
            You have not finished anything yet. A half-understood thing helps nobody — which is
            not a scolding, only how it works.
          </p>
        ) : (
          <>
            {coming.length > 0 && (
              <section className="diary-section">
                <h3>Coming with you</h3>
                {coming.map((id) => {
                  const who = npc(id);
                  return (
                    <div key={id} className="leaving">
                      <h4>
                        {who?.name} <span className="muted">· {who?.role}</span>
                      </h4>
                    </div>
                  );
                })}
              </section>
            )}

            {/* Given the same weight as the acceptances, deliberately. Four people refuse and
                the ending is better for every one of them. */}
            {stays.length > 0 && (
              <section className="diary-section">
                <h3>Staying</h3>
                {stays.map((id) => {
                  const who = npc(id);
                  const said = refusal(progress, id);
                  return (
                    <div key={id} className="leaving">
                      <h4>
                        {who?.name} <span className="muted">· {who?.role}</span>
                      </h4>
                      {said && (
                        <p className="said">
                          <span aria-hidden="true">“</span>
                          {said}
                          <span aria-hidden="true">”</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </section>
            )}

            {put.length > 0 && (
              <section className="diary-section">
                <h3>Put back</h3>
                <ul className="plainlist">
                  {put.map((id) => (
                    <li key={id}>{poi(id)?.name ?? id}</li>
                  ))}
                </ul>
              </section>
            )}

            <p className="ending-note">
              None of this is spent. Close the page and the country is where you left it.
            </p>
          </>
        )}
      </section>
    </div>
  );
}

/** How many people would come, so a caller can label a way in without reaching into Progress. */
export function endingCount(progress: Progress): number {
  return gatherable(progress).length + staying(progress).length;
}
