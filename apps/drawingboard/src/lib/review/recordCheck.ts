// A record's check by the engine's rules (design 33, item 11), before the import page or the Analysis board opens it:
// the engine plays each move of the record (describe_game), and each capture mark must be what its move did
// (checkCaptures). The review checks its game so too, from its analysis's moves.
import type { EngineWorker } from "@abstractclass/engine/client.ts";
import { errorText } from "@abstractclass/engine/errors.ts";
import { positionQuery } from "@abstractclass/engine/protocol.ts";
import type { GamePosition } from "#lib/board/described.ts";
import { checkCaptures } from "#lib/game/check.ts";
import type { GameRecord } from "#lib/game/record.ts";
import { blueprints } from "./blueprints.ts";

/** Every position of a game from its start: the engine's describe_game on the moves, one more position than moves. */
export type DescribeGame = (moves: string[]) => Promise<GamePosition[]>;
/** describe_game by the engine's rules worker: a page's own, or its pool's (pool.rules). */
export const describeBy = (rules: Pick<EngineWorker, "describeGame">): DescribeGame =>
  async moves => (await rules.describeGame<GamePosition>(positionQuery(null, moves))).reply.positions;

/** What is wrong with a record by the engine's rules, or null: a move that the engine refuses, or a capture mark that
 *  the move does not confirm. */
export async function recordProblem(describeGame: DescribeGame, record: GameRecord): Promise<string | null> {
  try {
    const ps = await describeGame(record.moves);
    const did = record.moves.map((m, i) => blueprints.played(m, ps[i], ps[i + 1]).did);
    return checkCaptures(record, did.map(d => ({ captured: Object.keys(d.captured).length, points: d.points }))).problem;
  } catch (e) {
    return errorText(e);
  }
}
