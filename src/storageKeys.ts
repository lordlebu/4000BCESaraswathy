const PREFIX = 'south-of-tethys';

export function journeyStorageKey(seed: string): string {
  return `${PREFIX}:${seed}`;
}

export function worldStorageKey(seed: string, fieldMapId: string): string {
  return `${PREFIX}:world:${seed}:${fieldMapId}`;
}
