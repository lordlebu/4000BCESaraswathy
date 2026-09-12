// One painted plate, at the size it was painted.
//
// **Twenty watercolour plates existed and nothing in the game ever showed one larger than 120
// pixels.** In the collection — the screen whose entire job is looking back over what you have met
// — a plate was drawn at `2.4em`, about 38 pixels, as punctuation beside a name. The files are
// 384 square. Ninety per cent of every painting was being thrown away at the one moment a player
// had gone looking for it.
//
// So a plate is now a way in. Press it in the album or in the field notes and the painting opens
// at full size with what canon wrote about the animal underneath it.
//
// **The shape is the activity card's, deliberately.** Picture at the top, body below, centred,
// `min(24rem, 100%)`, the world stopped behind it. That card is the one place this interface
// already got right — a player looks at a drawing and then reads — and a second thing worth
// looking at should not invent a second way of being looked at.
//
// **A plate is required rather than optional.** There is no "specimen view with no picture": the
// mark beside an unplated species stays exactly the mark it was, and nothing opens. A branch for
// the case that cannot happen is how this codebase has three times ended up with something built,
// tested, believed and wired to nothing.

import { useState } from 'react';
import { metSpecies } from '../content/species';
import type { Creature, Flora } from '../world/types';
import { plateFor } from './plates';
import { Modal } from './Modal';

/** Fauna carry a mood; flora do not. The same narrowing the album makes, for the same reason. */
function moodOf(species: Creature | Flora): string | null {
  return 'mood' in species ? species.mood : null;
}

export interface SpecimenProps {
  /** The engine id — `river-otter`, not `fauna_river_otter`. See `plates.ts`. */
  speciesId: string;
  /** The painting. Required: this view exists to show one. */
  plate: string;
  open: boolean;
  onClose: () => void;
}

export function Specimen({ speciesId, plate, open, onClose }: SpecimenProps) {
  const species = metSpecies(speciesId);
  if (!species) return null;

  const mood = moodOf(species);

  return (
    <Modal
      open={open}
      label={species.name}
      onClose={onClose}
      veilClassName="diary-veil plate-card-veil"
    >
      <section className="plate-card">
        {/* Decorative: the name is directly below it and a screen reader announcing the species
            twice is worse than announcing it once. The same call every mark in this interface
            makes. */}
        <img className="plate-card-image" src={plate} alt="" aria-hidden="true" />

        <div className="plate-card-body">
          <h2 className="plate-card-name">{species.name}</h2>
          {species.binomial && <p className="plate-card-binomial">{species.binomial}</p>}

          {/* The prose canon authored. It has been in the bundle from the beginning and has never
              had a screen wide enough to sit on. */}
          <p className="plate-card-prose">{species.journalPrompt}</p>

          <p className="plate-card-facts">
            <span>{species.region.replace(/_/g, ' ')}</span>
            <span>{species.rarity}</span>
            {mood && <span>{mood}</span>}
          </p>

          <button type="button" className="ghost plate-card-close" onClick={onClose}>
            Close the plate
          </button>
        </div>
      </section>
    </Modal>
  );
}

export interface PlateButtonProps {
  /** The engine id. Nothing renders when this species has no plate. */
  speciesId: string;
  /** What the species is called, for the control's name. */
  name: string;
  /** Which drawing this is — the thumbnail in a list, or the pasted-in one in the field notes. */
  variant: 'mark' | 'note';
}

/**
 * A plate that can be opened, wherever one is drawn small.
 *
 * **It owns its own open state.** Threading a callback up through `JournalPanel`, `Here` and
 * `App` to reach two `<img>` tags would put a piece of view state in the component that holds the
 * journey, and the surface reducer is deliberately about *panels* rather than about which picture
 * somebody tapped.
 *
 * Renders `null` when there is no plate, which is 277 of canon's 297 species. Callers draw their
 * mark as they always did; this is an addition to the twenty that have a painting, not a
 * replacement for the way the rest are shown.
 */
export function PlateButton({ speciesId, name, variant }: PlateButtonProps) {
  const [open, setOpen] = useState(false);
  const plate = plateFor(speciesId);
  if (!plate) return null;

  return (
    <>
      <button
        type="button"
        className={`plate-open plate-open-${variant}`}
        // Says what pressing it does, not what it is. A control reading "River Otter" gives a
        // screen reader the name a second time and no idea that anything happens.
        aria-label={`${name} — see the plate`}
        onClick={() => setOpen(true)}
      >
        <img src={plate} alt="" aria-hidden="true" loading="lazy" />
      </button>

      <Specimen speciesId={speciesId} plate={plate} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
