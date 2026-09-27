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

import { useRef } from 'react';
import { type Progress, gatherable, linesFor, restored, staying } from '../journey';
import { npc, poi } from '../content/places';
import { Modal } from './Modal';
import { art } from './art';

export interface EndingProps {
  progress: Progress;
  /**
   * The homestead settled on this map, when there is one: it heads the page, with the painting of
   * the people moving in and what canon says of it, and the page speaks for this map's people only.
   * Null before settling, when the page is the old "if you stopped here".
   */
  /**
   * The settled map. `fieldMapId` picks its own painting, `settle-home-<map>` (`settle-home-dwarka`),
   * when the owner has painted one, and the shared `settle-home` -- Lothal's mill among the trees --
   * until then.
   */
  settlement?: { name: string; prose: string; people: readonly string[]; fieldMapId?: string } | null;
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

export function Ending({ progress, settlement = null, open, onClose }: EndingProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape, the focus trap and putting focus back belong to `Modal`. What stays here is where
  // focus *starts* — the way out, which is this panel's own judgement rather than a mechanic.

  if (!open) return null;

  // Settled, the page is about this map: who moves in here and who stays where they are.
  const here = (id: string) => !settlement || settlement.people.includes(id);
  const coming = gatherable(progress).filter(here);
  const stays = staying(progress).filter(here);
  const own = settlement?.fieldMapId ? `settle-home-${settlement.fieldMapId.replace(/^field_map_/, '')}` : null;
  const picture = settlement ? ((own && art('events', own)) || art('events', 'settle-home')) : null;
  const put = restored(progress);
  const nobody = coming.length === 0 && stays.length === 0;

  return (
    <Modal open label={settlement ? settlement.name : 'If you stopped here'} onClose={onClose} initialFocus={closeRef}>
      <section className="diary diary-filling ending">
        {picture && <img className="ending-picture" src={picture} alt="" aria-hidden="true" />}
        <header className="diary-head">
          <div>
            <h2>{settlement ? settlement.name : 'If you stopped here'}</h2>
            {settlement && <p className="ending-settled">{settlement.prose}</p>}
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
                <h3>{settlement ? 'Moving in' : 'Coming with you'}</h3>
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
    </Modal>
  );
}

/** How many people would come, so a caller can label a way in without reaching into Progress. */
export function endingCount(progress: Progress): number {
  return gatherable(progress).length + staying(progress).length;
}
