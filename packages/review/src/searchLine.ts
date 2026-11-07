// The engine header's visits line (Hedge School's design 06, item 7): the visits of the position's search, or of the
// threat's. While the search runs or waits to run, the line gives the budget too ("1,234 of 4,096 visits"), as its
// bar fills to it. Once no search goes on, the line drops the budget. At 360 pixels the line has about 155 pixels,
// and a search stopped at its time limit then still shows "time limit" ("12,345 visits · time limit").

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

/** The line's text: the visits, the budget while the search goes on short of it, and "time limit" after a search
 *  stopped at its time limit. */
export function visitsText({ visits, budget, goesOn, timedOut }: SearchLine): string {
  const of = goesOn && !timedOut && budget > 0 && visits < budget ? ` of ${budget.toLocaleString("en")}` : "";
  return `${visits.toLocaleString("en")}${of} visits${timedOut ? " · time limit" : ""}`;
}
