// What shape a plant is, worked out from what it is called.
//
// Ninety flora, and the collection shows every one of them as a name and a paragraph. An icon
// beside each would turn a list into a field guide -- but drawing ninety is not the job, and canon
// records no visual field to read.
//
// What canon does record, on every single entry, is a name and a binomial. Those carry the shape:
// a banyan is a tree, a lotus is a flower, saltreed is a grass, and Linnaean names are even more
// explicit about it than common ones. So the form is *derived*, not authored, and adding a plant to
// canon gets it an icon for free.
//
// The honest limits of that, stated rather than hidden:
//
//   * It is keyword matching. It reads `Mappa Mundi Banyan` and finds `banyan`; it has no idea what
//     the plant looks like beyond that.
//   * Canon's invented plants are where it is weakest, because they are named for what they *do*
//     rather than what they are -- `Static-Charged Bramble`, `Memory-Weave Lichen`. Those need
//     their own keyword or they fall through.
//   * A plant that falls through is not a bug to hide. `unknown` draws a plain sprig, which is
//     honest about not knowing. Every one of the ninety in the bundle today classifies, and
//     `test/growthForm.test.ts` asserts exactly that -- so canon growing a plant this cannot read
//     fails the build with its name rather than being silently drawn as a generic smudge.
//
// If this ends up carrying real weight, the right answer is a `growth_form` field in canon: a
// noun, so it belongs there under the project's own rule. This module is the evidence for whether
// that is worth doing.

/** The shapes a plant can take. Ordered by how the matcher should try them, not alphabetically. */
export type GrowthForm =
  | 'tree'
  | 'palm'
  | 'vine'
  | 'flower'
  | 'grass'
  | 'fern'
  | 'moss'
  | 'shrub'
  | 'root'
  | 'cactus'
  | 'seaweed'
  | 'pitcher'
  | 'unknown';

/**
 * Keywords per form, checked against the name and binomial together.
 *
 * Order matters. `palm` is tried before `tree` because a date palm is both and the palm silhouette
 * is the more useful one; `pitcher` before `flower` for the same reason. Within a form the terms
 * are ordinary words first, Linnaean roots second.
 */
const FORM_KEYWORDS: [GrowthForm, string[]][] = [
  // Carnivorous plants first: they are flowers and vines by name, and neither icon would say so.
  ['pitcher', ['pitcher', 'nepenthes', 'carnivor', 'flytrap']],
  // Palms read as a distinct silhouette from a broad canopy, so they are pulled out of `tree`.
  ['palm', ['palm', 'arecac', 'phoenix dactyl', 'coco']],
  ['tree', [
    'tree', 'banyan', 'fig', 'teak', 'pine', 'mangrove', 'acacia', 'sandalwood', 'neem',
    'tamarind', 'mahua', 'bonewood', 'oak', 'cedar', 'timber', 'ficus', 'terminalia',
    'shorea', 'azadirachta', 'santalum', 'madhuca', 'tamarindus'
  ]],
  ['vine', ['vine', 'creeper', 'liana', 'strangler', 'moonseed', 'pepper', 'piper', 'convolvul', 'bramble']],
  ['cactus', ['cactus', 'succulent', 'gourd', 'euphorb', 'cactac', 'aloe']],
  ['seaweed', ['seaweed', 'coral', 'reef', 'algae', 'kelp', 'sargass', 'laminar']],
  ['fern', ['fern', 'frond', 'bracken', 'pteris', 'adiant', 'polypod']],
  ['moss', ['moss', 'lichen', 'liverwort', 'bryo', 'sphagn', 'cladon']],

  ['grass', [
    'grass', 'reed', 'barley', 'rice', 'bamboo', 'sedge', 'cane', 'oryza', 'hordeum',
    'bambus', 'phragmit', 'saccharum', 'cyper'
  ]],
  // Before `flower`, because `Lotus-Root Taro` carries both words and it is the root that is the
  // plant -- the part dug up, eaten and traded. A name naming two parts means the specific one.
  ['root', ['root', 'tuber', 'taro', 'ginger', 'rhizome', 'shilajit', 'curcuma', 'zingiber', 'colocasia']],
  ['flower', ['lotus', 'rose', 'orchid', 'flower', 'oleander', 'bloom', 'lily', 'nelumbo', 'nymphae', 'jasmin', 'marigold']],
  ['shrub', [
    'shrub', 'bush', 'scrub', 'thorn', 'saltbush', 'sagebrush', 'tulsi', 'indigo', 'turmeric',
    'myrrh', 'frankincense', 'tea', 'mint', 'herb', 'leaf', 'weed', 'basil', 'ocimum',
    'indigofera', 'artemisia', 'salvia', 'boswellia', 'commiphora'
  ]]
];

/**
 * The shape of a plant, from its name and binomial.
 *
 * Case-insensitive substring matching on both fields at once, which is crude and works: canon's
 * names are descriptive by house style, so `Giant Bird-Nest Fern` and `Iron-Root Mangrove` both
 * say what they are.
 */
export function growthFormOf(plant: { name: string; binomial: string | null }): GrowthForm {
  const haystack = `${plant.binomial ?? ''} ${plant.name}`.toLowerCase();
  for (const [form, keywords] of FORM_KEYWORDS) {
    if (keywords.some((word) => haystack.includes(word))) return form;
  }
  return 'unknown';
}

/**
 * A stable number from an id, for choosing between variants of one form.
 *
 * Two plants that are both trees should not be the same picture, and the difference has to survive
 * a reload -- so it is hashed from the id rather than drawn from a counter or a random. Same
 * constants as `world/rng.ts`, for the same reason: this world's variation is always reproducible.
 */
export function speciesHash(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
