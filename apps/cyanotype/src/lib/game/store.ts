// The game in review, as this browser keeps it (design 33): Cyanotype has no list of games yet (abscls-8tl1.38). The
// browser's store of games (@abstractclass/storage/db.ts, STORES.games) keeps each game that comes to the review (its
// record), under the game's id, and local storage names the game in review. The game's variations are in the
// `branches` store under the same id (@abstractclass/analysis/kept.ts).
import { STORES, dbGet, dbPut } from "@abstractclass/storage/db.ts";
import { writeLocal } from "@abstractclass/storage/local.ts";
import { mergeBranches, type KeptBranches } from "@abstractclass/analysis/kept.ts";
import { komiPrefix } from "@abstractclass/record/record.ts";
import { parseRecord, setUpProblem } from "../game/record.ts";
import { sharedRecord, type SharedReview } from "../game/share.ts";
import { REVIEW_GAME_KEY, SITE_NAME } from "../site.ts";

/** A game as this browser keeps it: its record, and when it came. */
export interface KeptGame { record: string; added: string }

/** A short name of a game's moves, its key in this browser's store: two games with the same moves are one game, and
 *  share their variations, as their positions share the engine's results. A komi comes before the moves (Hedge
 *  School's design 24): the same moves at another komi are another game. FNV-1a, 32 bits. */
export function gameId(moves: string[], komi = 0): string {
  let h = 0x811c9dc5;
  for (const c of komiPrefix(komi) + moves.join(" ")) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0;
  return `review-${moves.length}-${h.toString(16).padStart(8, "0")}`;
}

/** Keeps a game's record in this browser's store, and makes it the game in review. Answers its id, which covers the
 *  record's komi. Throws a RecordError when the record cannot be read, and an Error for a record from a set-up start,
 *  which the review does not take (setUpProblem). */
export async function keepGame(text: string): Promise<string> {
  const record = parseRecord(text), problem = setUpProblem(record, SITE_NAME);
  if (problem) throw new Error(problem);
  const id = gameId(record.moves, record.komi);
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
