// A candidate's name in the analysis table, as large as its cell allows (the view's `fitName`, ReviewView.svelte's
// fitNames): the page measures the name's width at full size and its cell's, and draws the name at this size.

/** A name's size, as a share of its full size: 1 when its full width `full` fits its cell's width `room`, else just as
 *  small as it must be (in thousandths, down), and `least` at the least, where the name is cut. A cell with no width
 *  (a hidden tab's) keeps the full size. */
export function nameSize(room: number, full: number, least: number): number {
  return room > 0 && full > room ? Math.max(least, Math.floor((room / full) * 1000) / 1000) : 1;
}
