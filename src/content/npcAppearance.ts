import { tileHash } from '../world/rng';
import { TWIN_MAP, twinWorldSeed } from '../world/twinGeneration';
import { BODIES, type Headwear, type NpcLook } from './looks';
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

interface AppearanceKit { id: string; culture: string; look: NpcLook }

/** Only deal pairs whose sprite silhouettes match the painting. */
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

/** Keys are map-qualified NPC IDs. Values identify a painted kit. */
export type NpcAppearanceJournal = Record<string, string>;
export type GeneratedCulture = Exclude<StrangerCulture, 'elamite'>;

const kitsById = new Map(APPEARANCE_KITS.map((kit) => [kit.id, kit]));
let active: { seed: string; journal: NpcAppearanceJournal } | null = null;

export function bindNpcAppearances(seed: string, journal: NpcAppearanceJournal): void {
  active = { seed, journal };
}

export function readNpcAppearances(value: unknown): NpcAppearanceJournal {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, id]) => typeof id === 'string' && kitsById.has(id)));
}

export function npcKitFor(fieldMapId: string, seed: string, id: string, body: string, culture: GeneratedCulture): AppearanceKit {
  const eligible = APPEARANCE_KITS.filter((kit) => kit.culture === culture && kit.look.body === body);
  const kit = eligible[tileHash(seed, 0, 0, `npc-appearance:${fieldMapId}:${id}`) % eligible.length];
  if (!kit) throw new Error(`No painted NPC kit for ${culture} on ${body}`);
  return kit;
}

export function npcAppearance(
  fieldMapId: string, seed: string, id: string, body: string, culture: GeneratedCulture
): NpcLook {
  const npcSeed = fieldMapId === TWIN_MAP && seed ? twinWorldSeed(seed) : seed;
  const journeySeed = fieldMapId === TWIN_MAP && active?.seed ? twinWorldSeed(active.seed) : active?.seed;
  const key = `${fieldMapId}:${id}`;
  const saved = active && journeySeed === npcSeed ? kitsById.get(active.journal[key] ?? '') : undefined;
  return (saved ?? npcKitFor(fieldMapId, npcSeed, id, body, culture)).look;
}

export function rememberNpcAppearance(journal: NpcAppearanceJournal, key: string, look: NpcLook): void {
  if (Object.hasOwn(journal, key)) return;
  const kit = APPEARANCE_KITS.find((kit) => kit.look.body === look.body && kit.look.portraitId === look.portraitId);
  if (kit) journal[key] = kit.id;
}
