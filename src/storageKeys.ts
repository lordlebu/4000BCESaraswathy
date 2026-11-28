export const JOURNEY_VERSION = 20;
const PREFIX = `south-of-tethys-v${JOURNEY_VERSION}`;
export const LAST_SEED_KEY = `${PREFIX}:last-seed`;

export function journeyStorageKey(seed: string): string {
  return `${PREFIX}:journey:${encodeURIComponent(seed)}`;
}

export function worldStorageKey(seed: string, fieldMapId: string): string {
  return `${PREFIX}:world:${encodeURIComponent(seed)}:${fieldMapId}`;
}

/** Erase only this game's retired storage footprint. Run before resolving the startup seed. */
export function eraseRetiredStorage(storage: Storage): boolean {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
  let erased = false;
  for (const key of keys) {
    if (!key?.startsWith('south-of-tethys:')) continue;
    storage.removeItem(key);
    erased = true;
  }
  return erased;
}
