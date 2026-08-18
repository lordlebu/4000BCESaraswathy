// What shape an animal is, worked out from what it is called.
//
// The companion to `growthForm.ts`, and a harder problem. Plants are named for what they are --
// banyan, lotus, reed -- so reading the name gets you the shape. Animals in this world are often
// named for what they *do*: `Abyssal Storm-Watcher`, `Stepwell Shadow`, `Grey Bark-Mimic`. None of
// those says "bird", "spirit" or "octopus", and all three are.
//
// What rescues it is the binomial. Canon is disciplined about Linnaean names even for invented
// creatures, and those carry the taxonomy the common name hides: `Cognitavi abyssalis` is a
// navigator bird, `Vrkshasmara griseus` is an arboreal octopus, `Māyā-born umbra` is a construct.
// So the binomial is searched first and weighted heavier, which is the opposite emphasis from the
// plants.
//
// Two categories here are not zoology and exist because canon insists on them:
//
//   * `construct` -- the Māyā-born, sculpted from river mud or coalesced from altar sparks. Bodies
//     made rather than born, and drawing one as an animal would be a category error.
//   * `spectre` -- the Asura-descended and the incorporeal. Canon calls one "a dark, floating
//     entity born from the blood-spills of the first Asura invasion", which is not a mammal.
//
// Both were originally classifier failures. They are better understood as the classifier telling
// the truth: these things are not animals, and the honest answer was to give them their own shape.

/** The shapes an animal can take. Order here is display order, not match order. */
export type BodyPlan =
  | 'mammal'
  | 'bird'
  | 'reptile'
  | 'amphibian'
  | 'fish'
  | 'insect'
  | 'arachnid'
  | 'crustacean'
  | 'mollusc'
  | 'worm'
  | 'construct'
  | 'spectre'
  | 'unknown';

/**
 * Keywords per plan, tried in order.
 *
 * The supernatural categories come first and deliberately so: `Gorgonopsid War-Beast` is a
 * synapsid by its Latin and an Asura war-mount by its role, and the second is what the player
 * meets. Below that, the invented genera canon has defined -- `Cognitavi`, `Vrkshasmara` -- are
 * matched before general zoology, because their common names actively mislead.
 */
const PLAN_KEYWORDS: [BodyPlan, string[]][] = [
  // Bodies made rather than born. Canon's own term, so it matches the binomial directly.
  ['construct', ['māyā', 'maya', 'clay', 'calcified', 'construct', 'golem']],
  // Incorporeal, or descended from the Asura invasion. Matched before zoology on purpose.
  ['spectre', ['asura', 'spectral', 'wraith', 'spectre', 'umbra', 'asuricus', 'manticore', 'manticora']],
  // Canon's invented genera, whose common names say nothing useful about the body.
  ['bird', ['cognitavi']],
  ['mollusc', ['vrkshasmara', 'vṛkṣaśmara']],

  ['bird', [
    'ornis', 'avis', 'ptera', 'corvus', 'ardea', 'anser', 'falco', 'aquila', 'grus', 'cygnus',
    'columba', 'psitta', 'acroceph', 'alcedo', 'pterocles', 'puffinus', 'turdus', 'lerwa',
    'gallinula', 'sylvian', 'crane', 'heron', 'egret', 'kingfisher', 'harrier', 'stork', 'ibis',
    'duck', 'goose', 'owl', 'eagle', 'hawk', 'vulture', 'swift', 'finch', 'peacock', 'fowl',
    'pelican', 'tern', 'gull', 'cormorant', 'warbler', 'plover', 'snipe', 'woodpecker', 'hornbill',
    'sunbird', 'babbler', 'drongo', 'myna', 'parakeet', 'quail', 'sandpiper', 'grouse', 'partridge',
    'shearwater', 'thrush', 'petrel', 'skua', 'thalassoica', 'catharacta', 'aepyornis', 'struthio', 'ostrich', 'ficusophila'
  ]],
  ['fish', [
    'ichthy', 'cyprin', 'silur', 'carcharh', 'anguill', 'perc', 'salmo', 'thunnus', 'sphyraena',
    'fish', 'carp', 'eel', 'shark', 'minnow', 'barb', 'mahseer', 'catfish', 'tuna', 'barracuda',
    'sturgeon', 'trout', 'herring', 'skipper', 'muraena', 'moray', 'dasyatis', 'stingray', 'ray', 'pristis', 'sawfish', 'esox', 'pike', 'sarasvatimanta', 'manta', 'beedu'
  ]],
  ['reptile', [
    'saur', 'crocod', 'python', 'naja', 'varan', 'gecko', 'testud', 'chelon', 'ophi', 'serpen',
    'draco', 'raptor', 'vajraptor', 'nagaraptor', 'agama', 'voay', 'gorgonops', 'dimetrodon', 'baurusuchus', 'snake', 'lizard', 'turtle',
    'tortoise', 'monitor', 'viper', 'cobra', 'krait', 'gharial', 'crocodile', 'skink', 'iguana',
    'terrapin', 'croc', 'suchus', 'dinosaur', 'chameleon', 'megalosaur', 'postosuchus', 'acanthodactylus', 'scutosaurus', 'sauropodoligator'
  ]],
  ['amphibian', ['rana', 'bufo', 'megalobatrachus', 'frog', 'toad', 'salamander', 'newt', 'caecilian']],
    // Eurypterids are sea scorpions, and the chelicerate silhouette is the closest honest shape for
  // one. Canon's Shrīmā mimics a human outline as a lure, but the icon should say what the animal
  // is rather than what it is pretending to be.
  ['arachnid', ['spider', 'arachn', 'scorpion', 'tarantula', 'mite', 'tick', 'nephila', 'spinner', 'eurypterus', 'eurypterid']],
  ['insect', [
    'coleopt', 'apis', 'formic', 'lepidopt', 'odonat', 'mantis', 'scarab', 'vespa', 'cicada',
    'bombyx', 'anax', 'isotoma', 'silvanus', 'beetle', 'moth', 'butterfly', 'bee', 'wasp', 'ant', 'dragonfly',
    'locust', 'cricket', 'termite', 'weevil', 'grasshopper', 'firefly', 'hornet', 'flea', 'megapis',
    'centipede', 'millipede'
  ]],
  ['crustacean', ['cancer', 'scylla', 'penaeus', 'peneus', 'carcin', 'astac', 'crab', 'shrimp', 'prawn', 'lobster', 'crayfish', 'barnacle', 'gecarcinus']],
  ['mollusc', ['helix', 'octopus', 'sepia', 'murex', 'conus', 'naut', 'snail', 'squid', 'clam', 'oyster', 'mussel', 'slug', 'cuttlefish', 'gastropod', 'ammonite', 'jellyfish', 'aurelia', 'medusa']],
  ['worm', ['worm', 'tubeworm', 'leech', 'annelid', 'lumbric', 'riftia']],
  ['mammal', [
    'lutra', 'panthera', 'canis', 'elephas', 'bos', 'ursus', 'cervus', 'sus', 'rattus', 'vespertil',
    'macaca', 'delphin', 'balaen', 'orcinus', 'phoca', 'capra', 'otter', 'deer', 'antelope',
    'macaque', 'monkey', 'ape', 'bat', 'boar', 'buffalo', 'tiger', 'leopard', 'cat', 'dog',
    'jackal', 'wolf', 'elephant', 'rhino', 'whale', 'dolphin', 'orca', 'seal', 'shrew', 'mouse',
    'rat', 'civet', 'mongoose', 'unicorn', 'horse', 'goat', 'sheep', 'cattle', 'ox', 'langur',
    'squirrel', 'wallaby', 'camel', 'ass', 'ibex', 'pangolin', 'porcupine', 'hare', 'sloth',
    'bear', 'lion', 'panther', 'vulpes', 'fox', 'indicator'
  ]]
];

/**
 * The body plan of an animal, from its name and binomial.
 *
 * The binomial goes first in the haystack so that when a creature's two names disagree -- and in
 * this world they often do -- the Latin wins. `Bone-Plated Orca` is `Orcinus osteoplax`, and it is
 * the genus that says mammal.
 */
export function bodyPlanOf(animal: { name: string; binomial: string | null }): BodyPlan {
  // Split on anything that is not a letter, so `Panthera pardus` and `Sand-Burrowing Toad` both
  // become word lists. Plain substring matching cannot be used here: `ant` appears inside
  // *Panthera*, *Acanthodactylus*, *Giant* and *Antelope*, which turned four mammals, a lizard and
  // an ostrich into insects. Short keywords are the common case in zoology -- ant, bee, ray, ox,
  // bat, cat, ass -- so the whole matcher works on words rather than fragments.
  const words = `${animal.binomial ?? ''} ${animal.name}`
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter(Boolean);
  for (const [plan, keywords] of PLAN_KEYWORDS) {
    for (const keyword of keywords) {
      // Short keywords must match a whole word. `ant` is a real animal and also the first three
      // letters of *antelope*, so a prefix rule turns antelopes into insects -- which is the bug
      // this rule exists to prevent, arriving a second time by a shorter route.
      //
      // Longer keywords may match as a prefix, because that is how Linnaean stems are written
      // here: `ornis` for *Phalacrocorax*, `saur` for a dozen genera. At five letters the risk of
      // colliding with an unrelated word is gone.
      const prefixAllowed = keyword.length >= 5;
      if (words.some((word) => word === keyword || (prefixAllowed && word.startsWith(keyword)))) {
        return plan;
      }
    }
  }
  return 'unknown';
}
