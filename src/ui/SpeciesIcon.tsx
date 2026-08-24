// The mark beside a species name, until it has a painted plate.
//
// Twenty animals have real watercolour plates. The other 236 animals and all 90 plants get an
// emoji, chosen from **what canon says the species is** — its clade or its growth form — rather
// than from anything worked out here.
//
// **This file used to guess, and the guessing is what it cost.** Two classifiers matched keywords
// against names and binomials, roughly four hundred lines of them, and between them they were
// wrong nineteen times that anybody checked:
//
//   * an Asura-tainted owl drawn as a ghost, because `asuricus` outranked `Bubo`;
//   * a baby crocodile as a mammal, because `Camelosuchus` starts with `camel`;
//   * a feathered dinosaurid as a cricket, because `Silvanus` is also a beetle genus;
//   * three mongooses as the crabs and centipedes they are named for;
//   * two trailing gourds as cacti, three lichens as moss, two corals and two seagrasses as
//     seaweed.
//
// Every one was a name being read as though it were a fact. None of them can happen now, because
// the fact is in the data: canon requires `clade` on all 256 fauna and `growth_form` on all 90
// flora, its linter refuses a species without one, and `canon.ts` carries them onto the runtime
// record. Adding a species to canon no longer requires editing a keyword list in this repository —
// which it did, and which drew two Shringasaurus as unidentified footprints until somebody noticed.
//
// What is left here is the one thing that is genuinely the game's: **which glyph**. Canon says a
// creature is a synapsid; it does not say a synapsid looks like 🦣. That is a view decision and it
// belongs on this side of the line.

import type { Clade, GrowthForm } from '../world/types';
import type { SpeciesMark } from '../content/journal';

/**
 * A clade as a mark.
 *
 * `Record<Clade, string>` is doing real work: canon's vocabulary is fixed in
 * `database/clades.json` and mirrored in the `Clade` type, so adding a sixteenth clade there and
 * forgetting it here fails the build rather than rendering nothing.
 *
 * Three worth defending. `synapsid` takes the mammoth because there is no Dimetrodon emoji and
 * never will be, and what a player needs is "large archaic beast, mammal side". `construct` takes
 * the moai — a body made rather than born. `spectre` is the only one canon would call obvious.
 */
export const CLADE_MARK: Record<Clade, string> = {
  mammal: '🐾',
  synapsid: '🦣',
  bird: '🐦',
  dinosaur: '🦖',
  crocodilian: '🐊',
  reptile: '🦎',
  amphibian: '🐸',
  fish: '🐟',
  insect: '🦗',
  arachnid: '🕷️',
  crustacean: '🦀',
  mollusc: '🐚',
  cnidarian: '🪼',
  worm: '🪱',
  construct: '🗿',
  spectre: '👻'
};

/**
 * A growth form as a mark.
 *
 * The named exceptions below sit above this table, not in it: bamboo is a grass and 🌾 is not
 * wrong, but 🎋 is *bamboo*.
 */
export const FORM_MARK: Record<GrowthForm, string> = {
  tree: '🌳',
  palm: '🌴',
  shrub: '🪴',
  vine: '🍃',
  flower: '🌸',
  grass: '🌾',
  root: '🫚',
  fern: '🌿',
  moss: '🍀',
  lichen: '🪨',
  cactus: '🌵',
  seaweed: '🪸',
  coral: '🐚',
  pitcher: '🪤'
};

/**
 * Plants whose own name beats their form, checked first.
 *
 * The only place a name is still read — and it is read for the *mark*, never for what the plant
 * is. Canon has already said that. Getting one of these wrong makes a bamboo look like ordinary
 * grass; getting the old classifier wrong made a mongoose into a crab.
 *
 * Matched on whole words, because `tea` is inside `teak` and *Iron-Teak* is a timber tree.
 */
const NAMED: [string[], string][] = [
  [['taro', 'yam', 'tuber'], '🫜'],
  [['ginger', 'turmeric', 'curcuma', 'zingiber'], '🫚'],
  [['bamboo', 'bambusa'], '🎋'],
  [['tea'], '🍵'],
  [['pine', 'cedar', 'conifer', 'fir'], '🎍'],
  [['lotus', 'nelumbo'], '🪷']
];

function plantMark(plant: Extract<SpeciesMark, { growthForm: GrowthForm }>): string {
  const words = new Set(
    `${plant.binomial ?? ''} ${plant.name}`
      .toLowerCase()
      .split(/[^\p{L}]+/u)
      .filter(Boolean)
  );
  for (const [terms, mark] of NAMED) {
    if (terms.some((term) => words.has(term))) return mark;
  }
  return FORM_MARK[plant.growthForm];
}

export interface SpeciesIconProps {
  /** Just enough of the species to draw a mark — see `SpeciesMark` in `content/journal.ts`. */
  species: SpeciesMark;
}

// There is no `kind` prop any more. Callers used to pass 'creature' or 'flora' so this could pick
// a classifier; the mark now comes from whichever canon field the record carries, so the record
// already says which half it is and a second opinion could only disagree with it.

/**
 * The mark for one species.
 *
 * Presentational only: it carries no label, because the name it sits beside already says what the
 * species is, and a screen reader announcing "tree icon, Mappa Mundi Banyan" is worse than one
 * announcing the name alone.
 */
export function SpeciesIcon({ species }: SpeciesIconProps) {
  const mark = 'clade' in species ? CLADE_MARK[species.clade] : plantMark(species);

  return (
    <span className="species-emoji" aria-hidden="true">
      {mark}
    </span>
  );
}
