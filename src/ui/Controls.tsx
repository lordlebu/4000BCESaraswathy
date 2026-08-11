// The two buttons in the corner, and what is behind them.
//
// The mockup has no header, no seed field and no legend on screen — the map is the screen. But a
// seeded game still needs a way to change its seed, and a map of coloured tiles still needs a key.
// So they move behind a single button and open as a sheet over the map, which is closed the great
// majority of the time.

import { useState } from 'react';
import { biomes } from '../content/species';
import { SeedBar } from './SeedBar';

export interface ControlsProps {
  seed: string;
  onGenerate: (seed: string) => void;
  observed: string[];
  logOpen: boolean;
  onToggleLog: () => void;
}

export function Controls({ seed, onGenerate, observed, logOpen, onToggleLog }: ControlsProps) {
  const [sheet, setSheet] = useState(false);

  return (
    <>
      <div className="controls">
        <button
          type="button"
          className="control"
          aria-expanded={sheet}
          onClick={() => setSheet((open) => !open)}
        >
          {/* Text rather than an icon font: two glyphs are not worth a dependency, and a label
              reads to a screen reader without extra markup. */}
          <span aria-hidden="true">☰</span>
          <span className="control-label">Map</span>
        </button>
        <button type="button" className="control" aria-expanded={logOpen} onClick={onToggleLog}>
          <span aria-hidden="true">✦</span>
          <span className="control-label">Journal</span>
        </button>
      </div>

      {sheet && (
        <div className="sheet" role="dialog" aria-label="Map and journey">
          <button
            type="button"
            className="sheet-close"
            onClick={() => setSheet(false)}
            aria-label="Close"
          >
            ×
          </button>

          <h2>South of Tethys</h2>
          <p className="muted">
            Walk with <kbd>WASD</kbd> or the arrow keys, or tap where you want to go.
          </p>

          <h3>Journey seed</h3>
          <SeedBar
            seed={seed}
            onGenerate={(next) => {
              onGenerate(next);
              setSheet(false);
            }}
          />

          <h3>Map legend</h3>
          <ul className="legend-list">
            {biomes.map((biome) => (
              <li key={biome.id}>
                <i className="swatch" style={{ background: biome.color }} aria-hidden="true" />
                {biome.name}
              </li>
            ))}
          </ul>

          {observed.length > 0 && (
            <>
              <h3>Field sketches ({observed.length})</h3>
              <ul className="sketch-list">
                {observed.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </>
  );
}
