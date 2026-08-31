// The two buttons in the corner, and what is behind them.
//
// The mockup has no header, no seed field and no legend on screen — the map is the screen. But a
// seeded game still needs a way to change its seed, and a map of coloured tiles still needs a key.
// So they move behind a single button and open as a sheet over the map, which is closed the great
// majority of the time.

import { useState } from 'react';
import { EventBus } from '../game/EventBus';
import { biomes } from '../content/species';
import { SeedBar } from './SeedBar';

export interface ControlsProps {
  seed: string;
  onGenerate: (seed: string) => void;
  /** How many species have been met. Shown on the button; the album is its own surface. */
  metCount: number;
  onOpenCollection: () => void;
  /** How many discoveries are under way, so the button can say the diary has something in it. */
  diaryCount: number;
  onOpenDiary: () => void;
  /** How many kinds of thing are carried. Zero is a real state and the button still shows. */
  carryCount: number;
  /** True when the tile under foot has something on it, so the button can lead the player to it. */
  somethingUnderfoot: boolean;
  onOpenSatchel: () => void;
  /** How many things this place can make that open ground cannot. Zero out in the field. */
  offeredHere: number;
  onOpenWorkshop: () => void;
  onOpenOverworld: () => void;
  /** The field notes along the bottom. Closable like everything else now. */
  notesOpen: boolean;
  onToggleNotes: () => void;
  /** The authored place under foot, if any — the button is only useful when standing on one. */
  placeName: string | null;
  placeOpen: boolean;
  onTogglePlace: () => void;
}

export function Controls({
  seed,
  onGenerate,
  metCount,
  onOpenCollection,
  diaryCount,
  onOpenDiary,
  carryCount,
  somethingUnderfoot,
  onOpenSatchel,
  offeredHere,
  onOpenWorkshop,
  onOpenOverworld,
  notesOpen,
  onToggleNotes,
  placeName,
  placeOpen,
  onTogglePlace
}: ControlsProps) {
  const [sheet, setSheet] = useState(false);

  return (
    <>
      <div className="controls">
        {/* Only offered where there is something to stand in. A button that is present but
            dead everywhere teaches the player to ignore it. */}
        {placeName && (
          <button
            type="button"
            className={placeOpen ? 'control control-on' : 'control'}
            aria-pressed={placeOpen}
            aria-label={`${placeName}, ${placeOpen ? 'showing' : 'hidden'}`}
            onClick={onTogglePlace}
          >
            <span aria-hidden="true">◈</span>
            <span className="control-label">Here</span>
          </button>
        )}

        <button
          type="button"
          className={notesOpen ? 'control control-on' : 'control'}
          aria-pressed={notesOpen}
          aria-label={`Field notes, ${notesOpen ? 'showing' : 'hidden'}`}
          onClick={onToggleNotes}
        >
          <span aria-hidden="true">✒</span>
          <span className="control-label">Notes</span>
        </button>

        <button type="button" className="control" aria-label="Where to go" onClick={onOpenOverworld}>
          <span aria-hidden="true">◇</span>
          <span className="control-label">Travel</span>
        </button>

        <button
          type="button"
          className="control"
          aria-label={diaryCount ? `Diary, ${diaryCount} under way` : 'Diary'}
          onClick={onOpenDiary}
        >
          <span aria-hidden="true">✎</span>
          <span className="control-label">
            Diary{diaryCount > 0 && <i className="control-count">{diaryCount}</i>}
          </span>
        </button>

        {/* Always present, unlike the collection button. An empty satchel is not an empty room:
            the panel's first section is what is under foot, so it has something to say from the
            first step — which is also how a player finds out that gathering exists at all. */}
        <button
          type="button"
          className={somethingUnderfoot ? 'control control-on' : 'control'}
          aria-label={
            somethingUnderfoot
              ? `Satchel, ${carryCount} carried, something under foot`
              : `Satchel, ${carryCount} carried`
          }
          onClick={onOpenSatchel}
        >
          <span aria-hidden="true">◑</span>
          <span className="control-label">
            Satchel{carryCount > 0 && <i className="control-count">{carryCount}</i>}
          </span>
        </button>

        {/* Making has its own button because it is a different verb from carrying, and it lights
            up where the ground can work a material -- six of canon's seventeen processes need a
            settlement, and this badge is the first place a player is ever told so.
            **Only where there is something to carry or somewhere that can work it.** A seventh
            permanent control wrapped the bar onto a third row at 360px, which
            `reachable.spec.ts` refuses on the grounds that a bar that tall is a wall rather than
            a bar. Nothing is lost by hiding it: with an empty satchel out in the open there is
            genuinely nothing behind it, and the moment either becomes true it appears. */}
        {(offeredHere > 0 || carryCount > 0) && (
          <button
            type="button"
            className={offeredHere > 0 ? 'control control-on' : 'control'}
            aria-label={
              offeredHere > 0 ? `Workshop, ${offeredHere} can be made here` : 'Workshop'
            }
            onClick={onOpenWorkshop}
          >
            <span aria-hidden="true">⚒</span>
            <span className="control-label">
              Workshop{offeredHere > 0 && <i className="control-count">{offeredHere}</i>}
            </span>
          </button>
        )}

        {/* Only once something has been met. Before that it is a button onto an empty room, and
            the starting tile seeds the collection, so it appears almost immediately anyway. */}
        {metCount > 0 && (
          <button
            type="button"
            className="control"
            aria-label={`Collection, ${metCount} met`}
            onClick={onOpenCollection}
          >
            <span aria-hidden="true">❧</span>
            <span className="control-label">
              Met<i className="control-count">{metCount}</i>
            </span>
          </button>
        )}

        <button
          type="button"
          className="control"
          // Named here rather than by the text inside, because on a short screen the CSS hides the
          // label and leaves the button reading as "☰" to anything that cannot see it.
          aria-label="Map"
          aria-expanded={sheet}
          onClick={() => setSheet((open) => !open)}
        >
          {/* Text rather than an icon font: two glyphs are not worth a dependency, and a label
              reads to a screen reader without extra markup. */}
          <span aria-hidden="true">☰</span>
          <span className="control-label">Map</span>
        </button>
      </div>

      {/* Zoom. A mouse has a wheel and a keyboard has +/-, but a phone has neither, and pinch is
          not something anyone thinks to try on a map that fits the screen already. */}
      <div className="zoom">
        <button
          type="button"
          className="control"
          aria-label="Zoom in"
          onClick={() => EventBus.emitEvent('zoom', { step: 1 })}
        >
          +
        </button>
        <button
          type="button"
          className="control"
          aria-label="Zoom out"
          onClick={() => EventBus.emitEvent('zoom', { step: -1 })}
        >
          −
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
          <p className="muted">
            Zoom with the <kbd>+</kbd> and <kbd>−</kbd> buttons, the mouse wheel, or a pinch.{' '}
            <kbd>0</kbd> fits the map to the screen again.
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

          {metCount > 0 && <h3>Met so far ({metCount})</h3>}
        </div>
      )}
    </>
  );
}
