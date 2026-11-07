// The engine header's search bar and visits line (Hedge School's design 06, item 7): the search of the position, or of
// the threat. The bar fills to the budget. While the search runs or waits to run, the line gives the budget too
// ("1,234 of 4,096 visits"). Once no search goes on, the line drops the budget. At 360 pixels the line has about 155
// pixels, and a search stopped at its time limit then still shows "time limit" ("12,345 visits · time limit").
import { WHOLE } from "./game.ts";

/** The search behind the line. */
export interface SearchLine {
  /** The visits that the search has. */
  visits: number;
  /** The visits at which the search bar is full (the position's budget), or 0 where the page gives none. */
  budget: number;
  /** A search of this position runs now, or waits to run: its visits can still grow toward the budget. */
  goesOn: boolean;
  /** The search stopped at its time limit. */
  timedOut: boolean;
}

/** How full the search bar is, from 0 to 1, or null where the page gives no budget. A search stopped at its time limit
 *  has ended, so its bar is full (Lichess fills its bar by time). */
export function searchFill({ visits, budget, timedOut }: Omit<SearchLine, "goesOn">): number | null {
  return budget ? (timedOut ? 1 : Math.min(1, visits / budget)) : null;
}

/** The line's text: the visits, the budget while the search goes on and its bar is not full, and "time limit" after a
 *  search stopped at its time limit. */
export function visitsText(search: SearchLine): string {
  const { visits, budget, goesOn, timedOut } = search;
  const of = goesOn && (searchFill(search) ?? 1) < 1 ? ` of ${WHOLE.format(budget)}` : "";
  return `${WHOLE.format(visits)}${of} visits${timedOut ? " · time limit" : ""}`;
}
