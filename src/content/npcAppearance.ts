import { tileHash } from '../world/rng';
import { TWIN_MAP, twinWorldSeed } from '../world/twinGeneration';
import { BODIES, type Headwear, type Look } from './looks';
import type { StrangerCulture } from './travellers';

interface PaintedFace {
  headwear: Headwear;
  skin: readonly string[];
  headDye: string;
  shoulderDye: string;
}
const face = (headwear: Headwear, skin: string, headDye: string, shoulderDye: string): PaintedFace =>
  ({ headwear, skin: skin.split(' '), headDye, shoulderDye });

export const PAINTED_APPEARANCE: Readonly<Record<string, PaintedFace>> = {
  'any-01': face('hood', 'as-painted light', 'charcoal', 'charcoal'),
  'any-02': face('wrap', 'dark deep', 'charcoal', 'charcoal'),
  'asura_hybrid-m-01': face('bare', 'dark deep', 'charcoal', 'ochre'),
  'harappan-f-01': face('hood', 'dark deep', 'madder', 'madder'),
  'harappan-f-02': face('hood', 'as-painted light', 'ochre', 'ochre'),
  'harappan-f-03': face('wrap', 'as-painted dark', 'madder', 'madder'),
  'harappan-f-04': face('wrap', 'as-painted light', 'undyed', 'indigo'),
  'harappan-m-01': face('bare', 'as-painted light', 'charcoal', 'madder'),
  'harappan-m-02': face('wrap', 'as-painted light', 'ochre', 'undyed'),
  'harappan-m-03': face('bare', 'dark deep', 'charcoal', 'indigo'),
  'harappan-m-04': face('bare', 'as-painted light', 'charcoal', 'turmeric'),
  'harappan-m-05': face('turban', 'as-painted light', 'undyed', 'undyed'),
  'harappan-m-06': face('bare', 'light as-painted', 'charcoal', 'leaf'),
  'kia-f-01': face('bare', 'as-painted dark', 'leaf', 'turmeric'),
  'kia-f-02': face('bare', 'as-painted dark', 'madder', 'turmeric'),
  'kia-f-03': face('bare', 'as-painted light', 'madder', 'ochre'),
  'kia-m-01': face('bare', 'deep dark', 'madder', 'madder'),
  'kia-m-02': face('wrap', 'as-painted dark', 'leaf', 'leaf'),
  'kia-m-03': face('bare', 'dark as-painted', 'charcoal', 'leaf'),
  'kia-m-04': face('bare', 'deep dark', 'charcoal', 'turmeric'),
  'maru-f-01': face('bare', 'as-painted dark', 'charcoal', 'ochre'),
  'maru-f-02': face('bare', 'light as-painted', 'charcoal', 'ochre'),
  'maru-f-03': face('bare', 'as-painted dark', 'charcoal', 'ochre'),
  'maru-m-01': face('bare', 'dark as-painted', 'charcoal', 'madder'),
  'maru-m-02': face('hood', 'dark deep', 'ochre', 'charcoal')
};

interface AppearanceKit { id: string; culture: string; look: Look }

/** The legacy sheets have limited shapes, so only kit pairs whose silhouettes agree are dealt. */
export const APPEARANCE_KITS: readonly AppearanceKit[] = Object.entries(PAINTED_APPEARANCE).flatMap(([id, portrait]) => {
  const culture = id.split('-')[0]!;
  if (culture === 'asura_hybrid') {
    return [{ id, culture, look: { body: 'traveller-asura', skin: 'dark', cloth: 'charcoal', second: 'ochre', portraitId: id } }];
  }
  return Object.entries(BODIES).flatMap(([body, palette]) => {
    if (body === 'traveller-asura' || palette.headwear !== portrait.headwear) return [];
    if (palette.face.shoulders === 'cloth' && portrait.headDye !== portrait.shoulderDye) return [];
    if (palette.face.headwear.startsWith('#') && portrait.headDye !== 'undyed') return [];
    const cloth = palette.face.headwear === 'cloth' ? portrait.headDye : portrait.shoulderDye;
    const second = palette.face.shoulders === 'second' ? portrait.shoulderDye : 'undyed';
    return [{ id: `${id}/${body}`, culture,
      look: { body, skin: portrait.skin[0]!, cloth, second, portraitId: id } }];
  });
});

/** Each key is a saved map and NPC ID. Legacy entries still use their original resolver. */
export type NpcAppearanceJournal = Record<string, string>;
const LEGACY = 'legacy';
let active: { seed: string; journal: NpcAppearanceJournal } | null = null;

export function bindNpcAppearances(seed: string, journal: NpcAppearanceJournal): void {
  active = { seed, journal };
}

export function legacyNpcAppearances(met: readonly string[]): NpcAppearanceJournal {
  return Object.fromEntries(met.map((key) => [key, LEGACY]));
}

export function npcKitFor(fieldMapId: string, seed: string, id: string, body: string, culture: StrangerCulture | null): AppearanceKit | null {
  const own = APPEARANCE_KITS.filter((kit) => kit.culture === culture);
  const pool = own.length ? own : APPEARANCE_KITS.filter((kit) => kit.culture === 'any');
  const matching = pool.filter((kit) => kit.look.body === body);
  const eligible = matching.length ? matching : pool;
  return eligible[tileHash(seed, 0, 0, `npc-appearance:${fieldMapId}:${id}`) % eligible.length] ?? null;
}

export function npcAppearance(
  fieldMapId: string, seed: string, id: string, body: string, culture: StrangerCulture | null
): Look | null {
  if (!active || (fieldMapId === TWIN_MAP ? twinWorldSeed(active.seed) !== seed : active.seed !== seed)) return null;
  const saved = active.journal[`${fieldMapId}:${id}`];
  if (saved === LEGACY) return null;
  const kit = saved ? APPEARANCE_KITS.find((candidate) => candidate.id === saved) : npcKitFor(fieldMapId, seed, id, body, culture);
  return kit?.look ?? null;
}

export function rememberNpcAppearance(journal: NpcAppearanceJournal, key: string, look: Look): void {
  if (Object.hasOwn(journal, key)) return;
  const kit = APPEARANCE_KITS.find((kit) => kit.look.body === look.body && kit.look.portraitId === look.portraitId);
  if (kit) journal[key] = kit.id;
}
