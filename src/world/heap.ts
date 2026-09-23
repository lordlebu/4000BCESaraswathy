// A binary min-heap ordered by a comparator.
//
// `rivers.ts` has its own, keyed by one number, and it is left alone: Priority-Flood's output on
// tied keys depends on exactly how that heap sifts, and every stored river was carved by it. This
// one exists for `findPath`, whose tie-break is a four-part order -- cost, then y, then x, then
// insertion -- that a single number cannot carry without packing coordinates into it, which would
// break silently the day a map grew past the packing.
//
// Because that order is total (insertion breaks every remaining tie), any correct priority queue
// pops the same sequence, so swapping the sorted array for this changes no path anywhere.
// `test/pathfind.test.ts` checks that against the old implementation directly.

export class Heap<T> {
  private readonly items: T[] = [];

  constructor(private readonly before: (a: T, b: T) => number) {}

  get size(): number {
    return this.items.length;
  }

  push(item: T): void {
    const items = this.items;
    items.push(item);
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.before(items[parent]!, items[i]!) <= 0) break;
      [items[parent], items[i]] = [items[i]!, items[parent]!];
      i = parent;
    }
  }

  pop(): T | undefined {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (items.length && last !== undefined) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let first = i;
        if (l < items.length && this.before(items[l]!, items[first]!) < 0) first = l;
        if (r < items.length && this.before(items[r]!, items[first]!) < 0) first = r;
        if (first === i) break;
        [items[first], items[i]] = [items[i]!, items[first]!];
        i = first;
      }
    }
    return top;
  }
}
