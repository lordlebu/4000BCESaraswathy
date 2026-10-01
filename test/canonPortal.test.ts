// The canon panel names what canon holds; the lore portal on the canon service shows it whole.
// `portalLink` is the one place that turns an entity id into that address.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { portalLink } from '../src/ui/canonClient';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('a link into the lore portal', () => {
  it('is nothing at all when there is no canon service', () => {
    vi.stubEnv('VITE_CANON_API', '');
    expect(portalLink('character_asura_tainted_princess')).toBeNull();
  });

  it("opens the entry by its id at the service's root", () => {
    // A trailing slash on the configured address must not become a double one.
    vi.stubEnv('VITE_CANON_API', 'https://south-of-tethys-canon.vercel.app/');
    expect(portalLink('character_asura_tainted_princess')).toBe(
      'https://south-of-tethys-canon.vercel.app/#character_asura_tainted_princess'
    );
  });
});
