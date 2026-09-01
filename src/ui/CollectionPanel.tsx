// The album: flora and fauna the traveller has met.
//
// A collection, not a checklist. Nothing here gates anything -- no discovery requires an entry,
// `journey.ts` never reads it, and `check_playability.py` does not know it exists. That is what
// lets it be read for pleasure and closed with nothing lost.
//
// It fills rather than unlocks: entries appear as species are met, and species never met are
// simply absent. Showing the ~350 unmet ones as locked silhouettes would turn a record of one
// walk into a completion target, which is the opposite of the point.
//
// This is where canon's authored `journalPrompt` prose finally has room. It has been shipping
// in the bundle all along, rendered as a one-line note beside a creature name.
//
// Presentation, plus one optional network call. The species records come from the bundle, so
// every entry is fully readable offline; asking canon only ever adds.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  type Collection,
  type Meeting,
  countOf,
  everythingMet,
  size
} from '../content/collection';
import { metSpecies } from '../content/species';
import { byBiome, matches } from '../content/album';
import { TERRAIN_ORDER } from '../game/frames';
import { searchCanon, type CanonSource } from './canonClient';
import type { Creature, Flora } from '../world/types';
import { SpeciesIcon } from './SpeciesIcon';

/** Fauna carry a mood; flora do not. Narrower than a cast, and it is the only difference shown. */
function moodOf(species: Creature | Flora): string | null {
  return 'mood' in species ? species.mood : null;
}

interface EntryProps {
  meeting: Meeting;
  /** Whether a canon service is listening. Absent is the normal case. */
  canAsk: boolean;
}

function Entry({ meeting, canAsk }: EntryProps) {
  const species = metSpecies(meeting.id);
  const [open, setOpen] = useState(false);
  const [sources, setSources] = useState<CanonSource[] | null>(null);
  const [asking, setAsking] = useState(false);

  const ask = useCallback(async () => {
    if (!species) return;
    setAsking(true);
    // A bounded question in the player's own words, not an open box. The service answers "what
    // does canon hold about this" well; it has no honest answer to "what does it eat", and its
    // failure mode is silence, which reads as broken rather than as out of scope.
    const body = await searchCanon(`${species.name} ${species.binomial ?? ''}`.trim());
    // Null means unreachable rather than nothing found, and the two deserve different words.
    setSources(body ? body.sources : []);
    setAsking(false);
  }, [species]);

  // A species in the collection that is not in the bundle means the two fell out of step --
  // worth saying plainly rather than rendering a blank card.
  if (!species) {
    return (
      <li className="met-entry">
        <h4>{meeting.id}</h4>
        <p className="muted">This one is no longer in the field guide.</p>
      </li>
    );
  }

  const mood = moodOf(species);

  return (
    <li className="met-entry">
      <div className="met-head">
        {/* Plants are read by one vocabulary and animals by another -- a Desert Fox run through
            the botanical matcher came out drawn as a sprig -- so the kind is passed rather than
            guessed. */}
        <SpeciesIcon species={species} />
        <div>
          <h4>{species.name}</h4>
          {species.binomial && <p className="met-binomial">{species.binomial}</p>}
        </div>
      </div>

      {/* The authored prose. It has been in the bundle all along, shown one line at a time. */}
      <p className="met-prose">{species.journalPrompt}</p>

      <p className="met-facts">
        <span>{species.region.replace(/_/g, ' ')}</span>
        <span>{species.rarity}</span>
        {mood && <span>{mood}</span>}
      </p>

      {canAsk && (
        <div className="met-ask">
          {!open ? (
            <button
              type="button"
              className="ghost small"
              onClick={() => {
                setOpen(true);
                void ask();
              }}
            >
              Ask canon about this
            </button>
          ) : asking ? (
            <p className="muted">Looking…</p>
          ) : sources && sources.length > 0 ? (
            <ul className="canon-sources">
              {sources.map((s) => (
                <li key={s.entity_id}>
                  <span className="canon-name">{s.name ?? s.entity_id}</span>
                  <span className="canon-type">{s.type}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              {sources ? 'Canon has nothing else on this one.' : 'Canon could not be reached.'}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export interface CollectionPanelProps {
  collection: Collection;
  open: boolean;
  onClose: () => void;
  /** Whether a canon service is listening. When absent, nothing about asking is rendered. */
  canAsk: boolean;
  /** Tabs, when this panel is one of two records behind one door. See `Records.tsx`. */
  tabs?: ReactNode;
}

export function CollectionPanel({
  collection,
  open,
  onClose,
  canAsk,
  tabs
}: CollectionPanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState('');

  // Escape closes it and focus starts on the way out, matching the diary. This was the one
  // modal without either, which is the sort of inconsistency a keyboard finds immediately and
  // a mouse never does. The map keeps running underneath: a book you opened, not a stopped world.
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

  const met = everythingMet(collection);
  const total = size(collection);

  // Grouped by the ground a thing lives on, and filtered by what has been typed. Both are pure
  // functions in `content/album.ts` -- this panel renders their answers and decides neither.
  const found = met.filter((m) => matches(m, query));
  const groups = byBiome(found, TERRAIN_ORDER);

  return (
    <div className="diary-veil" role="dialog" aria-modal="true" aria-label="Collection">
      <section className="diary diary-filling">
        {tabs}
        <header className="diary-head">
          <div>
            <h2>Collection</h2>
            <p className="diary-sub">
              {total === 0
                ? 'Nothing met yet.'
                : `${countOf(collection, 'creature')} creatures, ${countOf(
                    collection,
                    'flora'
                  )} growing things.`}
            </p>
          </div>
          <button type="button" className="diary-close" ref={closeRef} onClick={onClose}>
            Close
          </button>
        </header>

        {total === 0 ? (
          <p className="diary-empty">
            Walk a while. Whatever is out will find its way in here on its own.
          </p>
        ) : (
          <>
            {/* Search earns its line past about a hundred entries, and a single map holds far
                more than that. Below that it is clutter, so it appears when it is useful. */}
            {total > 20 && (
              <div className="album-search">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a creature or a plant"
                  aria-label="Search the collection"
                />
              </div>
            )}

            {groups.length === 0 ? (
              <p className="diary-empty">Nothing here answers to that name.</p>
            ) : (
              groups.map((group) => (
                <section className="diary-section" key={group.id || 'elsewhere'}>
                  {/* The count is on the heading rather than in the list, because a species
                      appears under every ground it lives on -- so the totals across headings add
                      up to more than the collection holds, and saying so avoids the arithmetic
                      looking wrong. */}
                  <h3>
                    {group.name} <span className="album-count">{group.members.length}</span>
                  </h3>
                  <ul className="met-list">
                    {group.members.map((m) => (
                      <Entry key={`${group.id}:${m.id}`} meeting={m} canAsk={canAsk} />
                    ))}
                  </ul>
                </section>
              ))
            )}
          </>
        )}
      </section>
    </div>
  );
}
