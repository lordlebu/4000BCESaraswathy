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
 *
 * `grass` and `seaweed` are above `tree` for a blunter reason: the match is a plain substring, and
 * **`Saltreed` contains the letters of `tree`**. It classified as a tree for as long as this file
 * has existed, which cost nothing while the mark was an abstract silhouette and is obvious the
 * moment a plant is drawn as 🌳 or 🌾. Word boundaries are not the fix — `reed` is mid-word there
 * too, so requiring them would classify it as nothing at all.
 *
 * `seaweed` goes above `grass` rather than merely above `tree`, so that `Antarctic Kelp-Grass`
 * stays marine. It is *Zostera*, a true seagrass rather than an alga, so either answer is
 * defensible botanically — but it grows in the sea, and moving it was a side effect of fixing
 * Saltreed rather than a decision anybody made.
 */
const FORM_KEYWORDS: [GrowthForm, string[]][] = [
  // Carnivorous plants first: they are flowers and vines by name, and neither icon would say so.
  ['pitcher', ['pitcher', 'nepenthes', 'carnivor', 'flytrap']],
  // Palms read as a distinct silhouette from a broad canopy, so they are pulled out of `tree`.
  ['palm', ['palm', 'arecac', 'phoenix dactyl', 'coco']],
  ['seaweed', ['seaweed', 'coral', 'reef', 'algae', 'kelp', 'sargass', 'laminar']],
  ['grass', [
    'grass', 'reed', 'barley', 'rice', 'bamboo', 'sedge', 'cane', 'oryza', 'hordeum',
    'bambus', 'phragmit', 'saccharum', 'cyper'
  ]],
  ['tree', [
    'tree', 'banyan', 'fig', 'teak', 'pine', 'mangrove', 'acacia', 'sandalwood', 'neem',
    'tamarind', 'mahua', 'bonewood', 'oak', 'cedar', 'timber', 'ficus', 'terminalia',
    'shorea', 'azadirachta', 'santalum', 'madhuca', 'tamarindus'
  ]],
  ['vine', ['vine', 'creeper', 'liana', 'strangler', 'moonseed', 'pepper', 'piper', 'convolvul', 'bramble']],
  ['cactus', ['cactus', 'succulent', 'gourd', 'euphorb', 'cactac', 'aloe']],
  ['fern', ['fern', 'frond', 'bracken', 'pteris', 'adiant', 'polypod']],
  ['moss', ['moss', 'lichen', 'liverwort', 'bryo', 'sphagn', 'cladon']],

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
 * One emoji per growth form — what a plant is drawn as in the notes.
 *
 * Plants get an emoji where animals get a painted plate, and that asymmetry is deliberate rather
 * than a gap in the art. A creature plate earns its block: it is the thing you walked out to see,
 * and `endgame.png` frames it that way. A plant is scenery you are naming, so it wants a mark on
 * the line beside the name and nothing more — the size of an emoji in a sentence, because that is
 * exactly what it is.
 *
 * Keyed on the form rather than the species, so all ninety flora in canon are covered by thirteen
 * entries and a new plant needs no work at all. `Record<GrowthForm, string>` is the point of the
 * type: adding a form to the union fails the build here until it has a mark.
 *
 * On the choices — every one is a compromise, because Unicode has no moss:
 *
 *   * `moss` takes the clover. There is no lichen or moss emoji; a low green thing close to the
 *     ground is the nearest honest reading.
 *   * `root` takes the ginger root. These are wild roots dug out of the ground — taro, turmeric,
 *     shilajit — not a market vegetable, and ginger is the glyph that says so.
 *   * `pitcher` takes the trap. A carnivorous plant's one interesting fact is that it catches
 *     things, and a jug emoji would say the opposite of what the name means.
 *   * Support: `🫚` is Unicode 15 (2022), `🪸` 14 (2021), `🪴` 12 (2019). Those three are the
 *     likeliest to land as a blank box on an old system; the rest are Unicode 6.0 and safe
 *     anywhere. See `SPECIFIC_EMOJI` for the one that is newer still.
 */
export const FORM_EMOJI: Record<GrowthForm, string> = {
  tree: '🌳',
  palm: '🌴',
  vine: '🍃',
  flower: '🌸',
  grass: '🌾',
  fern: '🌿',
  moss: '🍀',
  shrub: '🪴',
  root: '🫚',
  cactus: '🌵',
  seaweed: '🪸',
  pitcher: '🪤',
  unknown: '🌱'
};

/**
 * Plants whose own name beats their growth form, checked before it.
 *
 * A form is a shape, and mostly a shape is all a mark needs to say. Sometimes the name says
 * something better: bamboo is a grass, and 🌾 is not wrong, but 🎋 is *bamboo*. What earns a place
 * here is a plant the player would name differently from its silhouette — not every plant with a
 * cute glyph available.
 *
 * **Matched on whole words**, unlike the form keywords below, and that is not a stylistic choice.
 * `tea` as a substring hits **Iron-Teak**, which is a timber tree. It is the same trap that made
 * `Saltreed` a tree for the life of this file, arriving by a shorter route, and word boundaries
 * close it here because none of these terms is ever buried inside a longer word the way `reed` is
 * inside `saltreed`.
 *
 * `taro` before `lotus`, because canon's **Lotus-Root Taro** names two plants and the taro is the
 * one you dig up. `growthFormOf` already makes the same call for the same reason.
 *
 * 🫜 is Unicode 16 (2024) and by some distance the newest glyph in this file. It sits on the
 * narrowest case on purpose — one species — so that if it boxes on an older system it costs one
 * plant, not every root in canon.
 */
const SPECIFIC_EMOJI: [string[], string][] = [
  [['taro', 'yam', 'tuber'], '🫜'],
  [['ginger', 'turmeric', 'curcuma', 'zingiber'], '🫚'],
  [['bamboo', 'bambusa'], '🎋'],
  [['tea'], '🍵'],
  [['pine', 'cedar', 'conifer', 'fir'], '🎍'],
  [['lotus', 'nelumbo'], '🪷']
];

/** The emoji for a plant, from its name and binomial. */
export function emojiFor(plant: { name: string; binomial: string | null }): string {
  const words = new Set(
    `${plant.binomial ?? ''} ${plant.name}`
      .toLowerCase()
      .split(/[^\p{L}]+/u)
      .filter(Boolean)
  );
  for (const [terms, mark] of SPECIFIC_EMOJI) {
    if (terms.some((term) => words.has(term))) return mark;
  }
  return FORM_EMOJI[growthFormOf(plant)];
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
