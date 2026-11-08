/** A share of win chance in whole percent, as the sections of the pages "How a review works" give it: 0.05 is "5%".
 *  (model.ts's `pct` keeps one decimal, for the review's notes.) */
export const wholePct = (v: number) => `${Math.round(100 * v)}%`;
