// Talks to the canon API, when there is one.
//
// The game has never made a network call and still does not need to. Canon is baked into
// the bundle at build time, and everything the journal says works offline. This adds one
// optional thing on top: asking the canon database what it knows about the tile you are
// standing on, which a static file cannot do because it means searching 421 embedded
// chunks of the whole corpus, not just the species table.
//
// Three rules hold it together:
//
//   * it lives in `ui/`. `world/` and `content/` are framework-free and pure, and a fetch
//     is neither — putting it there would break the layering and the tests that rely on it.
//   * absence is normal. No service, no network, a 500, a timeout: the panel simply does
//     not appear and the journal is exactly what it is today. This is never an error the
//     player has to see.
//   * results are cached by seed and tile. Generated prose cannot be deterministic, but a
//     place you walk back to should read the same as it did the first time — which is what
//     the determinism rule is really protecting.

// Opt-in, and the default is off.
//
// This defaulted to http://localhost:8000, which meant every page load probed for a service
// that almost nobody is running. The JS rejection was caught, but a browser still logs a
// refused request to the console, and the e2e suite treats any console error as a failure —
// so two specs went red the moment this shipped. The deeper problem was the claim: the game
// is supposed to make no network calls unless you ask it to, and a probe on every load is a
// network call.
//
// Set VITE_CANON_API to switch it on. Unset, nothing here ever touches the network.
//
// Read per call rather than frozen at module load, so the tests can exercise both the
// configured and unconfigured paths in one process. Vite still inlines the value at build
// time either way.
function baseUrl(): string | null {
  const raw = import.meta.env.VITE_CANON_API;
  return raw ? raw.replace(/\/$/, '') : null;
}

// Three different waits, because they answer three different questions.
//
// The health check must fail fast: almost nobody running `npm run dev` has a canon service,
// and they should not stare at a pending panel for ten seconds to learn that.
// Retrieval is ~100ms warm but the first query in a fresh service pays for loading the
// embedding model, and 2.5s was not enough for it — the request went out, the abort fired,
// and the panel silently showed nothing.
// Generation loads a language model and is measured in seconds at best.
const HEALTH_TIMEOUT_MS = 2500;
const LORE_TIMEOUT_MS = 10000;
const ASK_TIMEOUT_MS = 30000;

export interface CanonSource {
  entity_id: string;
  name: string | null;
  type: string | null;
  source: string;
  distance: number;
}

export interface CanonLore {
  query: string;
  sources: CanonSource[];
  passage?: string | null;
}

export interface Place {
  seed: string;
  x: number;
  y: number;
  biome: string;
  creature?: string | null;
  flora?: string | null;
  landmark?: string | null;
}

async function post<T>(path: string, body: unknown, timeout: number): Promise<T | null> {
  const base = baseUrl();
  if (!base) return null;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeout);
  try {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: abort.signal
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // Offline, no service, CORS, timeout — all the same answer to the player: nothing here.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Is a canon service listening? Asked once, so the UI can stay quiet when it is not. */
export async function canonAvailable(): Promise<boolean> {
  const base = baseUrl();
  if (!base) return false;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), HEALTH_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/health`, { signal: abort.signal });
    if (!res.ok) return false;
    const body = (await res.json()) as { ok?: boolean; chroma?: boolean };
    // `ok` without `chroma` means the service is up but has no index — nothing to say.
    return body.ok === true && body.chroma === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

const cache = new Map<string, CanonLore>();

const key = (p: Place, kind: string) => `${kind}:${p.seed}:${p.x},${p.y}`;

/** What canon knows about this tile. Retrieval only — fast, and the reliable half. */
export async function loreFor(place: Place): Promise<CanonLore | null> {
  const k = key(place, 'lore');
  const hit = cache.get(k);
  if (hit) return hit;

  const body = await post<CanonLore>('/lore', { ...place, k: 4 }, LORE_TIMEOUT_MS);
  if (body) cache.set(k, body);
  return body;
}

/**
 * A written passage about this tile.
 *
 * Slow, and only as good as whatever model the service has loaded — so the caller treats a
 * null as ordinary. Cached like the rest: the prose is not reproducible from the seed, but
 * within a session a place reads the same each time you return to it.
 */
export async function askAbout(place: Place): Promise<CanonLore | null> {
  const k = key(place, 'ask');
  const hit = cache.get(k);
  if (hit) return hit;

  const body = await post<CanonLore>('/ask', { ...place, k: 3 }, ASK_TIMEOUT_MS);
  if (body?.passage) cache.set(k, body);
  return body;
}
