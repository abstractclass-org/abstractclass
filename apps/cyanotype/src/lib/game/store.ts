// The player's games, kept in this browser (design 33, as Hedge School's src/lib/game/store.ts): the shared store
// (@abstractclass/analysis/games.ts), with Cyanotype's part: its record's reader, its game's id and the key that names
// the last game reviewed. A game's variations are in the `branches` store under the same id
// (@abstractclass/analysis/kept.ts). The review kept each game that it opened in the same store before the list
// existed, under the same id: the list shows those games too.
import { gameStore } from "@abstractclass/analysis/games.ts";
import { komiPrefix } from "@abstractclass/record/record.ts";
import { parseRecord, type GameRecord } from "./record.ts";
import { setUpStart } from "./position.ts";
import { LAST_REVIEW_KEY } from "../site.ts";
// The marks of a game's review and its own settings: the shared store's.
export { markReviewed, reviewAgainWhy, reviewCovers, reviewMark, setGamePartner, setGameSettings, type ReviewMark,
         type StoredGame } from "@abstractclass/analysis/games.ts";

/** A short name of a game's moves, its key in this browser's store: two games with the same moves are one game, and
 *  share their variations, as their positions share the engine's results. A komi comes before the moves (Hedge
 *  School's design 24): the same moves at another komi are another game. A set-up start comes first: a practice game
 *  from the Analysis board's set-up position is kept here (design 33, "The player's games"), and the same moves from
 *  another start are another game. A game from the standard start keeps the id of its komi and moves alone, so the ids
 *  of the games kept before the start counted stay as they were. FNV-1a, 32 bits. */
export function gameId(moves: string[], komi = 0, start?: string): string {
  let h = 0x811c9dc5;
  for (const c of (start ? `start ${start} | ` : "") + komiPrefix(komi) + moves.join(" ")) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0;
  return `review-${moves.length}-${h.toString(16).padStart(8, "0")}`;
}

/** The store's calls (games.ts): `saveGame` keeps a game and answers its id and whether the browser kept it (storage
 *  can be blocked), `loadGame` reads one, `listGames` reads them all, newest first, leaving out a game whose record
 *  does not read. `deleteGame` deletes a game, its variations and the Review link's pointer to it, for good (Hedge
 *  School's design 11). `lastReview` and `rememberReview` read and keep the id of the last game reviewed in this
 *  browser. `readGames` reads the records of stored games, for the removal of earlier results (earlierResults.ts). */
export const { saveGame, loadGame, listGames, readGames, deleteGame, lastReview, rememberReview } = gameStore<GameRecord>({
  parse: parseRecord, lastReviewKey: LAST_REVIEW_KEY, id: record => gameId(record.moves, record.komi, setUpStart(record.tags.Position)),
});
