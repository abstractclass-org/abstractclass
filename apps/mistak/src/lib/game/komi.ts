// The komi limit of each size (docs/design/34-tak-site.md, item 8): the one table behind each check of a komi, the
// record's by its tags (record.ts) and a board's by its start.
import type { KomiLimit } from "@abstractclass/record/record.ts";
import { readPosition } from "./tps.ts";

/** The largest komi, either way, of each size that the network learns, in flats: the farthest komi mean of its training
 *  and three standard deviations of one flat (the engine repository's games/tak/docs/design/04-board-sizes-and-komi.md:
 *  5x5 at 0, 6x6 at 0 and 2, proposed). The values hold until a release names its trained range, which replaces them. */
const KOMI_LIMIT: Record<number, number> = { 5: 3, 6: 5 };

/** The sizes that the network learns. */
export const TRAINED_SIZES = Object.keys(KOMI_LIMIT).map(Number);

/** The komi limit at a start, in TPS. No start: the smallest limit, as no size is known. A size that the network does
 *  not learn has no limit: the import refuses the size itself (record.ts, takeRecord). */
export const komiLimit: Exclude<KomiLimit, number> = start => {
  const position = start ? readPosition(start) : null;
  if (position === null || typeof position === "string") return Math.min(...Object.values(KOMI_LIMIT));
  return KOMI_LIMIT[position.size] ?? Infinity;
};
