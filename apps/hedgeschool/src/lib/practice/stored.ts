// A practice game as the site stores it (design 25): the stored game and its check are the practice's
// (@abstractclass/practice/stored.ts). Hedge School's part is Enclosure's: an edge's form, and a record's edges, which
// the server keeps beside the game (functions/api/practice-games.ts). This module and the shared one have no imports
// but types and each other, so that the server's bundle takes them alone.
import { recordMoves, storedProblem as gameProblem, type StoredRules } from "@abstractclass/practice/stored.ts";

export { MAX_KOMI, type StoredPractice } from "@abstractclass/practice/stored.ts";

/** The edges of a record's main line, passes included: its moves, without its tags, comments and variations. */
export const recordEdges = (record: string): number =>
  recordMoves(record, /\b[A-T]\d{1,2}-[A-T]\d{1,2}x?(?![\w-])|\bpass\b/g);

/** Enclosure's part of the check: an edge, as the bot and the rules name it, and a record's edges. */
export const ENCLOSURE: StoredRules = { move: /^[A-T][0-9]{1,2}-[A-T][0-9]{1,2}$/, recordMoves: recordEdges };

/** Why a sent game is not one that the site keeps, or null when it is. */
export const storedProblem = (x: unknown): string | null => gameProblem(x, ENCLOSURE);
