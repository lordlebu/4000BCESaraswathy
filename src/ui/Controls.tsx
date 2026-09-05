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
import { TravellerPicker } from './TravellerPicker';

export interface ControlsProps {
  seed: string;
  onGenerate: (seed: string) => void;
  /** Who is walking, and how to change it. Appearance only -- see `TravellerPicker`. */
  characterId: string;
  onCharacter: (characterId: string) => void;
  /** How many species have been met. Shown on the button; the album is its own surface. */
  metCount: number;
  /** Whether either record is showing, so the button can read as a toggle. */
  recordsOpen: boolean;
  onOpenRecords: () => void;
  /** How many discoveries are under way, so the button can say the diary has something in it. */
  diaryCount: number;

  /** How many kinds of thing are carried. Zero is a real state and the button still shows. */
  carryCount: number;
  /** True when the tile under foot has something on it, so the button can lead the player to it. */
  /** How many things this place can make that open ground cannot. Zero out in the field. */
  offeredHere: number;
  onOpenWorkshop: () => void;
  onOpenOverworld: () => void;
  /** The field notes along the bottom. Closable like everything else now. */
  notesOpen: boolean;
  onToggleNotes: () => void;
  /** Whether the satchel ribbon is showing. */
  satchelRibbon: boolean;
  onToggleSatchelRibbon: () => void;
  /** The authored place under foot, if any — the button is only useful when standing on one. */
  placeName: string | null;
  placeOpen: boolean;
  onTogglePlace: () => void;
}

export function Controls({
  seed,
  onGenerate,
  characterId,
  onCharacter,
  metCount,
  recordsOpen,
  onOpenRecords,
  diaryCount,

  carryCount,
  offeredHere,
  onOpenWorkshop,
  onOpenOverworld,
  notesOpen,
  onToggleNotes,
  satchelRibbon,
  onToggleSatchelRibbon,
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

        {/* The ribbon has an off switch for the same reason the notes do: the map is the thing
            somebody came to look at, and a permanent band that cannot be dismissed is an
            obstruction rather than a convenience. Reported from play. */}
        <button
          type="button"
          className={satchelRibbon ? 'control control-on' : 'control'}
          aria-pressed={satchelRibbon}
          aria-label={`Satchel ribbon, ${satchelRibbon ? 'showing' : 'hidden'}`}
          onClick={onToggleSatchelRibbon}
        >
          <span aria-hidden="true">◑</span>
          <span className="control-label">Carrying</span>
        </button>

        <button type="button" className="control" aria-label="Where to go" onClick={onOpenOverworld}>
          <span aria-hidden="true">◇</span>
          <span className="control-label">Travel</span>
        </button>

        {/* **One button for both records, tabbed inside.** The diary and the album were two
            controls in a bar that already holds everything a player can *do*, and they are the
            two things a player *has* -- so they compete for a row they do not belong in. The
            badge counts both, because the reason to press it is that either has something new.

            The overworld is not here and should not be: it is a place you travel from rather
            than a record you read, which is why it sits beside Travel. */}
        <button
          type="button"
          className={recordsOpen ? 'control control-on' : 'control'}
          aria-pressed={recordsOpen}
          aria-label={
            diaryCount || metCount
              ? `Records, ${diaryCount} under way, ${metCount} met`
              : 'Records'
          }
          onClick={onOpenRecords}
        >
          <span aria-hidden="true">✎</span>
          <span className="control-label">
            Records
            {diaryCount + metCount > 0 && (
              <i className="control-count">{diaryCount + metCount}</i>
            )}
          </span>
        </button>

        {/* **The satchel button is gone and `SatchelStrip` replaced it.** What you carry is now
            permanently on screen rather than behind a control, which is what an idle game does
            with its resource readout -- clicking the strip still opens the full panel for the
            detail. The badge here also described a panel section that no longer exists: "something
            under foot" pointed at the satchel's gathering row, which moved to the Here screen in
            the phase before this one. */}

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

          <h3>Who you are walking as</h3>
          <TravellerPicker characterId={characterId} onChoose={onCharacter} />

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
