// Seed entry. A form, so Enter works as well as the button.
//
// **Reported from play: it was hard to tell what a seed is or which one to choose.** The fix is the
// one most seeded games settled on -- a line saying what the field means, and a button that picks
// one for you -- rather than a redesign. Nothing else about the sheet moved.

import { useState } from 'react';
import { randomSeed } from './seed';

export interface SeedBarProps {
  seed: string;
  onGenerate: (seed: string) => void;
}

export function SeedBar({ seed, onGenerate }: SeedBarProps) {
  const [draft, setDraft] = useState(seed);

  return (
    <form
      className="seed-bar"
      onSubmit={(event) => {
        event.preventDefault();
        const next = draft.trim();
        if (next) onGenerate(next);
      }}
    >
      <label htmlFor="seed">Journey seed</label>
      <input
        id="seed"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        spellCheck={false}
        autoComplete="off"
      />
      <button type="submit">Generate map</button>
      <button
        type="button"
        className="seed-random"
        onClick={() => {
          const next = randomSeed();
          setDraft(next);
          onGenerate(next);
        }}
      >
        New random map
      </button>
      <p className="seed-hint">
        A seed is the name of a map: the same seed always makes the same land, so you can share it.
        Changing it starts a fresh walk on new ground.
      </p>
    </form>
  );
}
