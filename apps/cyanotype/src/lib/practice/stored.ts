// A practice game against Stamp Duty as the site stores it (design 33, "Practice against Stamp Duty"; Hedge School's
// design 25): the stored game and its check are the practice's (@abstractclass/practice/stored.ts). Cyanotype's part is
// Blueprints': a move's form as the bot and the rules name it (game/notation.ts), and a record's moves, which the
// server keeps beside the game (functions/api/practice-games.ts). This module and the shared one have no imports but
// types and each other, so that the server's bundle takes them alone: the notation's own reader is not among them.
import { recordMoves, storedProblem as gameProblem, type StoredRules } from "@abstractclass/practice/stored.ts";

export { MAX_KOMI, type StoredPractice } from "@abstractclass/practice/stored.ts";

const N = "-?\\d{1,3}";
/** A move's name: a placement `K@q,r`, or an edit `I:q,r>J:q,r` (game/notation.ts). */
const MOVE = `[1-3](?:@${N},${N}|:${N},${N}>[1-3]:${N},${N})`;

/** The moves of a record's main line, passes included, each with its capture mark: without its tags, comments and
 *  variations. A turn's number (`2.`) is not a move. */
export const recordBlueprintsMoves = (record: string): number =>
  recordMoves(record, new RegExp(`(?<![\\w@:>,+-])${MOVE}(?:x(?:\\+\\d+)?)?(?![\\w@:>,])|\\bpass\\b`, "g"));

/** Blueprints' part of the check: a move's name, and a record's moves. */
export const BLUEPRINTS: StoredRules = { move: new RegExp(`^${MOVE}$`), recordMoves: recordBlueprintsMoves };

/** Why a sent game is not one that the site keeps, or null when it is. */
export const storedProblem = (x: unknown): string | null => gameProblem(x, BLUEPRINTS);
