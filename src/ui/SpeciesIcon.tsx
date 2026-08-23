// The mark beside a species name, until it has a painted plate.
//
// Every species in the collection and the field notes gets one. Twenty animals have real
// watercolour plates; the other 199 animals and all 90 plants get an emoji, chosen from what the
// creature *is* — its body plan or its growth form — rather than from a per-species list that
// would go stale the moment canon grew.
//
// **This used to be drawn, and the reasoning for that is worth keeping because it was good and it
// was still wrong.** There were twenty-six hand-built SVG marks: thirteen growth forms and
// thirteen body plans, each on a 24×24 grid, tinted with the ink of the biome the species lives in
// and varied per species so that two trees were not the same picture. The argument against emoji
// was exactly that — a bitmap glyph is always the same colour, so colouring by habitat is lost,
// and the repertoire has no mangrove and no pitcher plant.
//
// What that argument missed is what the mark is *for*. It is not a picture of the species; the
// plate is, and the plate is what the panel gives a block of its own to. The mark is punctuation
// beside a name — it says "plant" or "crocodile" and then gets out of the way. An SVG next to text
// can be made small but never stops reading as a graphic in a slot; an emoji is incidental by
// nature, which is the whole requirement. Losing colour-by-biome costs a grouping cue on one
// panel. `git log` has the paths if a drawn mark is ever wanted again.

import { animalEmojiFor } from '../content/bodyPlan';
import { emojiFor } from '../content/growthForm';
import type { Flora } from '../world/types';

export interface SpeciesIconProps {
  species: Pick<Flora, 'id' | 'name' | 'binomial' | 'biomes'>;
  /** Which half of the collection this is. The two halves use different classifiers. */
  kind: 'creature' | 'flora';
}

/**
 * The mark for one species.
 *
 * Presentational only: it carries no label of its own, because the name it sits beside already
 * says what the species is, and a screen reader announcing "tree icon, Mappa Mundi Banyan" is
 * worse than one announcing the name alone.
 *
 * There is deliberately no `size`. The old drawn mark took one because it had to line up with a
 * 22px row; a glyph should sit on the text baseline like any other character, and the CSS keeps it
 * there. A caller that wants it bigger should change the text size around it.
 */
export function SpeciesIcon({ species, kind }: SpeciesIconProps) {
  return (
    <span className="species-emoji" aria-hidden="true">
      {kind === 'flora' ? emojiFor(species) : animalEmojiFor(species)}
    </span>
  );
}
