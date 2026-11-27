import { tileHash } from '../world/rng';
import { TWIN_MAP } from '../world/twinGeneration';

export const ELAMITE_APPEARANCES = {
  master: {
    title: 'caravan master', spriteId: 'elamite-master', portraitId: 'elamite-master', iconId: 'elamite-master',
    personality: 'measured', names: ['Hutar', 'Napilu', 'Temri']
  },
  handler: {
    title: 'wagon handler', spriteId: 'elamite-handler', portraitId: 'elamite-handler', iconId: 'elamite-handler',
    personality: 'patient', names: ['Kutem', 'Hutarik', 'Temaku']
  },
  'seal-keeper': {
    title: 'seal-keeper', spriteId: 'elamite-seal-keeper', portraitId: 'elamite-seal-keeper', iconId: 'elamite-seal-keeper',
    personality: 'meticulous', names: ['Naptira', 'Temishi', 'Kuteli']
  },
  'textile-merchant': {
    title: 'textile merchant', spriteId: 'elamite-textile-merchant', portraitId: 'elamite-textile-merchant', iconId: 'elamite-textile-merchant',
    personality: 'sociable', names: ['Kutara', 'Napisha', 'Temena']
  },
  artisan: {
    title: 'travelling artisan', spriteId: 'elamite-artisan', portraitId: 'elamite-artisan', iconId: 'elamite-artisan',
    personality: 'inventive', names: ['Naptek', 'Temarak', 'Kutir']
  },
  apprentice: {
    title: 'caravan apprentice', spriteId: 'elamite-apprentice', portraitId: 'elamite-apprentice', iconId: 'elamite-apprentice',
    personality: 'inquisitive', names: ['Temi', 'Hutina', 'Napele']
  }
} as const;

export type ElamiteRole = keyof typeof ELAMITE_APPEARANCES;

export function elamiteResidentId(cycle: number, role: ElamiteRole): string {
  return `elamite-${cycle}-${role}`;
}

/** A visit resident's role is recorded in their ID, so past visits need no schedule replay. */
export function elamiteKit(fieldMapId: string, id: string) {
  if (fieldMapId !== TWIN_MAP) return null;
  const match = /^elamite-(0|[1-9]\d*)-([a-z-]+)$/.exec(id);
  if (!match) return null;
  const cycle = Number(match[1]);
  const role = match[2] as ElamiteRole;
  if (!Number.isSafeInteger(cycle) || !Object.hasOwn(ELAMITE_APPEARANCES, role)) return null;
  return { cycle, role, kit: ELAMITE_APPEARANCES[role] };
}

export function elamiteIdentity(fieldMapId: string, id: string, seed: string) {
  const appearance = elamiteKit(fieldMapId, id);
  if (!appearance) return null;
  const { cycle, role, kit } = appearance;
  const givenName = kit.names[tileHash(seed, cycle, 0, `elamite:name:${role}`) % kit.names.length]!;
  return { id, cycle, role, givenName, culture: 'elamite' as const, kit };
}
