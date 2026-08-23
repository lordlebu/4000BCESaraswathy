// Does the shape-from-name guess cover the animals?
//
// Harder than the plants, and the failures were more interesting. Two of them are recorded here as
// tests rather than as comments, because both would come straight back if the matcher were ever
// rewritten:
//
//   * `ant` appears inside *Panthera*, *Acanthodactylus*, *Giant* and *Antelope*. Substring
//     matching turned two leopards, a lizard, an antelope and an ostrich into insects.
//   * Canon's supernatural creatures are not a gap in the classifier. The Māyā-born are sculpted
//     from river mud and the Asura-descended are born from spilled blood; giving them animal
//     bodies would say something canon does not.

import { describe, expect, it } from 'vitest';
import speciesBundle from '../data/canon/species.json';
import { PLAN_EMOJI, animalEmojiFor, bodyPlanOf } from '../src/content/bodyPlan';

interface RawFauna {
  id: string;
  name: string;
  scientific?: string;
}

const fauna = (speciesBundle as { fauna: RawFauna[] }).fauna;
const asAnimal = (raw: RawFauna) => ({ name: raw.name, binomial: raw.scientific ?? null });

describe('every animal gets a shape', () => {
  it('classifies the whole bundle', () => {
    const unknown = fauna.filter((raw) => bodyPlanOf(asAnimal(raw)) === 'unknown');
    expect(
      unknown.map((raw) => `${raw.name} (${raw.scientific ?? 'no binomial'})`),
      'animals whose body cannot be guessed from their name'
    ).toHaveLength(0);
  });

  it('never matches a keyword inside a longer word', () => {
    // The bug that made five vertebrates into insects. `ant` is a real keyword and has to stay one,
    // so the matcher works on whole words instead of fragments.
    expect(bodyPlanOf({ name: 'Vindhya Leopard', binomial: 'Panthera pardus' })).toBe('mammal');
    expect(bodyPlanOf({ name: 'Cloud Antelope', binomial: null })).toBe('mammal');
    expect(bodyPlanOf({ name: 'Giant Riding Ostrich', binomial: 'Struthio camelus' })).toBe('bird');
    expect(bodyPlanOf({ name: 'Lothal Dune-Sprinter', binomial: 'Acanthodactylus lothalensis' })).toBe('reptile');
    // And a real ant is still an insect.
    expect(bodyPlanOf({ name: 'Harvester Ant', binomial: 'Formica messor' })).toBe('insect');
  });

  it('lets the binomial overrule a name that says nothing useful', () => {
    // The reason both fields are searched, and why the Latin goes first. Canon names creatures for
    // what they do at least as often as for what they are.
    expect(bodyPlanOf({ name: 'Abyssal Storm-Watcher', binomial: 'Cognitavi abyssalis' })).toBe('bird');
    expect(bodyPlanOf({ name: 'Grey Bark-Mimic', binomial: 'Vrkshasmara griseus' })).toBe('mollusc');
    expect(bodyPlanOf({ name: 'Bone-Plated Orca', binomial: 'Orcinus osteoplax' })).toBe('mammal');
  });

  it('keeps the made and the formless out of zoology', () => {
    // Canon is explicit that these are not animals, so neither is their icon.
    expect(bodyPlanOf({ name: 'Ash-Skinned Courtesan', binomial: 'Māyā-born' })).toBe('construct');
    expect(bodyPlanOf({ name: 'Clay-Born Watcher', binomial: 'Māyā-born oculus' })).toBe('construct');
    expect(bodyPlanOf({ name: 'Lethal Cave-Spectre', binomial: 'Asura spectral' })).toBe('spectre');
    expect(bodyPlanOf({ name: 'Stepwell Shadow', binomial: 'Māyā-born umbra' })).toBe('construct');
  });

  it('reads a plain Linnaean stem', () => {
    expect(bodyPlanOf({ name: 'Delta Kingfisher', binomial: 'Alcedo vishnu' })).toBe('bird');
    expect(bodyPlanOf({ name: 'River Otter', binomial: 'Lutra saraswati' })).toBe('mammal');
    expect(bodyPlanOf({ name: 'Mangrove Crab', binomial: 'Scylla bonewoodi' })).toBe('crustacean');
    // A land crocodile, and no longer filed as a generic reptile beside the geckos and snakes.
    expect(bodyPlanOf({ name: 'Baurusuchus', binomial: 'Baurusuchus palustris' })).toBe('crocodilian');
  });

  it('tells the archosaurs and stem-mammals apart from the lizards', () => {
    // `reptile` was collecting all of these and drawing them as one shape. They are not one shape.
    expect(bodyPlanOf({ name: 'Megalosaurus', binomial: null })).toBe('dinosaur');
    expect(bodyPlanOf({ name: 'Nagaraptor', binomial: 'Nagaraptor vallatus' })).toBe('dinosaur');
    expect(bodyPlanOf({ name: 'Dimetrodon Scout-Mount', binomial: 'Dimetrodon minor' })).toBe('synapsid');
    expect(bodyPlanOf({ name: 'Giant Horned Voay', binomial: 'Voay maximus' })).toBe('crocodilian');
    // Shringasaurus is an archosauromorph -- a diapsid off an older branch than the dinosaurs or
    // the crocodilians -- so it lands with the reptiles despite the name. Both forms, because a
    // lineage that splits across two entities must not split across two body plans.
    expect(bodyPlanOf({ name: 'Shringasaurus', binomial: 'Shringasaurus indicus' })).toBe('reptile');
    expect(bodyPlanOf({ name: 'Frilled Shringasaurus', binomial: 'Shringasaurus torquatus' })).toBe('reptile');
    // A pareiasaur really is a reptile. The `-saurus` in a name is not evidence of anything.
    expect(bodyPlanOf({ name: 'Scutosaurus Battering-Ram', binomial: 'Scutosaurus titan' })).toBe('reptile');
    // `camel` used to win here and made a baby crocodile a mammal.
    expect(bodyPlanOf({ name: 'Camelosuchus Calf', binomial: 'Camelosuchus minor' })).toBe('crocodilian');
  });

  it('treats an Asura taint as an adjective, not a body', () => {
    // `asuricus` used to be a spectre keyword, which drew an owl as a ghost -- and split genera
    // down the middle, so `Gorgonops asuricus` was a spectre while `Gorgonops titan` was a
    // reptile. One animal cannot have two body plans because of a species epithet.
    expect(bodyPlanOf({ name: 'Asura-Tainted Owl', binomial: 'Bubo asuricus' })).toBe('bird');
    expect(bodyPlanOf({ name: 'Gargoyle-Bat', binomial: 'Vespertilio asuricus' })).toBe('mammal');
    expect(bodyPlanOf({ name: 'Asura-Marked Black Ammonite', binomial: 'Ammonites asuricus' })).toBe('mollusc');
    expect(bodyPlanOf({ name: 'Gorgonopsid War-Beast', binomial: 'Gorgonops asuricus' })).toBe(
      bodyPlanOf({ name: 'Gorgonopsid Pack-Leader', binomial: 'Gorgonops titan' })
    );
    // What stays a spectre is what has no body to begin with.
    expect(bodyPlanOf({ name: 'Lethal Cave-Spectre', binomial: 'Asura spectral' })).toBe('spectre');
    expect(bodyPlanOf({ name: 'Tendua Manticore', binomial: null })).toBe('spectre');
  });

  it('spreads the bundle across the shapes rather than collapsing to one', () => {
    // A matcher that answered `reptile` for everything would pass every test above and be useless.
    const plans = new Set(fauna.map((raw) => bodyPlanOf(asAnimal(raw))));
    expect(plans.size).toBeGreaterThanOrEqual(10);
  });
});

describe('every animal gets an emoji until it gets a plate', () => {
  // Twenty animals have painted plates. These cover the other 199, and anything canon adds.

  it('covers the whole bundle, one glyph each, with no blanks', () => {
    for (const raw of fauna) {
      const mark = animalEmojiFor(asAnimal(raw));
      expect(mark, `${raw.name} has no mark`).toBeTruthy();
      // One glyph. `🕷️` is a base character plus a variation selector, so count graphemes by
      // stripping U+FE0F rather than by code point.
      expect([...mark.replace(/️/g, '')], `${raw.name} -> ${JSON.stringify(mark)}`).toHaveLength(1);
    }
  });

  it('gives every plan in the union a distinct mark', () => {
    // `Record<BodyPlan, string>` already fails the build if a plan has no entry. What it cannot
    // catch is two plans sharing one, which would undo the point of splitting them: a crocodile
    // and a gecko becoming the same glyph is exactly the lumping this change removed.
    const marks = Object.values(PLAN_EMOJI);
    expect(new Set(marks).size).toBe(marks.length);
  });

  it('draws the groups that used to be lumped as different things', () => {
    const mark = (name: string, binomial: string | null) => animalEmojiFor({ name, binomial });
    const gecko = mark('Lava-Ledge Gecko', 'Gekko vulcanus');
    const croc = mark('Baurusuchus', 'Baurusuchus palustris');
    const dino = mark('Megalosaurus', null);
    const synapsid = mark('Dimetrodon Scout-Mount', 'Dimetrodon minor');
    expect(new Set([gecko, croc, dino, synapsid]).size).toBe(4);
  });
});

describe('birds are not non-avian dinosaurs, and the genus decides which', () => {
  // Canon keeps three groups apart that cladistics does not: reptiles, non-avian dinosaurs, and
  // birds. Birds *are* avian dinosaurs, so `bird` is not a sub-case of `dinosaur` here -- they are
  // siblings, and which one a creature lands in is canon's call rather than a taxonomy textbook's.
  //
  // The hard part is that canon's avian dinosaurids are called raptors and theropods. Reading the
  // common name gets three of the five wrong, so the genus is matched first and the name gets no
  // vote at all.

  const plan = (name: string, binomial: string | null) => bodyPlanOf({ name, binomial });

  it.each([
    ['Iridescent Lothal Silvanus', 'Silvanus pictus'],
    ['Giant Jungle Raptor', 'Silvanus gigas'],
    ['Crested Sylvian', 'Sylvianus cristatus'],
    ['Lothal Heron-Raptor', 'Sylvianus minor'],
    ['Stealth-Patterned Theropod', 'Sylvianus occultus'],
    ['Cognitavi Cloud-Hermit', 'Cognitavi solitarius'],
    ['Steppe-Plumed Elephantbird', 'Aepyornis stephensis']
  ])('%s is a bird', (name, binomial) => {
    expect(plan(name, binomial)).toBe('bird');
  });

  it.each([
    ['Vajraptor', 'Vajraptor territorialis'],
    ['Nagaraptor', 'Nagaraptor vallatus'],
    ['Rajasaurus Ambush-Drake', 'Rajasaurus asuricus'],
    ['Colossal Void-Devourer', 'Sauropodoligator titan'],
    ['Megalosaurus', null]
  ])('%s is a non-avian dinosaur', (name, binomial) => {
    expect(plan(name, binomial)).toBe('dinosaur');
  });

  it('lets the genus beat the common name, which is where this goes wrong', () => {
    // Two creatures, both called a raptor, one of each. Nothing in the common names separates
    // them; only Sylvianus versus Vajraptor does.
    expect(plan('Giant Jungle Raptor', 'Silvanus gigas')).toBe('bird');
    expect(plan('Vajraptor', 'Vajraptor territorialis')).toBe('dinosaur');
  });
});
