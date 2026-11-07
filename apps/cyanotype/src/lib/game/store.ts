// The player's games, kept in this browser (design 33, as Hedge School's src/lib/game/store.ts): the shared store
// (@abstractclass/analysis/games.ts), with Cyanotype's part: its record's reader, its game's id and the key that names
// the last game reviewed. A game's variations are in the `branches` store under the same id
// (@abstractclass/analysis/kept.ts). The review kept each game that it opened in the same store before the list
// existed, under the same id: the list shows those games too.
import { gameStore } from "@abstractclass/analysis/games.ts";
import { komiPrefix } from "@abstractclass/record/record.ts";
import { parseRecord, type GameRecord } from "./record.ts";
import { REVIEW_GAME_KEY } from "../site.ts";
// The marks of a game's review and its own settings: the shared store's.
export { markReviewed, reviewAgainWhy, reviewCovers, reviewMark, setGameSettings, type GameSettings, type ReviewMark,
         type StoredGame } from "@abstractclass/analysis/games.ts";

/** A short name of a game's moves, its key in this browser's store: two games with the same moves are one game, and
 *  share their variations, as their positions share the engine's results. A komi comes before the moves (Hedge
 *  School's design 24): the same moves at another komi are another game. FNV-1a, 32 bits. The review takes games
 *  from the standard start only (setUpProblem), so the id has no start. */
export function gameId(moves: string[], komi = 0): string {
  let h = 0x811c9dc5;
  for (const c of komiPrefix(komi) + moves.join(" ")) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0;
  return `review-${moves.length}-${h.toString(16).padStart(8, "0")}`;
}

/** The store's calls (games.ts): `saveGame` keeps a game and answers its id and whether the browser kept it (storage
 *  can be blocked), `loadGame` reads one, `listGames` reads them all, newest first, leaving out a game whose record
 *  does not read. `deleteGame` deletes a game, its variations and the Review link's pointer to it, for good (Hedge
 *  School's design 11). `lastReview` and `rememberReview` read and keep the id of the last game reviewed in this
 *  browser. */
export const { saveGame, loadGame, listGames, deleteGame, lastReview, rememberReview } = gameStore<GameRecord>({
  parse: parseRecord, lastReviewKey: REVIEW_GAME_KEY, id: record => gameId(record.moves, record.komi),
});
