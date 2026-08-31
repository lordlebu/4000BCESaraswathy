// The mark beside a material, an item or a craft.
//
// `SpeciesIcon` does this for the 346 things that grow and move; this does it for the 123 that
// are made, carried and used. Same division, and it is the one that matters: **canon says what
// a thing is, and this file says what it looks like.** Canon states that magma-glass is `glass`
// and that a harpoon `cut`s and `deter`s; it has no opinion about 🔪, and should not.
//
// So there is no name-matching here at all, and there never was — this file is new, and it is
// new *after* `SpeciesIcon` spent four hundred lines guessing a species from its binomial and
// getting it wrong nineteen times. The lesson arrived before the code did, which is the one
// piece of luck in the whole exchange.
//
// **`Record<K, string>` over a union is doing real work.** The three vocabularies below are
// fixed in canon — `material_classes.json`, `affordances.json` and the `kind` enum on
// `item.schema.json` — and mirrored into types in `content/making.ts`. Add a nineteenth material
// class there and forget it here, and the build fails rather than the panel rendering a gap.

import type { ItemKind, MaterialClass } from '../content/making';
import { markFor, type MarkKind } from './marks';

/**
 * What a material is, as a mark.
 *
 * Chosen for what the stuff *is* rather than what it becomes: `fibre` is the retted stem and not
 * the rope, `bone` is the bone and not the awl. The item marks below carry the made object, and
 * a satchel showing the same glyph for reed fibre and reed rope would be telling the player they
 * are the same thing at the exact moment they are learning that they are not.
 *
 * Two worth defending. `physic` takes the mortar rather than a pill or a cross, because canon's
 * are bitter barks and scraped resins and nothing in this world is dispensed. `filtration` has no
 * material of its own — it is a plant *use* — so it is absent here on purpose.
 */
export const CLASS_MARK: Record<MaterialClass, string> = {
  fibre: '🧵',
  timber: '🪵',
  bone: '🦴',
  hide: '🟫',
  shell: '🐚',
  resin: '🍯',
  clay: '🟤',
  stone: '🪨',
  glass: '🔷',
  metal: '🥉',
  salt: '🧂',
  pigment: '🎨',
  grain: '🌾',
  produce: '🫐',
  flesh: '🐟',
  oil: '🫗',
  fuel: '🔥',
  physic: '⚱️',
  // Added when canon did. `spice` is its own class rather than a `produce` for the reason
  // `salt` is: three cardamom pods scent a whole pot, which makes it a thing you trade across
  // a continent where produce is a thing you eat where it grew.
  spice: '🌶️',
  // A sealed jar, not a skull. Canon records poisons as substances and has no vocabulary for
  // harm at all -- nothing can be made of one except medicine -- so a mark that read as a
  // threat would say more than canon does.
  poison: '🫙'
};

/**
 * What an item is for, as a mark.
 *
 * Keyed on `kind` rather than on `affords`, and the difference is deliberate: a thing has one
 * kind and several affordances, so a mark drawn from affordances would need a precedence rule —
 * and the first time a spear afforded `trade` before `cut` it would silently become a coin.
 *
 * `weapon` takes the spear, which is the most a cozy game should say about one. Canon has no
 * vocabulary for damage and this file adds none: 🗡️ would read as a stat line where 🔱 reads as
 * an object somebody carries.
 */
export const KIND_MARK: Record<ItemKind, string> = {
  tool: '🔨',
  weapon: '🔱',
  container: '🏺',
  textile: '🧺',
  food: '🍲',
  physic: '🌿',
  light: '🪔',
  record: '📜',
  ornament: '📿',
  shelter: '⛺'
};

/**
 * What a process is, as a mark.
 *
 * The seventeen ways canon says a thing gets made. These were the last uncovered vocabulary in
 * the making layer -- a recipe wore the mark of its output and the *verb* had none, so the
 * workshop could not say what a bench was for.
 *
 * **Thirteen of the seventeen have an emoji that genuinely fits. Four do not**, and they are
 * exactly the crafts Unicode never had reason to encode: casting bronze, grinding at a quern,
 * pressing oil, and retting flax in standing water. Those four take a drawn mark from
 * `src/ui/marks/` -- `process-casting.svg` and so on -- and fall back to the nearest honest
 * emoji until one arrives. Nothing is blocked while they are missing.
 *
 * Chosen for the *action* rather than its product, which is the same division the material and
 * item tables already make: `firing` is the kiln, not the pot that comes out of it, because a
 * player reading the workshop is looking for what a place lets them do.
 */
export const PROCESS_MARK: Record<string, string> = {
  boatbuilding: '🛶',
  brewing: '🍶',
  carving: '🪚',
  cooking: '🍲',
  drying: '☀️',
  firing: '🏺',
  gathering: '🧺',
  knapping: '🪨',
  purifying: '💧',
  smelting: '🔥',
  spinning: '🧵',
  tanning: '🐄',
  weaving: '🧶',
  // The four with no true emoji. A quern is not a gear and a press is not an olive, so these are
  // stand-ins that say roughly the right thing and are the first four files worth drawing.
  casting: '🫗',
  grinding: '⚙️',
  pressing: '🫒',
  retting: '🌾'
};

/** The four processes whose emoji is a stand-in rather than a fit. Drawn art replaces these first. */
export const PROCESSES_WANTING_ART: readonly string[] = ['casting', 'grinding', 'pressing', 'retting'];

/**
 * A vehicle's kind, as a mark.
 *
 * Canon's `kind` is coarse on purpose — a raft from a ship, not a dhow from a ketch — so these
 * are coarse too. `machine` covers the Ekranoplan and the Survival Train, which have nothing in
 * common but being built rather than grown, and that is exactly what the cog says.
 */
export const VEHICLE_MARK: Record<string, string> = {
  raft: '🪵',
  boat: '🛶',
  ship: '⛵',
  cart: '🛒',
  sled: '🛷',
  machine: '⚙️'
};

/** A material's mark, from the first class canon gives it. */
export function materialMark(classes: readonly MaterialClass[]): string {
  return CLASS_MARK[classes[0] ?? 'stone'] ?? '🪨';
}

export interface ThingIconProps {
  mark: string;
  /**
   * The vocabulary word this stands for, so a drawn mark can replace the emoji.
   *
   * Optional: a caller that has no word still gets its emoji, which is what every caller did
   * before `marks.ts` existed. Given one, a file in `src/ui/marks/` named `class-fibre.svg` is
   * drawn instead -- see that file for why the namespace is part of the name.
   */
  word?: { namespace: MarkKind; value: string };
  /**
   * What it is, for a screen reader.
   *
   * The glyph is decoration — the name is always beside it in every panel that uses this — so the
   * image is labelled with the category rather than the name, which would otherwise be read
   * twice. `SpeciesIcon` makes the same call.
   */
  label: string;
}

export function ThingIcon({ mark, label, word }: ThingIconProps) {
  const drawn = word ? markFor(word.namespace, word.value) : null;
  if (drawn) {
    // `alt` is empty and the label goes on the wrapper, so a screen reader hears the category
    // once rather than twice -- the same call the emoji branch makes below.
    return (
      <span className="thing-mark" role="img" aria-label={label}>
        <img className="thing-mark-drawn" src={drawn} alt="" />
      </span>
    );
  }
  return (
    <span className="thing-mark" role="img" aria-label={label}>
      {mark}
    </span>
  );
}
