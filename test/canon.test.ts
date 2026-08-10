// The canon service is optional, and almost always absent.
//
// Nobody who clones this repo and runs `npm run dev` has a Python service and a vector index
// running beside it, and CI certainly does not. So the behaviour worth protecting is not that
// retrieval works — that needs the service, and is verified by hand — but that its absence is
// completely invisible: no thrown error, no console noise, no panel, and a journal that reads
// exactly as it does today.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { askAbout, canonAvailable, loreFor, type Place } from '../src/ui/canonClient';

const place: Place = { seed: 'lothal', x: 3, y: 4, biome: 'wetland', creature: 'Lothal Marsh-Lurker' };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('when no canon service is listening', () => {
  it('reports unavailable rather than throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(canonAvailable()).resolves.toBe(false);
  });

  it('returns nothing from lore instead of failing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(loreFor({ ...place, x: 90 })).resolves.toBeNull();
  });

  it('returns nothing from ask instead of failing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(askAbout({ ...place, x: 91 })).resolves.toBeNull();
  });
});

describe('when the service is up but has no index', () => {
  it('still reports unavailable — an empty collection has nothing to say', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, chroma: false }) })
    );
    await expect(canonAvailable()).resolves.toBe(false);
  });
});

describe('when the service answers', () => {
  it('passes the tile through and returns its sources', async () => {
    const body = {
      query: 'Lothal Marsh-Lurker, wetland of Jambhudweepa',
      sources: [{ entity_id: 'fauna_lothal_marsh_lurker', name: 'Lothal Marsh-Lurker', type: 'fauna', source: 'database/fauna/x.json', distance: 0.29 }]
    };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => body });
    vi.stubGlobal('fetch', fetchMock);

    const got = await loreFor({ ...place, x: 11, y: 12 });
    expect(got?.sources[0]?.entity_id).toBe('fauna_lothal_marsh_lurker');

    const sent = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(sent).toMatchObject({ seed: 'lothal', x: 11, y: 12, biome: 'wetland' });
  });

  it('asks once per tile — a place you walk back to reads the same', async () => {
    const body = { query: 'q', sources: [] };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => body });
    vi.stubGlobal('fetch', fetchMock);

    const tile = { ...place, x: 42, y: 43 };
    await loreFor(tile);
    await loreFor(tile);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('treats a 500 as nothing to say', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(loreFor({ ...place, x: 77 })).resolves.toBeNull();
  });
});
