// The player's games, kept in the browser until a server exists (docs/design/04-product-shape.md): the shared store
// (@abstractclass/analysis/games.ts), with Hedge School's part. A game is stored as its record's text, so an export is
// the record itself, and a later server can import it as it is. The id is the first 12 hex digits of the SHA-256 of its
// moves: the same game imported twice is one game.
import { gameStore } from "@abstractclass/analysis/games.ts";
import { parseRecord, type GameRecord } from "./record.ts";
import { komiPrefix } from "@abstractclass/record/record.ts";
import { sha256Hex } from "@abstractclass/engine/artifacts.ts";
import { setUpStart } from "#lib/engine/notation.ts";

// The tree of a game's analysis as the browser keeps it, in the `branches` store: the shared analysis's
// (@abstractclass/analysis/kept.ts). A kept node is a BranchNode here.
export { BOARD_ID, branchNodes, keptNode, type KeptBoard, type KeptBranches, type KeptNode as BranchNode }
  from "@abstractclass/analysis/kept.ts";
// The marks of a game's review and its own settings: the shared store's.
export { markReviewed, replacesAnother, reviewAgainWhy, reviewCovers, reviewMark, setGameSettings, type GameSettings,
         type ReviewMark, type WantedReview } from "@abstractclass/analysis/games.ts";
// A stored game, with the partner site it came from by a link (design 18), and the call that keeps that partner: the
// shared store's.
export { setGamePartner, type StoredGame } from "@abstractclass/analysis/games.ts";
/** Openings' board (design 32), with the Analysis board's form, kept apart from the Analysis board's. */
export const OPENINGS_ID = "openings";

export async function gameId(moves: string[], start?: string, komi = 0): Promise<string> {
  // A set-up start and a komi come before the moves, so that the same moves from two starts, or at two komis, are two
  // games (design 24). A game from the standard start at komi 0 keeps the id of its moves alone, as before.
  const before = (start ? `${start} | ` : "") + komiPrefix(komi);
  return (await sha256Hex(new TextEncoder().encode(before + moves.join(" ")))).slice(0, 12);
}

// The game the Review link opens: the last one reviewed in this browser. Storage can be blocked, so a read or a write
// may fail, and the link then asks for a game. The review page's head reads it too (review/pageMarks.ts).
export const LAST_REVIEW = "learn-enclosure:last-review:1";

/** The store's calls (games.ts): `saveGame` keeps a game and answers its id and whether the browser kept it (storage
 *  can be blocked), `loadGame` reads one, `listGames` reads them all, newest first, and `readGames` reads the records
 *  of stored games, leaving out a game whose record does not read. `deleteGame` deletes a game, its variations and the
 *  Review link's pointer to it, for good (design 11). `lastReview` and `rememberReview` read and keep the id of the last
 *  game reviewed in this browser. */
export const { saveGame, loadGame, listGames, readGames, deleteGame, lastReview, rememberReview } =
  gameStore<GameRecord>({
    parse: parseRecord, lastReviewKey: LAST_REVIEW,
    id: record => gameId(record.moves, setUpStart(record.tags.Position), record.komi),
  });
