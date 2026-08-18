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
import { bodyPlanOf } from '../src/content/bodyPlan';

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
    expect(bodyPlanOf({ name: 'Baurusuchus', binomial: 'Baurusuchus palustris' })).toBe('reptile');
  });

  it('spreads the bundle across the shapes rather than collapsing to one', () => {
    // A matcher that answered `reptile` for everything would pass every test above and be useless.
    const plans = new Set(fauna.map((raw) => bodyPlanOf(asAnimal(raw))));
    expect(plans.size).toBeGreaterThanOrEqual(10);
  });
});
