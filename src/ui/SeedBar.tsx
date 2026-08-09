// Seed entry. A form, so Enter works as well as the button.

import { useState } from 'react';

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
    </form>
  );
}
