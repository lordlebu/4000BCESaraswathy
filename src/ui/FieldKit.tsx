// The field kit: what a thing is, what else touches it, and how two of them differ.
//
// Phase 07 named four investigation tools. Three of them — Classify, Cross-reference and
// Compare — turned out to be structured queries over the canon bundle the game already inlines,
// so they are instant and work with the network off. `investigate.ts` has had them, tested,
// since the question workbench landed; this is the surface they were missing. (The fourth,
// free-text Research, is the only one that needs the retrieval service and is not built.)
//
// The rule the whole panel obeys: **it only ever discusses things the player has met.** The
// specimens listed are the subjects of discoveries they have noticed, and cross-reference shows
// only what they have found. A tool that answered questions about the rest of canon would be a
// spoiler engine wearing a lab coat.

import { useState } from 'react';
import { type CanonSource, searchCanon } from './canonClient';
import { classify, compare, crossReference, speciesFor } from '../content/investigate';
import { discoveries, discovery, fieldQuestion } from '../content/knowledge';
import { rungOf, type Progress } from '../journey';

/** The canon entities the player has met, via the discoveries they have noticed. */
export function specimensIn(progress: Progress): string[] {
  const seen = discoveries
    .filter((d) => d.subject && rungOf(progress, d.id) >= 0)
    .map((d) => d.subject!);
  return [...new Set(seen)];
}

function nameOf(canonId: string): string {
  return speciesFor(canonId)?.name ?? canonId.replace(/^[a-z]+_/, '').replace(/_/g, ' ');
}

export interface FieldKitProps {
  progress: Progress;
  open: boolean;
  onClose: () => void;
  /**
   * Whether a canon service is listening.
   *
   * The fourth tool is the only one that needs the network, so it is the only one that can be
   * absent. When it is, nothing about it is rendered — an input that always fails teaches a
   * player to distrust the panel it sits in.
   */
  canResearch: boolean;
}

export function FieldKit({ progress, open, onClose, canResearch }: FieldKitProps) {
  // Two slots rather than a mode switch: picking one thing classifies it, picking a second
  // compares them. The tool's shape follows what the player is doing rather than a toolbar.
  const [picked, setPicked] = useState<string[]>([]);
  const [asked, setAsked] = useState('');
  const [found, setFound] = useState<CanonSource[] | null>(null);
  const [looking, setLooking] = useState(false);

  async function research(e: { preventDefault: () => void }) {
    e.preventDefault();
    setLooking(true);
    const body = await searchCanon(asked);
    // A null body means the service is unreachable rather than that nothing matched, and the
    // two deserve different words.
    setFound(body ? body.sources : []);
    setLooking(false);
  }

  if (!open) return null;

  const specimens = specimensIn(progress);
  const [first, second] = picked;
  const classification = first ? classify(progress, first) : null;
  const links = first ? crossReference(progress, first) : null;
  const differences = first && second ? compare(first, second) : [];

  const toggle = (id: string) =>
    setPicked((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id].slice(-2)
    );

  return (
    <div className="diary-veil" role="dialog" aria-modal="true" aria-label="Field kit">
      <section className="diary diary-filling">
        <header className="diary-head">
          <div>
            <h2>Field Kit</h2>
            <p className="diary-sub">
              {specimens.length === 0
                ? 'Nothing to examine yet.'
                : 'Pick one to look it up. Pick a second to set them side by side.'}
            </p>
          </div>
          <button type="button" className="diary-close" onClick={onClose}>
            Close
          </button>
        </header>

        {specimens.length === 0 ? (
          <p className="diary-empty">
            The kit works on things you have looked at. Go and notice something first.
          </p>
        ) : (
          <>
            <section className="diary-section">
              <h3>Specimens</h3>
              <div className="specimens">
                {specimens.map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={picked.includes(id)}
                    className={picked.includes(id) ? 'specimen picked' : 'specimen'}
                    onClick={() => toggle(id)}
                  >
                    {nameOf(id)}
                  </button>
                ))}
              </div>
            </section>

            {classification && (
              <section className="diary-section">
                <h3>What it is</h3>
                <h4>{classification.name}</h4>
                {classification.facts.length > 0 ? (
                  <dl className="facts">
                    {classification.facts.map((f) => (
                      <div key={f.label}>
                        <dt>{f.label}</dt>
                        <dd>{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="muted">Canon holds no specimen record for this — it is a place or a people.</p>
                )}
                {/* Deliberately includes work not yet done: knowing a discipline has looked at
                    something and that you have not is a lead, not a spoiler. */}
                <p className="muted">
                  {classification.studiedBy.filter((s) => s.found).length} of{' '}
                  {classification.studiedBy.length} lines of enquiry begun.
                </p>
              </section>
            )}

            {links && (links.discoveries.length > 0 || links.questions.length > 0) && (
              <section className="diary-section">
                <h3>What it touches</h3>
                <ul className="plainlist">
                  {links.discoveries.map((id) => (
                    <li key={id}>{discovery(id)?.name}</li>
                  ))}
                  {links.questions.map((id) => (
                    <li key={id}>
                      <em>{fieldQuestion(id)?.question.split(/(?<=[.?])\s/)[0]}</em>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {differences.length > 0 && (
              <section className="diary-section">
                <h3>Side by side</h3>
                <div className="scroll">
                  <table className="compare">
                    <thead>
                      <tr>
                        <th />
                        <th>{nameOf(first!)}</th>
                        <th>{nameOf(second!)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {differences.map((row) => (
                        <tr key={row.field} className={row.same ? 'same' : 'differs'}>
                          <th scope="row">{row.field}</th>
                          <td>{row.a}</td>
                          <td>{row.b}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="muted">
                  The answer is rarely in one row. It is usually in which row is the only one
                  that differs.
                </p>
              </section>
            )}

            {canResearch && (
              <section className="diary-section">
                <h3>Research</h3>
                <form className="research" onSubmit={research}>
                  <input
                    type="search"
                    value={asked}
                    aria-label="Ask canon a question"
                    placeholder="Has anything like this been seen before?"
                    onChange={(e) => setAsked(e.target.value)}
                  />
                  <button type="submit" disabled={!asked.trim() || looking}>
                    {looking ? 'Looking' : 'Look it up'}
                  </button>
                </form>
                {found && (
                  found.length === 0 ? (
                    <p className="muted">Canon has nothing near that.</p>
                  ) : (
                    <ul className="plainlist">
                      {found.map((s) => (
                        <li key={s.entity_id}>
                          {s.name ?? s.entity_id} <span className="muted">· {s.type}</span>
                        </li>
                      ))}
                    </ul>
                  )
                )}
                <p className="muted">
                  This asks the whole corpus, not your diary — it will name things you have not
                  found, which is what a reference is for.
                </p>
              </section>
            )}

            {first && second && differences.length === 0 && (
              <p className="muted">
                These two cannot be set side by side — canon keeps a specimen record for only
                one of them.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
