// A record's check by the engine's rules (design 33, item 11), before the import page or the Analysis board opens it:
// the engine plays each move of the record (describe_game) from its start (its `Position` tag, in the engine's form),
// and each capture mark must be what its move did (checkCaptures). The review checks its game so too, from its
// analysis's moves.
import { EngineError, EngineWorker, loadManifest } from "@abstractclass/engine/client.ts";
import { errorText } from "@abstractclass/engine/errors.ts";
import { positionQuery } from "@abstractclass/engine/protocol.ts";
import type { GamePosition } from "#lib/board/described.ts";
import { PLAYER_NAMES } from "#lib/board/position.ts";
import { checkCaptures } from "#lib/game/check.ts";
import { enginePosition, setUpStart } from "#lib/game/position.ts";
import type { GameRecord } from "#lib/game/record.ts";
import { blueprints } from "./blueprints.ts";

/** Every position of a game from its start: the engine's describe_game on the moves, one more position than moves.
 *  `start` is a set-up start in the notation (position.ts), or none for the standard start. */
export type DescribeGame = (moves: string[], start?: string) => Promise<GamePosition[]>;
/** describe_game by the engine's rules worker: a page's own, or its pool's (pool.rules). */
export const describeBy = (rules: Pick<EngineWorker, "describeGame">): DescribeGame =>
  async (moves, start) =>
    (await rules.describeGame<GamePosition>(positionQuery(start ? enginePosition(start) : null, moves))).reply.positions;

/** An engine's refusal as a page shows it: the engine's words without the name of the query's field, and the players'
 *  names for its numbers ("player 0's blueprints" are Blue's). */
export function engineProblem(e: unknown): string {
  const text = e instanceof EngineError ? e.error : errorText(e);
  return text.replace(/\bplayer ([01])(?='s|\b)/g, (_, p: string) => PLAYER_NAMES[Number(p)]);
}

/** What is wrong with a record by the engine's rules, or null: a start or a move that the engine refuses, or a capture
 *  mark that the move does not confirm. */
export async function recordProblem(describeGame: DescribeGame, record: GameRecord): Promise<string | null> {
  try {
    const ps = await describeGame(record.moves, setUpStart(record.tags.Position));
    const did = record.moves.map((m, i) => blueprints.played(m, ps[i], ps[i + 1]).did);
    return checkCaptures(record, did.map(d => ({ captured: Object.keys(d.captured).length, points: d.points }))).problem;
  } catch (e) {
    return engineProblem(e);
  }
}

/** What is wrong with a set-up start by the engine's rules, or null: the engine reads it (the hands, the frames, the
 *  board's size), as for a record's start. Blueprints' build has no check that a game can reach a position (the engine
 *  repository's games/blueprints/README.md, "The browser build"), so these are all the rules' checks. */
export async function startProblem(describeGame: DescribeGame, start: string): Promise<string | null> {
  try {
    await describeGame([], start);
    return null;
  } catch (e) {
    return engineProblem(e);
  }
}

/** A check in a rules worker of its own, which ends after it, for a page with no engine pool (the import page, the
 *  Analysis board's Import), as Hedge School's checkMoves starts one. A site with no engine files cannot check, so it
 *  refuses, where Hedge School's checkMoves lets its review check the game later. */
async function inOwnWorker(check: (describeGame: DescribeGame) => Promise<string | null>): Promise<string | null> {
  let rules: EngineWorker | null = null;
  try {
    const manifest = await loadManifest();
    if (!manifest) return "this site has no engine files";
    rules = new EngineWorker();
    await rules.init(manifest);
    return await check(describeBy(rules));
  } catch (e) {
    return errorText(e);
  } finally {
    rules?.terminate();
  }
}

/** A record's check (recordProblem) in a rules worker of its own. */
export const checkRecord = (record: GameRecord): Promise<string | null> => inOwnWorker(d => recordProblem(d, record));
/** A set-up start's check (startProblem) in a rules worker of its own. */
export const checkStart = (start: string): Promise<string | null> => inOwnWorker(d => startProblem(d, start));
