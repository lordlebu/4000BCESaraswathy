// The two buttons in the corner, and what is behind them.
//
// The mockup has no header, no seed field and no legend on screen — the map is the screen. But a
// seeded game still needs a way to change its seed, and a map of coloured tiles still needs a key.
// So they move behind a single button and open as a sheet over the map, which is closed the great
// majority of the time.
//
// **The bar is four buttons and two that come and go.** It was seven, which is two rows and 96
// pixels of a 390-pixel phone -- and `reachable.spec.ts` already refused a third row on the grounds
// that a bar that tall is a wall. The two that left are the ones that decide what is *on screen*
// rather than what the traveller *does*: they are in the sheet now, under "What is on screen",
// beside the seed and the legend. Nothing was taken away.

import { useState } from 'react';
import { EventBus } from '../game/EventBus';
import { biomes } from '../content/species';
import { SeedBar } from './SeedBar';
import { TravellerPicker } from './TravellerPicker';
import { Modal } from './Modal';

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

        {/* **Notes and Carrying are not here any more.** They are the two controls in this bar that
            do not *do* anything -- they decide what is on screen -- and the bar was two rows and 96
            pixels on a 390px phone with them in it. They are in the map sheet now, under "What is
            on screen", which is where the seed and the legend already live.

            Neither was removed, and that matters: the ribbon's off switch was reported from play,
            and a player who wants nothing but the map still has both. What changed is that the dock
            rests at peek and the strip is as wide as what it holds, so neither is the obstruction
            that made somebody ask. */}

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

      {/* No veil: this is a panel in a corner rather than a page over the world, and giving it a
          backdrop would have been a visible change in a stage that promised none. It gets the
          trap, the Escape and the focus restore all the same -- it had none of the three. */}
      <Modal
        open={sheet}
        label="Map and journey"
        onClose={() => setSheet(false)}
        veilClassName={null}
      >
        <div className="sheet">
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

          <h3>What is on screen</h3>
          <ul className="showing-list">
            <li>
              <button
                type="button"
                className={notesOpen ? 'showing is-on' : 'showing'}
                aria-pressed={notesOpen}
                onClick={onToggleNotes}
              >
                <span aria-hidden="true">✒</span>
                Field notes
              </button>
            </li>
            <li>
              <button
                type="button"
                className={satchelRibbon ? 'showing is-on' : 'showing'}
                aria-pressed={satchelRibbon}
                onClick={onToggleSatchelRibbon}
              >
                <span aria-hidden="true">◑</span>
                What you are carrying
              </button>
            </li>
          </ul>

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
      </Modal>
    </>
  );
}
