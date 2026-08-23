// Does the shape-from-name guess actually cover canon?
//
// The icons are derived rather than authored, which is what makes ninety of them affordable. The
// risk of deriving is that it quietly stops working: canon grows a plant named in a way the matcher
// cannot read, it falls to `unknown`, and nobody notices because a plain sprig looks deliberate.
//
// So the coverage is asserted against the real bundle. If canon adds plants this cannot classify,
// this fails with their names and someone chooses -- a new keyword, or a `growth_form` field in
// canon, which is the honest answer if this ever stops being a good guess.

import { describe, expect, it } from 'vitest';
import speciesBundle from '../data/canon/species.json';
import { FORM_EMOJI, emojiFor, growthFormOf, speciesHash } from '../src/content/growthForm';

interface RawFlora {
  id: string;
  name: string;
  scientific?: string;
  biomes: string[];
}

const flora = (speciesBundle as { flora: RawFlora[] }).flora;
const asPlant = (raw: RawFlora) => ({ name: raw.name, binomial: raw.scientific ?? null });

describe('every plant gets a shape', () => {
  it('classifies almost all of the bundle', () => {
    const unknown = flora.filter((raw) => growthFormOf(asPlant(raw)) === 'unknown');
    // A handful of genuinely odd names is fine and expected -- canon invents plants named for what
    // they do rather than what they are. A drift past this means the matcher has stopped keeping up.
    expect(
      unknown.map((raw) => raw.name),
      'plants whose shape cannot be guessed from their name'
    ).toHaveLength(0);
  });

  it('reads the obvious cases the way a reader would', () => {
    const cases: [string, string, string][] = [
      ['Mappa Mundi Banyan', 'Ficus mundi', 'tree'],
      ['Date Palm', 'Phoenix dactylifera', 'palm'],
      ['Golden Amber Lotus', 'Nelumbo aurea', 'flower'],
      ['Saraswati Reed', 'Phragmites saraswati', 'grass'],
      ['Moonseed Vine', 'Menispermum lunare', 'vine'],
      ['Giant Bird-Nest Fern', 'Asplenium giganteum', 'fern'],
      ['Blue Scholar\u2019s Moss', 'Bryum caeruleum', 'moss'],
      ['Hourglass Cactus', 'Cereus clepsydra', 'cactus'],
      ['Naraka Pitcher-Plant', 'Nepenthes naraka', 'pitcher'],
      ['Shattered Sea Kelp', 'Laminaria fracta', 'seaweed'],
      ['Lotus-Root Taro', 'Colocasia nelumbo', 'root']
    ];
    for (const [name, binomial, expected] of cases) {
      expect(growthFormOf({ name, binomial }), name).toBe(expected);
    }
  });

  it('prefers the more telling shape when a name fits two', () => {
    // A date palm is a tree by any reasonable reading, but the palm silhouette says more; a
    // pitcher plant is a flower whose whole point is the pitcher.
    expect(growthFormOf({ name: 'Giant Mangrove-Palm', binomial: null })).toBe('palm');
    expect(growthFormOf({ name: 'Naraka Pitcher-Plant', binomial: null })).toBe('pitcher');
  });

  it('reads the binomial when the common name says nothing', () => {
    // The case that justifies searching both fields: canon's invented names are often poetic, and
    // the Latin is where the botany actually lives.
    expect(growthFormOf({ name: 'Vanishing Whisper', binomial: 'Ficus obscura' })).toBe('tree');
    expect(growthFormOf({ name: 'Vanishing Whisper', binomial: null })).toBe('unknown');
  });
});

describe('the same plant always looks the same', () => {
  it('picks a variant from the id, not from position or chance', () => {
    // Two trees should not be one picture, and the difference has to survive a reload -- so it is
    // hashed from the stable id rather than from a counter or Math.random.
    expect(speciesHash('flora_mappa_mundi_banyan')).toBe(speciesHash('flora_mappa_mundi_banyan'));
    expect(speciesHash('flora_neem')).not.toBe(speciesHash('flora_tamarind'));
  });

  it('spreads the bundle across the variants rather than favouring one', () => {
    // A hash that mostly returned zero would be technically stable and useless: every tree would
    // still be the same tree.
    const buckets = new Set(flora.map((raw) => speciesHash(raw.id) % 3));
    expect(buckets.size).toBe(3);
  });
});

describe('every plant gets an emoji', () => {
  // Plants are named with an emoji where animals get a painted plate. Keyed on the growth form,
  // so thirteen entries cover all ninety flora and a new plant needs no work -- but that only
  // holds while the table stays complete, which is what these check.

  it('covers the whole bundle, with no blanks', () => {
    for (const plant of speciesBundle.flora) {
      const mark = emojiFor({ name: plant.name, binomial: plant.scientific ?? null });
      expect(mark, `${plant.name} has no mark`).toBeTruthy();
      // A single emoji, not a sequence and not a word. Length in code units is 2 for the
      // astral-plane plants (🌳 and friends) and 2 for the clover with no variation selector.
      expect([...mark], `${plant.name} -> ${JSON.stringify(mark)}`).toHaveLength(1);
    }
  });

  it('reads the obvious plants the way a reader would', () => {
    const mark = (name: string, binomial: string | null = null) => emojiFor({ name, binomial });
    expect(mark('Mappa Mundi Banyan')).toBe('🌳');
    expect(mark('Saltreed')).toBe('🌾');
    expect(mark('Sacred Lotus')).toBe('🪷');       // a named exception, above its form
    expect(mark('Date Palm')).toBe('🌴');
    expect(mark('Asura Thorn')).toBe('🪴');
    expect(mark('Lotus-Root Taro')).toBe('🫜');    // taro before lotus: you dig the root up
  });

  it('lets a name beat its form where the name is more telling', () => {
    const mark = (name: string, binomial: string | null = null) => emojiFor({ name, binomial });
    expect(mark('River Bamboo', 'Bambusa saraswati')).toBe('🎋');
    expect(mark('Black Ash-Tea')).toBe('🍵');
    expect(mark('Vindhya Pine')).toBe('🎍');
    expect(mark('Blue Healing Turmeric')).toBe('🫚');
  });

  it('matches those exceptions on whole words, because `tea` is inside `teak`', () => {
    // Iron-Teak is a timber tree. Substring matching would pour it a cup of tea, which is the
    // same trap that made Saltreed a tree for the life of the classifier.
    expect(emojiFor({ name: 'Iron-Teak', binomial: null })).toBe('🌳');
  });

  it('gives every form in the union a distinct mark', () => {
    // `Record<GrowthForm, string>` already makes the build fail if a form has no entry. What it
    // cannot catch is two forms sharing one, which would quietly make a palm and a tree the same
    // thing in the notes.
    const marks = Object.values(FORM_EMOJI);
    expect(new Set(marks).size).toBe(marks.length);
  });
});
