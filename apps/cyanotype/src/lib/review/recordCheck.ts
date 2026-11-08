// A record's check by the engine's rules (design 33, item 11), before the import page or the Analysis board opens it,
// and before the player's games keep it (game/import.ts): a set-up start (its `Position` tag) must be a position that a
// game can reach (the engine's position check, protocol 0.8.0), the engine plays each move of the record
// (describe_game) from its start, in the engine's form, and each capture mark must be what its move did
// (checkCaptures). The review checks its game so too, from its analysis's moves. The board editor and a start alone
// (a link, a file, the Import) take the start's check (startChecked).
import { EngineError, EngineWorker, loadManifest } from "@abstractclass/engine/client.ts";
import { errorText } from "@abstractclass/engine/errors.ts";
import { checkProblem, positionQuery, type PositionCheck } from "@abstractclass/engine/protocol.ts";
import type { DescribeReply, GamePosition, HexReason } from "#lib/board/described.ts";
import { PLAYER_NAMES } from "#lib/board/position.ts";
import { checkCaptures, type Checked } from "#lib/game/check.ts";
import { enginePosition, setUpStart } from "#lib/game/position.ts";
import type { GameRecord } from "#lib/game/record.ts";
import { blueprints } from "./blueprints.ts";

/** Every position of a game from its start: the engine's describe_game on the moves, one more position than moves.
 *  `start` is a set-up start in the notation (position.ts), or none for the standard start. */
export type DescribeGame = (moves: string[], start?: string) => Promise<GamePosition[]>;
/** Whether a game can reach a set-up start in the notation: describe's check (protocol 0.8.0). It throws the engine's
 *  refusal of a start that it cannot read. */
export type CheckStart = (start: string) => Promise<PositionCheck<HexReason>>;
/** The engine's rules that the checks use: a page's rules worker, its pool's (pool.rules), or a test's engine. */
export interface Rules { describeGame: DescribeGame; checkStart: CheckStart }
/** The rules of an engine's rules worker. */
export const rulesBy = (rules: Pick<EngineWorker, "describeGame" | "describe">): Rules => ({
  describeGame: async (moves, start) =>
    (await rules.describeGame<GamePosition>(positionQuery(start ? enginePosition(start) : null, moves))).reply.positions,
  checkStart: async start =>
    (await rules.describe<DescribeReply>({ position: enginePosition(start), moves: [] })).reply.check
      ?? { possible: true, reasons: [] },
});

/** An engine's refusal as a page shows it: the engine's words without the name of the query's field, and the players'
 *  names for its numbers ("player 0's blueprints" are Blue's). */
export function engineProblem(e: unknown): string {
  const text = e instanceof EngineError ? e.error : errorText(e);
  return text.replace(/\bplayer ([01])(?='s|\b)/g, (_, p: string) => PLAYER_NAMES[Number(p)]);
}

/** A record by the engine's rules: what is wrong with it, or null (a start that the engine refuses or that no game
 *  reaches, a move that the engine refuses, or a capture mark that the move does not confirm), and each move's capture
 *  mark, from what the engine's rules say that it did. No marks when the engine refuses the start or a move. */
export async function recordChecked(rules: Rules, record: GameRecord): Promise<Checked> {
  try {
    const start = setUpStart(record.tags.Position);
    const unreached = start ? checkProblem(await rules.checkStart(start)) : null;
    if (unreached) return { problem: unreached, captures: [] };
    const ps = await rules.describeGame(record.moves, start);
    const did = record.moves.map((m, i) => blueprints.played(m, ps[i], ps[i + 1]).did);
    return checkCaptures(record, did.map(d => ({ captured: Object.keys(d.captured).length, points: d.points })));
  } catch (e) {
    return { problem: engineProblem(e), captures: [] };
  }
}

/** What is wrong with a record by the engine's rules, or null (recordChecked). */
export const recordProblem = async (rules: Rules, record: GameRecord): Promise<string | null> =>
  (await recordChecked(rules, record)).problem;

/** A set-up start by the engine's rules, as the board editor shows it: the engine's refusal when it cannot read the
 *  start (the hands, the frames, the board's size), else null and its check, whether a game can reach it, with the
 *  hexes of each reason. */
export async function startChecked(rules: Rules, start: string):
  Promise<{ refused: string; check: null } | { refused: null; check: PositionCheck<HexReason> }> {
  try {
    return { refused: null, check: await rules.checkStart(start) };
  } catch (e) {
    return { refused: engineProblem(e), check: null };
  }
}

/** What is wrong with a set-up start by the engine's rules, or null: the engine reads it, and a game can reach it. */
export async function startProblem(rules: Rules, start: string): Promise<string | null> {
  const { refused, check } = await startChecked(rules, start);
  return refused ?? checkProblem(check);
}

/** A check in a rules worker of its own, which ends after it, for a page with no engine pool (the import page, the
 *  Analysis board's Import, the import of a game into the player's games), as Hedge School's checkMoves starts one.
 *  `failed` gives the check's answer for what is wrong when the check cannot run. A site with no engine files cannot
 *  check, so it refuses, where Hedge School's checkMoves lets its review check the game later. */
async function inOwnWorker<T>(check: (rules: Rules) => Promise<T>, failed: (problem: string) => T): Promise<T> {
  let rules: EngineWorker | null = null;
  try {
    const manifest = await loadManifest();
    if (!manifest) return failed("this site has no engine files");
    rules = new EngineWorker();
    await rules.init(manifest);
    return await check(rulesBy(rules));
  } catch (e) {
    return failed(errorText(e));
  } finally {
    rules?.terminate();
  }
}

/** A record's check (recordProblem) in a rules worker of its own. */
export const checkRecord = (record: GameRecord): Promise<string | null> =>
  inOwnWorker(r => recordProblem(r, record), problem => problem);
/** A record's check with each move's capture mark (recordChecked), in a rules worker of its own: the player's games
 *  keep the record with its marks (game/import.ts). */
export const checkRecordMarks = (record: GameRecord): Promise<Checked> =>
  inOwnWorker(r => recordChecked(r, record), problem => ({ problem, captures: [] }));
/** A set-up start's check (startProblem) in a rules worker of its own. */
export const checkStart = (start: string): Promise<string | null> =>
  inOwnWorker(r => startProblem(r, start), problem => problem);
