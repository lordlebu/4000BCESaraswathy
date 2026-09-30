// The service worker: what lets the game be installed, and opened again with no connection.
//
// This file is a template. `vite.config.ts` reads it at build time, replaces the build stamp below
// and writes it to `dist/sw.js`; it is never imported by the app and never runs in development.
//
// **It keeps what the player has already been sent, and nothing else.** The whole game is 30 MB
// and a journey opens on about 4.5, so fetching everything up front to make it "fully offline"
// would multiply the first visit by seven for paintings most players have not reached. Instead
// each file is kept as it is first fetched. Offline, the game opens and plays on any ground already
// walked; a plate never seen stays unseen until there is a connection again.
//
// **The cache is named for the build, and a new build throws the old one away.** Vite's files carry
// a hash of their contents, so a cached one can never be stale -- but an old one is never asked for
// again either, and without this they would sit on the player's disk for ever. itch.io makes that
// worse: every release is served from a new path on the same origin, so each one would leave its
// whole cache behind.
const BUILD = '__BUILD__';
const CACHE = `south-of-tethys-${BUILD}`;

self.addEventListener('install', () => {
  // Take over as soon as it is installed. There is no old version of the page worth protecting:
  // the page and its files are fetched together and named by hash.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith('south-of-tethys-') && name !== CACHE)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Only the game's own files. The canon service, when it is switched on, is another origin and
  // its answers are not this worker's to keep.
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;

  const hashed = url.pathname.includes('/assets/');
  event.respondWith(hashed ? cacheFirst(request) : networkFirst(request));
});

/** A file named by its hash is the same file for ever: answer from the cache and never ask twice. */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const kept = await cache.match(request);
  if (kept) return kept;
  const fresh = await fetch(request);
  if (fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

/**
 * The page itself, and anything else without a hash in its name.
 *
 * **Network first, because this is the one file that says which build to load.** Answered from the
 * cache first, a returning player would be handed last release's page for ever -- it would go on
 * asking for last release's files, find them all cached, and never learn there was a new one. The
 * cache is the answer only when there is no connection. The seed and the map travel in the query
 * string and the page is the same page for all of them, so the search is ignored when matching.
 */
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (error) {
    const kept = await cache.match(request, { ignoreSearch: true });
    if (kept) return kept;
    throw error;
  }
}
