// What the site measures (design 17): a count sent to Google Analytics goes as a range when its exact value could set a
// visitor apart or would only scatter the reports, and never holds a game, a player's name or a game's id. These are
// the ranges, and the settings' names as the events give them.

/** A number as the range it falls in: "30-59", or "120+" past the last start. `starts` go up, the first at the least. */
export function range(n: number, starts: number[]): string {
  let i = starts.length - 1;
  while (i > 0 && n < starts[i]) i--;
  const next = starts[i + 1];
  return next === undefined ? `${starts[i]}+` : next - 1 === starts[i] ? `${starts[i]}` : `${starts[i]}-${next - 1}`;
}

/** A game's edges (120 at most). */
export const EDGE_RANGES = [1, 30, 60, 90, 120];
/** The machine's cores (navigator.hardwareConcurrency). */
export const CORE_RANGES = [1, 3, 5, 9, 17];
/** A review's minutes, from its start to its end. */
export const MINUTE_RANGES = [0, 1, 3, 10, 30, 60];
/** A share link's characters: Discord takes 2,000 in a message. */
export const LINK_RANGES = [0, 500, 1000, 2000, 4000];
/** The games kept in the browser. */
export const GAME_RANGES = [0, 1, 2, 5, 10, 25];
/** A practice game's takebacks (design 24). */
export const TAKEBACK_RANGES = [0, 1, 2, 5];
/** The practice bot's seconds for a turn, on average over a game: under 1, then 1-2, 3-9, 10-29 and 30 or more. */
export const BOT_SECOND_RANGES = [0, 1, 3, 10, 30];
