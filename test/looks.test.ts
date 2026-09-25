// Strangers' looks: three painted bodies, re-dyed into a road of people.
//
// Two halves, as with the travellers. The rules -- who wears what, and that it never changes -- are
// checked here. **That the colours listed are actually in the sheets is also checked here**, by
// decoding the built PNGs, because a rebuilt body with a stale `assets/looks.json` would dye nothing
// at all and draw every stranger exactly as painted, with every rule still green.

import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BODIES,
  DYES,
  SKIN_TONES,
  lookFor,
  lookKey,
  recolourTable,
  swatchesFor
} from '../src/content/looks';
import { recolourPixels } from '../src/game/recolour';
import { TRAVELLER_ART } from '../src/game/characters';
import { fieldMaps } from '../src/content/places';
import { travellersOn } from '../src/content/travellers';

const { decodePng } = createRequire(import.meta.url)('../tools/sprite-png.js') as {
  decodePng: (file: string) => { width: number; height: number; data: Uint8Array };
};
const sheet = (body: string) => decodePng(join(__dirname, '..', 'assets', `${body}-overworld.png`));

const hexAt = (data: Uint8Array, i: number) =>
  `#${[data[i]!, data[i + 1]!, data[i + 2]!].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

function coloursIn(data: Uint8Array): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] !== 0) out.add(hexAt(data, i));
  return out;
}

const ids = Array.from({ length: 400 }, (_, i) => `stranger-${i}`);

describe('the manifest names real colours', () => {
  it('lists a palette for every traveller body, and only for those', () => {
    expect(Object.keys(BODIES).sort()).toEqual(Object.keys(TRAVELLER_ART).sort());
  });

  it('lists only colours the built sheet actually contains', () => {
    // The failure this exists for: `npm run build:sprite` re-quantises a body and every colour
    // moves by a unit or two. Nothing throws; the dye table simply matches nothing.
    for (const [body, palette] of Object.entries(BODIES)) {
      const present = coloursIn(sheet(body).data);
      for (const hex of [...palette.skin, ...palette.cloth, ...palette.second]) {
        expect(present.has(hex), `${body}: ${hex} is not in the built sheet -- re-derive looks.json by eye`).toBe(true);
      }
    }
  });

  it('never lists one colour in two groups', () => {
    for (const [body, p] of Object.entries(BODIES)) {
      const all = [...p.skin, ...p.cloth, ...p.second];
      expect(new Set(all).size, `${body} lists a colour twice`).toBe(all.length);
    }
  });
});

describe('who wears what', () => {
  it('gives the same person the same look every time', () => {
    for (const id of ids.slice(0, 50)) {
      expect(lookFor(id, 'traveller-drover')).toEqual(lookFor(id, 'traveller-drover'));
    }
  });

  it('refuses a body with no palette, so the player is never re-dyed', () => {
    expect(lookFor('stranger-1', 'varuna')).toBeNull();
    expect(lookFor('stranger-1', 'constructor')).toBeNull();
  });

  it('never dyes both garments the same colour', () => {
    for (const id of ids) {
      const look = lookFor(id, 'traveller-carrier')!;
      expect(look.second).not.toBe(look.cloth);
    }
  });

  it('uses every dye and every skin tone across a crowd', () => {
    const cloth = new Set(ids.map((id) => lookFor(id, 'traveller-pilgrim')!.cloth));
    const skin = new Set(ids.map((id) => lookFor(id, 'traveller-pilgrim')!.skin));
    expect([...cloth].sort()).toEqual(DYES.map((d) => d.id).sort());
    expect([...skin].sort()).toEqual(SKIN_TONES.map((t) => t.id).sort());
  });

  it('re-dresses almost nobody when a dye is added', () => {
    // Rendezvous hashing's promise, measured: a ninth dye of average weight should take about its
    // own share of people and leave the rest in what they wore. A modulo would move most of them.
    const before = ids.map((id) => lookFor(id, 'traveller-drover')!.cloth);
    const extra = { id: 'saffron', name: 'saffron', hue: 38, sat: 0.8, weight: 2 };
    (DYES as unknown as { push: (d: typeof extra) => void }).push(extra);
    try {
      const after = ids.map((id) => lookFor(id, 'traveller-drover')!.cloth);
      const moved = before.filter((c, i) => after[i] !== c);
      // Everybody who moved went to the new dye; nobody swapped between two old ones.
      expect(after.filter((c, i) => c !== before[i] && c !== 'saffron')).toEqual([]);
      expect(moved.length / ids.length).toBeLessThan(0.2);
    } finally {
      (DYES as unknown as { pop: () => void }).pop();
    }
  });

  it('dresses every stranger on every map', () => {
    for (const map of fieldMaps) {
      for (const t of travellersOn(map.id)) {
        if (!Object.hasOwn(BODIES, t.art)) continue;
        expect(t.look, `${t.id} on ${map.id} has no look`).not.toBeNull();
        expect(t.look!.body).toBe(t.art);
      }
    }
  });

  it('keys a texture by everything that changes it', () => {
    const a = lookFor('stranger-1', 'traveller-carrier')!;
    expect(lookKey(a)).toBe(`traveller-carrier~${a.skin}~${a.cloth}~${a.second}`);
  });
});

describe('the dye reaches the pixels', () => {
  it('changes the listed colours and nothing else', () => {
    for (const body of Object.keys(BODIES)) {
      const { data } = sheet(body);
      const look = { body, skin: 'deep', cloth: 'indigo', second: 'madder' };
      const table = recolourTable(look);
      const copy = new Uint8Array(data);
      const changed = recolourPixels(copy, table);
      expect(changed, `${body}: the dye matched no pixel`).toBeGreaterThan(200);

      for (let i = 0; i < data.length; i += 4) {
        const was = hexAt(data, i);
        const now = hexAt(copy, i);
        if (table.has(was)) expect(now).toBe(table.get(was));
        else expect(now, `${body}: ${was} is not listed and was changed`).toBe(was);
        expect(copy[i + 3]).toBe(data[i + 3]);
      }
    }
  });

  it('keeps the painter’s folds: a dyed ramp stays in the same light order', () => {
    // The reason lightness is kept rather than replaced. If the dye flattened the ramp, the
    // pilgrim's hood would lose its folds and read as a cut-out.
    const pilgrim = BODIES['traveller-pilgrim']!;
    const table = recolourTable({ body: 'traveller-pilgrim', skin: 'as-painted', cloth: 'madder', second: 'leaf' });
    const light = (hex: string) => {
      const n = Number.parseInt(hex.slice(1), 16);
      return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255);
    };
    const byBefore = [...pilgrim.cloth].sort((x, y) => light(x) - light(y));
    const after = byBefore.map((h) => light(table.get(h)!));
    expect(after).toEqual([...after].sort((x, y) => x - y));
  });

  it('draws the face in the colours the figure is wearing', () => {
    const drover = swatchesFor({ body: 'traveller-drover', skin: 'as-painted', cloth: 'indigo', second: 'leaf' });
    // His turban is never dyed, so the face must not dye it either.
    expect(drover.headwear).toBe('#f9e3cc');
    expect(drover.shoulders).toBe(
      recolourTable({ body: 'traveller-drover', skin: 'as-painted', cloth: 'indigo', second: 'leaf' }).get('#5c5d35')
    );
    const pilgrim = swatchesFor({ body: 'traveller-pilgrim', skin: 'as-painted', cloth: 'lac', second: 'leaf' });
    expect(pilgrim.headwear).toBe(pilgrim.shoulders);
  });
});
