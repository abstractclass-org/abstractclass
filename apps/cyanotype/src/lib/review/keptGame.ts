// The game in review, as this browser keeps it (design 33): Cyanotype has no list of games yet (abscls-8tl1.38). The
// browser's store of games (@abstractclass/storage/db.ts, STORES.games) keeps each game that comes to the review (its
// record), under the game's id, and local storage names the game in review. The game's variations are in the
// `branches` store under the same id (@abstractclass/analysis/kept.ts).
import { STORES, dbGet, dbPut } from "@abstractclass/storage/db.ts";
import { writeLocal } from "@abstractclass/storage/local.ts";
import { mergeBranches, type KeptBranches } from "@abstractclass/analysis/kept.ts";
import { parseRecord } from "../game/record.ts";
import { sharedRecord, type SharedReview } from "../game/share.ts";
import { REVIEW_GAME_KEY } from "../site.ts";

/** A game as this browser keeps it: its record, and when it came. */
export interface KeptGame { record: string; added: string }

/** A short name of a game's moves, its key in this browser's store: two games with the same moves are one game, and
 *  share their variations, as their positions share the engine's results. FNV-1a, 32 bits. */
export function gameId(moves: string[]): string {
  let h = 0x811c9dc5;
  for (const c of moves.join(" ")) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0;
  return `review-${moves.length}-${h.toString(16).padStart(8, "0")}`;
}

/** Keeps a game's record in this browser's store, and makes it the game in review. Answers its id. Throws a
 *  RecordError when the record cannot be read. */
export async function keepGame(text: string): Promise<string> {
  const id = gameId(parseRecord(text).moves);
  await dbPut(STORES.games, id, { record: text, added: new Date().toISOString() } satisfies KeptGame);
  writeLocal(REVIEW_GAME_KEY, id);
  return id;
}

/** Keeps a shared review's game as the game in review, with the sender's variations after the ones that this browser
 *  keeps for that game (Hedge School's design 13, item 8). Answers the game's id. */
export async function keepShared(shared: SharedReview): Promise<string> {
  const id = await keepGame(sharedRecord(shared));
  if (shared.branches.length)
    await dbPut(STORES.branches, id, mergeBranches((await dbGet<KeptBranches>(STORES.branches, id)) ?? null,
                                                   { version: 2, nodes: shared.branches }));
  return id;
}
