/** Scene-owned movement state, usable as a browser-side wait predicate. */
export function walkerIdle(): boolean {
  const read = (window as unknown as { __walker?: () => { moving: boolean; queued: number; pending: boolean } }).__walker;
  if (!read) return false;
  const walker = read();
  return !walker.moving && !walker.pending && walker.queued === 0;
}
