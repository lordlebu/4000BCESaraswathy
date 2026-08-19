// What Varuna carries.
//
// **A kit, deliberately not an inventory.** There are no slots, no weight, nothing to pick up and
// nothing to run out of. Every piece is here from the first step and stays for the whole journey.
//
// The distinction matters. Consumables would open lamp oil, dry tinder and rope -- real resource
// pressure, a reason to return to a settlement, and the spine of a survival game. This one opens
// "Combat is absent by design" and has no experience points because the diary is the progression
// system. A kit gives the mechanical thing that was actually needed -- somewhere to sleep when
// there is no roof -- without importing the genre that comes with managing it.
//
// Canon owns none of this. Canon has no item concept at all; its only `artifacts` are the three
// story masks. That is the right split: canon says what exists in the world, the game says what
// the traveller brought with him.

/** One piece of the kit. */
export interface KitItem {
  id: string;
  name: string;
  /** What it is, in the diary's register -- an object described, not a stat line. */
  description: string;
  /** What it lets the player do, said plainly. Null where it is scenery. */
  affords: string | null;
}

/**
 * Everything Varuna carries, in the order a person would list it.
 *
 * The staff and the notebook were already true before this file existed: `docs/art-brief.md` draws
 * him with satchel straps and a staff, and the diary has been the whole game since the beginning.
 * Naming them here is admitting what was already on screen rather than adding anything.
 */
export const KIT: readonly KitItem[] = [
  {
    id: 'bedroll',
    name: 'Bedroll',
    description:
      'Oiled cloth over a reed mat, rolled and strapped under the satchel. It has been rained on.',
    affords: 'Sleep on open ground, if there is nowhere better.'
  },
  {
    id: 'lamp',
    name: 'Oil lamp',
    description:
      'A closed clay lamp with a shielded wick, the kind that survives being carried. It throws about an arm of light.',
    affords: 'Keep writing after dark, though not well.'
  },
  {
    id: 'notebook',
    name: 'Field diary',
    description:
      'Bound, and about a third full. The crossings-out are the useful part; a first guess is worth keeping once it is wrong.',
    affords: null
  },
  {
    id: 'staff',
    name: 'Walking staff',
    description:
      'Shoulder height, worn smooth at the grip. Good for testing what will hold your weight before you stand on it.',
    affords: null
  }
];

/** Whether the traveller carries something. Always true today; the shape is what matters. */
export function carries(id: string): boolean {
  return KIT.some((item) => item.id === id);
}

/** The kit entries that do something, for a panel that would rather not list the scenery. */
export function useful(): readonly KitItem[] {
  return KIT.filter((item) => item.affords !== null);
}
