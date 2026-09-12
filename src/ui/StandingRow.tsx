// What is actually on the tile you are standing on, at the height you spend the walk in.
//
// **The fault this answers, measured.** At `peek` the dock's whole text was the biome's
// description and the surroundings -- *"You can make out forest to the east, coast to the west and
// south, and river to the north"* -- then two verbs. `.journal-notes` is `display: none` at that
// height, which was a deliberate call about prose, and it takes **all** of the tile's content with
// it: the animal, what the animal is doing, the plant, and the material. The `Work the ground`
// chip's own detail line (`"Dung cake."`) is hidden there too, so the verb was on screen and the
// object of it was not. Everything a player is deciding about lived one press of the handle away.
//
// **So at peek the surroundings give up their place to this, and it is a trade rather than an
// addition.** That sentence is about everywhere *except* here. At the one height whose whole job is
// what is in front of you, the panel was describing the horizon.
//
// The creature carries its routine, because *feeding* against *asleep* is the difference between a
// stalk that works and one the game refuses -- `blockedReason` reads the same fact -- and that was
// the single most useful line hidden by the fold.
//
// **Nothing in this row is a button, and that reverses what the plan asked for.**
// `docs/ui-affordances-plan.md` proposed every chip as a target: the creature opening its plate,
// the material opening the take. Built that way, two things went wrong and the second one decided
// it.
//
// The rail's `Work the ground` sits about forty pixels below this row, so a material chip that
// took would be **two controls for one act** -- which is exactly how taking a reed once ended up
// inside the satchel, the arrangement `TileActions` was written to end.
//
// And a tappable chip owes the interface's 44-pixel floor, where a readout owes 26. Measured on a
// 390-pixel phone, one plate-opening chip took the row from **57 pixels to 75** and pushed the
// third chip out of the dock at peek -- the row spending, on being pressable, the room it exists to
// buy. A chip that hid the thing it was there to show would have been the fault in a new place.
//
// So the division is the one the dock already makes everywhere else: **this row says what is here,
// and the rail says what you can do about it.** Looking closer at a painted plate keeps its place
// in the notes at reading height, where the picture has room to be a picture.
//
// Presentation only. `takeableAt` decides what the ground still holds, `journal.ts` writes the
// creature and plant, and `routineFor` decides what the animal is doing; nothing here computes any
// of it.

import type { FieldNote } from '../content/journal';
import type { Haul } from '../content/gathering';
import { speciesMark } from './SpeciesIcon';

export interface StandingRowProps {
  /** The animal on this tile, already written. */
  creature: FieldNote;
  /** What it is doing right now, or empty when there is nothing to say. */
  doing: string;
  /** What grows here. */
  flora: FieldNote;
  /** What the ground still has to give, from `takeableAt`. */
  standing: readonly Haul[];
}

export function StandingRow({ creature, doing, flora, standing }: StandingRowProps) {
  const chips = [
    creature.name ? <Living key="creature" note={creature} doing={doing} /> : null,
    flora.name ? <Living key="flora" note={flora} /> : null,
    ...standing.map((haul) => <Stuff key={haul.material.id} haul={haul} />)
  ].filter(Boolean);

  // Nothing on a bare tile is a real state -- open sea, a salt flat nothing grows on -- and an
  // empty row would be a strip of blank parchment in the place where the tile's content goes.
  // The surroundings line is still there at reading height to say what the ground is.
  if (chips.length === 0) return null;

  return (
    <ul className="standing-row" aria-label="On this ground">
      {chips}
    </ul>
  );
}

/** A creature or a plant: its mark, its name, and for an animal what it is doing. */
function Living({ note, doing }: { note: FieldNote; doing?: string }) {
  // **The routine is trimmed to its verb.** The written line is a sentence -- "The cliff swift is
  // feeding, and has not decided yet whether you matter" -- and a sentence in a chip is a
  // paragraph in a row. The sentence keeps its place in the notes at reading height; this wants
  // the one word that changes what the player can do.
  const verb = doing && note.name ? shortRoutine(doing, note.name) : null;

  return (
    <li className="standing">
      {/* The glyph, never `SpeciesIcon` -- that prefers a painted plate where one exists, and a
          plate is a control that owes the 44-pixel tap floor. See `speciesMark`. */}
      {note.species && (
        <span className="standing-mark" aria-hidden="true">
          {speciesMark(note.species)}
        </span>
      )}
      <span className="standing-name">{note.name}</span>
      {verb && <span className="standing-doing">{verb}</span>}
    </li>
  );
}

/**
 * The verb out of a routine sentence.
 *
 * `journal.ts` writes "The cliff swift is feeding, and has not decided yet whether you matter". The
 * useful half for a chip is "feeding". This takes the clause up to the first comma and drops the
 * subject, and falls back to the whole line rather than to nothing when the sentence is not that
 * shape -- a chip saying slightly too much is better than one that has silently stopped reporting
 * whether an animal is awake.
 */
function shortRoutine(doing: string, name: string): string {
  const clause = doing.split(',')[0]!.trim().replace(/\.$/, '');
  const lead = new RegExp(`^the\\s+${name}\\s+is\\s+`, 'i');
  const trimmed = clause.replace(lead, '');
  return trimmed === clause ? clause : trimmed;
}

/** One material the ground still holds, with how much of it comes up. */
function Stuff({ haul }: { haul: Haul }) {
  return (
    <li className="standing standing-stuff">
      <span className="standing-mark" aria-hidden="true">
        ❖
      </span>
      <span className="standing-name">{haul.material.name}</span>
      {haul.count > 1 && <span className="standing-doing">×{haul.count}</span>}
    </li>
  );
}
