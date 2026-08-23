// A small drawn mark for every plant in the collection.
//
// Ninety flora are shown as a name and a paragraph, which reads as a list rather than as the field
// guide the collection is meant to be. This gives each one a shape and a colour, both derived --
// the shape from what the plant is called, the colour from the ground it grows on.
//
// **Why drawn rather than emoji or a Unicode glyph.** Emoji are bitmap glyphs in most fonts, so a
// lotus is always the same green whatever ground it grows on -- which loses the colour-by-biome
// idea entirely, and that idea is the thing that makes a page of these read as a habitat guide.
// Unicode symbols do take a CSS colour, and were the near-miss option, but the repertoire runs out
// fast: there is no character for a mangrove or a pitcher plant, and the ones that do exist render
// at different weights on different platforms. Twelve inline paths cost nothing, load nothing, and
// can be told exactly what to be.
//
// The whole thing is deliberately schematic. At twenty pixels a plant is a silhouette -- a canopy
// on a trunk, a bell on a stem -- and trying for more detail than that produced mush every other
// time it was attempted in this project.

import { bodyPlanOf, type BodyPlan } from '../content/bodyPlan';
import { emojiFor, speciesHash } from '../content/growthForm';
import type { BiomeId, Flora } from '../world/types';

/**
 * The colour a plant is drawn in: the ground it grows on.
 *
 * A species can list several biomes; the first is used, which is canon's own ordering rather than
 * a choice made here. The effect is that scrolling the collection groups plants by habitat without
 * anything having to sort them -- the marsh plants are all blue-green, the desert ones all ochre.
 *
 * These are `data/biomes.json`'s own values, deliberately not the softened ones the terrain tiles
 * use. A tile is ground beneath a dark figure and wants to be quiet; an icon is a small mark on
 * paper and wants to be legible.
 */
const BIOME_INK: Record<BiomeId, string> = {
  sea: '#2f6f8f',
  coast: '#b8934a',
  plains: '#6d9440',
  forest: '#3f7a49',
  wetland: '#4f9384',
  hills: '#96793c',
  mountains: '#6f6a7a',
  desert: '#b1823a',
  river: '#3d84b5',
  settlement: '#a8543a',
  landmark: '#bfa03f'
};


/**
 * Each body plan as a mark on the same 24x24 grid the plants use.
 *
 * Animals are drawn in profile where plants are drawn upright, which is the quickest way to tell
 * the two halves of the collection apart at a glance without reading either.
 *
 * `construct` and `spectre` are not zoology. Canon's Māyā-born are sculpted from river mud and its
 * Asura-descended are "born from the blood-spills of the first invasion", so they get a made shape
 * and a formless one -- drawing either as an animal would say something canon does not.
 */
const BODIES: Record<BodyPlan, { stem?: string[]; mass?: string[]; mark?: string }> = {
  mammal: {
    // Four legs, always, and a level back. Two legs and a raised head is the bird; this is the
    // silhouette a reader separates it from without looking closely.
    stem: ['M7 16v5 M10 16v5 M15 16v5 M18 16v5'],
    mass: [
      // Standing in profile: level back, muzzle forward, tail behind.
      'M5 11h12a4 3 0 0 1 4 3v2a1 1 0 0 1-1 1H6a2 3 0 0 1-2-3v-1a2 2 0 0 1 1-2z M18 12l4-1-1 3-3-1z M5 12L2 9l1 4z',
      // Heavier and lower, for a boar or a buffalo.
      'M5 12h11a5 4 0 0 1 5 4v1a1 1 0 0 1-1 1H6a3 3 0 0 1-3-3 3 3 0 0 1 2-3z M17 13l5-2-1 4-4-1z'
    ],
    mark: 'M20 12a1 1 0 1 1 0 2 1 1 0 0 1 0-2z'
  },
  bird: {
    // Legs are what separate a bird from a mammal at this size: two thin verticals under the body
    // rather than four. A wing line and a raised head do the rest.
    stem: ['M10 17v4 M14 17v4'],
    mass: [
      // Perching: round body, head up, tail swept back, one wing line.
      'M9 8a5 5 0 0 1 5 5 4 4 0 0 1-4 4 5 5 0 0 1-5-5 5 5 0 0 1 4-4z M13 11l7-3-5 5z M9 6a2 2 0 0 1 2 2h-4a2 2 0 0 1 2-2z',
      // Wading: long neck, high body, beak forward.
      'M8 12a5 4 0 0 1 5-3 5 4 0 0 1 5 4 3 3 0 0 1-3 3h-4a3 3 0 0 1-3-4z M15 9V5a2 2 0 0 1 4 0l3-1-3 2v3z'
    ],
    mark: 'M9 5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z'
  },
  reptile: {
    stem: ['M3 16c3-3 6-3 9 0s6 3 9 0 M8 18l-1 3 M16 18l1 3'],
    mass: ['M18 12a3 2.5 0 0 1 3 2.5 3 2.5 0 0 1-3 2.5z'],
    mark: 'M19 13a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8z'
  },
  amphibian: {
    mass: ['M12 9a6 5 0 0 1 6 6 3 3 0 0 1-3 3H9a3 3 0 0 1-3-3 6 5 0 0 1 6-6z'],
    mark: 'M9 11a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z M15 11a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z'
  },
  fish: {
    mass: ['M3 14c3-4 9-5 13-2l3-3v10l-3-3c-4 3-10 2-13-2z'],
    mark: 'M7 12.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z'
  },
  insect: {
    stem: ['M12 8V19 M12 11l-4-3 M12 11l4-3 M12 15l-5-1 M12 15l5-1 M12 18l-4 2 M12 18l4 2 M11 6l-2-3 M13 6l2-3'],
    mass: ['M12 6a2.5 3 0 0 1 0 6 2.5 3 0 0 1 0-6z']
  },
  arachnid: {
    stem: ['M8 10 3 6 M8 13 3 13 M8 16 3 20 M16 10l5-4 M16 13h5 M16 16l5 4'],
    mass: ['M12 9a4 5 0 0 1 0 10 4 5 0 0 1 0-10z']
  },
  crustacean: {
    stem: ['M8 17l-3 3 M16 17l3 3 M10 18l-1 3 M14 18l1 3'],
    mass: [
      'M12 10a5 4 0 0 1 5 4 5 4 0 0 1-10 0 5 4 0 0 1 5-4z M5 9a2 3 0 0 1 3 2l-2 1zM19 9a2 3 0 0 0-3 2l2 1z'
    ]
  },
  mollusc: {
    stem: ['M9 15c-1 3-2 4-4 5 M12 16v5 M15 15c1 3 2 4 4 5'],
    mass: ['M12 5a6 6 0 0 1 6 7 5 4 0 0 1-12 0 6 6 0 0 1 6-7z'],
    mark: 'M10 10a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z M14 10a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z'
  },
  worm: {
    stem: ['M3 16c3-4 5 4 8 0s5-4 8-2']
  },
  construct: {
    // Made, not born: a squared body with a seam, and a head set on it.
    mass: ['M7 11h10v9H7z M10 4h4v5h-4z'],
    mark: 'M9 13h6v1.5H9z'
  },
  spectre: {
    // Formless below, watching above. Nothing about it should read as anatomy.
    mass: ['M12 4a6 6 0 0 1 6 6v9l-2-2-2 2-2-2-2 2-2-2-2 2v-9a6 6 0 0 1 6-6z'],
    mark: 'M10 10a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6z M14 10a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6z'
  },
  unknown: {
    stem: ['M12 20V11 M12 14c-3-1-4-3-4-5 2 1 4 3 4 5z M12 12c3-1 4-3 4-5-2 1-4 3-4 5z']
  }
};

/** A lighter tint of a colour, for the highlight. Mixed toward paper rather than toward white. */
function tint(hex: string): string {
  const value = parseInt(hex.slice(1), 16);
  const mix = (channel: number, paper: number) => Math.round(channel + (paper - channel) * 0.45);
  const r = mix((value >> 16) & 255, 255);
  const g = mix((value >> 8) & 255, 246);
  const b = mix(value & 255, 223);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export interface SpeciesIconProps {
  species: Pick<Flora, 'id' | 'name' | 'binomial' | 'biomes'>;
  /** Which half of the collection this is. Plants are drawn upright, animals in profile. */
  kind: 'creature' | 'flora';
  size?: number;
}

/**
 * The mark for one plant.
 *
 * Presentational only: it carries no label of its own, because the name it sits beside already
 * says what the plant is, and a screen reader announcing "tree icon, Mappa Mundi Banyan" is worse
 * than one announcing the name alone.
 */
export function SpeciesIcon({ species, kind, size = 22 }: SpeciesIconProps) {
  // Plants are an emoji; animals are a drawn silhouette.
  //
  // Plants used to have hand-drawn shapes here too — thirteen growth forms, biome ink, a variant
  // per species so two trees were not the same picture. They were decent and they are gone,
  // because they were solving the wrong problem. A plant in the notes is scenery being named, and
  // the right weight for that is a character in the line. An SVG beside text can be made small
  // but never becomes incidental; an emoji is incidental by nature. `git log` has the paths if a
  // drawn plant is ever wanted again.
  //
  // No `size` on the glyph, deliberately: the caller's pixel size is right for a drawn mark that
  // has to align with a 22px row, and wrong for something that should sit on the text baseline
  // like any other character. The CSS gives it `1em`.
  if (kind === 'flora') {
    return (
      <span className="species-emoji" aria-hidden="true">
        {emojiFor(species)}
      </span>
    );
  }

  const shape = BODIES[bodyPlanOf(species)];
  const ink = BIOME_INK[species.biomes[0] ?? 'plains'] ?? BIOME_INK.plains;
  const roll = speciesHash(species.id);
  const stem = shape.stem?.[roll % shape.stem.length];
  const mass = shape.mass?.[roll % shape.mass.length];

  return (
    <svg
      className="species-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {/* Stems and blades are drawn as lines; canopies, heads and pads are drawn as solids.
          Stroking a closed canopy path turns a tree into a thin outline on a stick, which is
          exactly what the first attempt at these looked like. */}
      {stem && (
        <path
          d={stem}
          fill="none"
          stroke={ink}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {mass && <path d={mass} fill={ink} stroke="none" />}
      {shape.mark && <path d={shape.mark} fill={tint(ink)} stroke="none" />}
    </svg>
  );
}
