import { describe, expect, it } from 'vitest';
import { hospitalityOffer } from '../src/content/campHospitality';
import { campPeople } from '../src/content/campLife';
import { caravanCarriesEnkidu } from '../src/content/enkidu';
import type { Encampment } from '../src/content/encampments';
import {
  PAINTED_APPEARANCE, bindNpcAppearances, legacyNpcAppearances, rememberNpcAppearance
} from '../src/content/npcAppearance';
import { travellersOn } from '../src/content/travellers';
import { artNames, preferredArtSelection } from '../src/ui/art';
import { paintedFaceFor } from '../src/ui/StrangerFace';
import { TWIN_MAP, twinWorldSeed } from '../src/world/twinGeneration';

const seed = 'hearth-level-1-test';
const maps = ['field_map_lothal', 'field_map_narmada', 'field_map_dwarka', 'field_map_aravali', TWIN_MAP];
const kinds = ['drovers', 'pilgrims', 'adventurers', 'dacoits'] as const;
const camp: Encampment = { id: 'camp:2', at: { x: 1, y: 1 }, from: 2, to: 6, kind: 'drovers', near: null };

describe('Bow and Hearth Level 1', () => {
  it('audits the generic portrait library and resolves paintings for new road and camp company', () => {
    const names = artNames('faces').filter((name) => /^(any|asura_hybrid|harappan|kia|maru)-/.test(name));
    expect(names).toHaveLength(25);
    expect(new Set(Object.keys(PAINTED_APPEARANCE))).toEqual(new Set(names));
    bindNpcAppearances(seed, {});
    for (const map of maps) {
      const worldSeed = map === TWIN_MAP ? twinWorldSeed(seed) : seed;
      const road = travellersOn(map, worldSeed).filter(({ npcId }) => npcId === null);
      expect(road.length).toBeGreaterThan(0);
      const residents = kinds.flatMap((kind) => campPeople({ ...camp, kind }, map, worldSeed));
      for (const npc of [...road, ...residents]) {
        expect(npc.look?.portraitId, `${map}:${npc.id}`).toBeTruthy();
        expect(npc.look?.body).toBe(npc.art);
        expect(paintedFaceFor({ ...npc, id: `${map}:${npc.id}`, look: npc.look! })).toBeTruthy();
      }
    }
  });

  it('preserves a met traveller’s legacy appearance and pins new kit IDs on meeting', () => {
    const map = 'field_map_lothal';
    bindNpcAppearances('another-journey', {});
    const legacy = travellersOn(map, seed).find(({ npcId }) => npcId === null)!;
    const key = `${map}:${legacy.id}`;
    bindNpcAppearances(seed, legacyNpcAppearances([key]));
    expect(travellersOn(map, seed).find(({ id }) => id === legacy.id)).toEqual(legacy);
    const journal = {};
    bindNpcAppearances(seed, journal);
    const dressed = travellersOn(map, seed).find(({ id }) => id === legacy.id)!;
    expect(dressed.look?.portraitId).toBeTruthy();
    rememberNpcAppearance(journal, key, dressed.look!);
    expect(journal).toHaveProperty([key], expect.stringContaining(dressed.look!.portraitId!));
    bindNpcAppearances(seed, { ...journal });
    expect(travellersOn(map, seed).find(({ id }) => id === legacy.id)).toEqual(dressed);
  });

  it('gives each camp its own overnight offer and makes declining consequence-free', () => {
    const hostCamps = [
      ...kinds.map((kind) => ({ ...camp, kind })),
      { ...camp, caravan: { id: 'caravan:2', route: [camp.at], wagon: 'covered', cargoLayout: 0, thirdRole: 'artisan' } } as const
    ] satisfies Encampment[];
    const offers = hostCamps.map((host) => hospitalityOffer(host, TWIN_MAP));
    expect(offers.map(({ art }) => art)).toEqual([...kinds, 'elamite'].map((kind) => `woven-camp-sleep-${kind}`));
    for (const offer of offers) {
      expect(offer.subjectId).toBe(camp.id);
      expect(preferredArtSelection('events', [offer.art])).toMatchObject({ key: offer.art });
      expect(offer.choices.map(({ id, sets }) => ({ id, sets }))).toEqual([
        { id: 'stay', sets: ['hospitality:camp:2'] },
        { id: 'leave', sets: undefined }
      ]);
    }
  });

  it('rolls the Enkidu guest independently per visit and keeps the roll stable', () => {
    const visits = Array.from({ length: 250 }, (_, i) => `western:${i}`);
    const eligible = visits.filter((id) => caravanCarriesEnkidu(seed, id));
    expect(eligible.length).toBeGreaterThan(12);
    expect(eligible.length).toBeLessThan(42);
    expect([...visits].reverse().filter((id) => caravanCarriesEnkidu(seed, id))).toEqual([...eligible].reverse());
  });
});
