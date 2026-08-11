// "Ask the canon" — the one thing the walk cannot answer from its own bundle.
//
// The journal already knows what is on this tile, because the species table ships with the
// game. What it cannot do is search the whole corpus: the events, the settlements, the
// characters, the region a creature belongs to. That lives in the canon database and is
// reachable only through the service.
//
// The panel renders nothing at all when no service is listening, which is the normal case
// for anyone who just cloned the repo and ran `npm run dev`.

import { useCallback, useState } from 'react';
import { askAbout, loreFor, type CanonLore, type CanonStatus, type Place } from './canonClient';

export interface CanonPanelProps {
  place: Place | null;
  status: CanonStatus;
}

export function CanonPanel({ place, status }: CanonPanelProps) {
  const [lore, setLore] = useState<CanonLore | null>(null);
  const [busy, setBusy] = useState<'lore' | 'ask' | null>(null);
  const [asked, setAsked] = useState(false);

  const consult = useCallback(async () => {
    if (!place) return;
    setBusy('lore');
    setAsked(false);
    setLore(await loreFor(place));
    setBusy(null);
  }, [place]);

  const write = useCallback(async () => {
    if (!place) return;
    setBusy('ask');
    const body = await askAbout(place);
    if (body) setLore((previous) => ({ ...(previous ?? body), ...body }));
    setAsked(true);
    setBusy(null);
  }, [place]);

  if (!status.lore || !place) return null;

  return (
    <section className="canon" aria-label="Canon">
      <div className="canon-actions">
        <button type="button" onClick={consult} disabled={busy !== null}>
          {busy === 'lore' ? 'Consulting…' : 'Ask the canon'}
        </button>
        {lore && status.ask && (
          <button type="button" onClick={write} disabled={busy !== null}>
            {busy === 'ask' ? 'Writing…' : 'Write a passage'}
          </button>
        )}
      </div>

      {lore && (
        <>
          {lore.sources.length > 0 && (
            <ul className="canon-sources">
              {lore.sources.map((s) => (
                <li key={s.entity_id}>
                  <span className="canon-name">{s.name ?? s.entity_id}</span>
                  <span className="canon-type">{s.type}</span>
                  <span className="canon-distance">{s.distance.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
          {lore.passage && <p className="canon-passage">{lore.passage}</p>}
          {asked && !lore.passage && (
            <p className="canon-note">
              The chronicler had nothing to say. Retrieval above is what canon actually holds.
            </p>
          )}
        </>
      )}
    </section>
  );
}
