// The rank chips at the corner of a blueprint's panel in a hand (Hand.svelte): one for each candidate that places the
// blueprint, so that a reader sees which blueprint each candidate takes. A panel holds as many as fit in one row beside
// its number. Where more candidates place the blueprint, the best ones show, and the last chip gives how many more
// ("+N"). A row that wrapped would cover the blueprint's cells.

/** The chips of a row `room` pixels wide, each `size` pixels with `gap` between: the chips shown, best first, and the
 *  count of the others, which one more chip gives, `moreSize(count)` pixels wide for its text ("+26"). That chip fits
 *  always. */
export function chipRow<T>(chips: readonly T[], room: number, size: number, gap: number,
                           moreSize: (more: number) => number = () => size): { shown: T[]; more: number } {
  if (chips.length * (size + gap) - gap <= room) return { shown: [...chips], more: 0 };
  let k = chips.length - 1;
  while (k > 0 && k * (size + gap) + moreSize(chips.length - k) > room) k--;
  return { shown: chips.slice(0, k), more: chips.length - k };
}
