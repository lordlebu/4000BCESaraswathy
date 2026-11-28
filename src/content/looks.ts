// The palettes and colour transform shared by painted NPC appearance kits and fixed canon looks.

import looksData from '../../assets/looks.json';
/** How a body covers its head, which is what a face is drawn wearing. */
export type Headwear = 'wrap' | 'turban' | 'hood' | 'bare';

/** One body's re-dyeable colours, as `assets/looks.json` lists them. Most common first. */
export interface BodyPalette {
  headwear: Headwear;
  skin: readonly string[];
  cloth: readonly string[];
  second: readonly string[];
  /** Which garment a drawn face wears, or a painted colour for one that is never dyed. */
  face: { headwear: FacePart; shoulders: FacePart };
}

/** `cloth`, `second`, or a literal `#rrggbb` for a garment the dyes do not touch. */
export type FacePart = 'cloth' | 'second' | string;

/**
 * A dye, as a hue and a saturation. Lightness is kept from the painting.
 *
 * **Keeping the painter's lightness is what makes this work at all.** A garment is a ramp -- a
 * highlight, a body colour, a fold -- and replacing each shade with a flat colour would erase the
 * folds. Swapping hue and saturation while keeping each pixel's own lightness re-dyes the cloth and
 * leaves the painting's shading exactly where the painter put it.
 *
 * `light` scales that lightness, for the two dyes that are not really dyes: undyed cotton is
 * paler than anything painted on these sheets, and charcoal is darker.
 *
 * Period dyes, deliberately. Madder, indigo, turmeric and lac are all attested in the Indus world;
 * a stranger in a 4000 BCE setting dressed in magenta would be a costume, not a person.
 */
export interface Dye {
  id: string;
  name: string;
  hue: number;
  sat: number;
  light?: number;
}

export const DYES: readonly Dye[] = [
  { id: 'madder', name: 'madder red', hue: 6, sat: 0.55 },
  { id: 'indigo', name: 'indigo', hue: 225, sat: 0.42 },
  { id: 'turmeric', name: 'turmeric', hue: 44, sat: 0.72 },
  { id: 'lac', name: 'lac crimson', hue: 345, sat: 0.5 },
  { id: 'leaf', name: 'leaf green', hue: 100, sat: 0.3 },
  { id: 'ochre', name: 'ochre', hue: 28, sat: 0.5 },
  { id: 'undyed', name: 'undyed cotton', hue: 38, sat: 0.3, light: 1.45 },
  { id: 'charcoal', name: 'charcoal', hue: 30, sat: 0.06, light: 0.75 }
];

/**
 * Skin, as a shift from what the painter used rather than as colours.
 *
 * `hue` in degrees, `sat` and `light` as factors on the painted skin. The painted tone is one of
 * them, so a stranger can come out exactly as drawn. A fifth, paler step was tried and dropped: at
 * 1.2x the carrier's skin went grey against his own cream tunic, checked by eye at 5x.
 */
export interface SkinTone {
  id: string;
  hue: number;
  sat: number;
  light: number;
}

export const SKIN_TONES: readonly SkinTone[] = [
  { id: 'as-painted', hue: 0, sat: 1, light: 1 },
  { id: 'deep', hue: -2, sat: 0.85, light: 0.72 },
  { id: 'dark', hue: -1, sat: 0.9, light: 0.84 },
  { id: 'light', hue: 2, sat: 0.9, light: 1.1 }
];

export const BODIES: Readonly<Record<string, BodyPalette>> = looksData.bodies as Record<
  string,
  BodyPalette
>;

/** Somebody's colouring. Ids into `SKIN_TONES` and `DYES`. */
export interface Look {
  body: string;
  skin: string;
  cloth: string;
  second: string;
}

export type NpcLook = Look & { portraitId: string };

/** The texture key a look is drawn from. One per distinct look, so two alike share a texture. */
export function lookKey(look: Look): string {
  return `${look.body}~${look.skin}~${look.cloth}~${look.second}`;
}

type Rgb = readonly [number, number, number];

function parseHex(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** RGB 0-255 to HSL with hue in degrees and the rest 0-1. */
export function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return [h * 60, s, l];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const k = (n: number) => (n + hue / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/**
 * Lightness is clamped short of white, so an undyed garment keeps a fold. At 0.92 the cream
 * still has a shadow; at 1.0 the whole tunic becomes one flat patch.
 */
const MAX_LIGHT = 0.92;

function dyed(hex: string, dye: Dye): string {
  const [, , l] = rgbToHsl(parseHex(hex));
  return toHex(hslToRgb(dye.hue, dye.sat, Math.min(MAX_LIGHT, l * (dye.light ?? 1))));
}

function toned(hex: string, tone: SkinTone): string {
  const [h, s, l] = rgbToHsl(parseHex(hex));
  return toHex(hslToRgb(h + tone.hue, s * tone.sat, Math.min(MAX_LIGHT, l * tone.light)));
}

const dyeById = new Map(DYES.map((d) => [d.id, d]));
const toneById = new Map(SKIN_TONES.map((t) => [t.id, t]));

/**
 * Which painted colour becomes which, for one look.
 *
 * Keys are the sheet's own colours as lower-case `#rrggbb`; a colour not in the table is left as
 * painted, which is the outline, the eyes, the load and everything else that is not cloth or skin.
 */
export function recolourTable(look: Look): Map<string, string> {
  const body = BODIES[look.body];
  const out = new Map<string, string>();
  if (!body) return out;
  const tone = toneById.get(look.skin);
  const cloth = dyeById.get(look.cloth);
  const second = dyeById.get(look.second);
  if (tone) for (const hex of body.skin) out.set(hex, toned(hex, tone));
  if (cloth) for (const hex of body.cloth) out.set(hex, dyed(hex, cloth));
  if (second) for (const hex of body.second) out.set(hex, dyed(hex, second));
  return out;
}
