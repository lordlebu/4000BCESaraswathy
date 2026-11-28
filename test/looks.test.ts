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
  lookKey,
  recolourTable
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
    const a = { body: 'traveller-carrier', skin: 'as-painted', cloth: 'ochre', second: 'indigo' };
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


});
