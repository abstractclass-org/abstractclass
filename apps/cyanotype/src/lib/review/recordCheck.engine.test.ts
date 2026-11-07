import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hasEngine, nodeEngine } from "@abstractclass/engine/node-engine.mjs";
import { sitePosition, type GamePosition } from "../board/described.ts";
import { enginePosition, writePosition } from "../game/position.ts";
import { parseRecord, writeRecord } from "../game/record.ts";
import { turnFromCount } from "@abstractclass/analysis/turns.ts";
import { EngineError } from "@abstractclass/engine/client.ts";
import { engineProblem, recordProblem, type DescribeGame } from "./recordCheck.ts";

// A record's check by the engine's rules (recordCheck.ts), which the import page and the Analysis board make before
// they open a record: on the review's test game (fixtures/stamp-duty.txt, Stamp Duty against itself), on that game
// with a wrong capture mark, on a move that the rules refuse, and on the game's later moves from a set-up start (its
// position after 40 moves), and that start without a cell. The engine runs on the CPU in Node from the site's
// static/engine: without its files, this is skipped.
const app = join(import.meta.dirname, "..", "..", "..");
const text = readFileSync(join(import.meta.dirname, "fixtures", "stamp-duty.txt"), "utf8");

test("the engine's rules confirm a record, or say what is wrong with it", {
  skip: hasEngine(app) ? false : "no engine in static/engine (npm run engine)",
}, async () => {
  const { call } = await nodeEngine(app);
  // As the worker answers: an error reply refuses (channel.ts)
  const describe: DescribeGame = async (moves, start) => {
    const reply = call({ id: "g", action: "describe_game", moves, ...(start ? { position: enginePosition(start) } : {}) });
    if (reply.error) throw new Error(reply.error);
    return reply.positions as GamePosition[];
  };
  assert.equal(await recordProblem(describe, parseRecord(text)), null);
  // The first three turns, with an x on 2@1,-5, which captures nothing
  const marked = parseRecord("1. 1:-1,1>2:0,-1 2. 1:-1,1>2:-2,1 1:0,2>2:0,3 3. 1:0,2>2:2,2 2@1,-5x *");
  assert.equal(await recordProblem(describe, marked), "Move 5 (2@1,-5x) has the mark x, but the move captures no opponent cells.");
  // A placement on Blue's own cells: the rules refuse it, and the problem is the engine's
  const illegal = await recordProblem(describe, parseRecord("1. 1@0,0 *"));
  assert.ok(illegal && !illegal.startsWith("Move "), `the engine's refusal: ${illegal}`);

  // The same game from a set-up start: its position after 40 moves, then the rest of its moves with their marks, as
  // the record numbers them from the start (a pasted position and moves on the Analysis board).
  const record = parseRecord(text), k = 40;
  const at = (await describe(record.moves.slice(0, k)))[k];
  const start = writePosition(sitePosition(at));
  const withMarks = record.moves.map((m, i) => `${m}${record.marked[i] ? (record.marked[i]!.points ? `x+${record.marked[i]!.points}` : "x") : ""}`);
  const turns: { number: number; moves: number; second?: boolean }[] = [];
  for (let c = k; c < record.moves.length; c++) {
    const { turn, first } = turnFromCount(c);
    if (first || c === k) turns.push({ number: turn, moves: 0, ...(first ? {} : { second: true }) });
    turns[turns.length - 1].moves++;
  }
  const fromStart = writeRecord({ Position: start }, withMarks.slice(k), turns);
  assert.equal(await recordProblem(describe, parseRecord(fromStart)), null);
  // A start that the engine refuses: Blue's blueprint 3 without its last cell, a hand of 20 cells.
  const fields = start.split(" ");
  fields[2] = fields[2].replace(/;[^;|]+$/, "");
  const refused = await recordProblem(describe, parseRecord(`[Position "${fields.join(" ")}"]\n\n${withMarks[k]}`));
  assert.match(refused ?? "", /hold 20 cells, not 21/);
});

test("an engine's refusal shows its words, with the players' names and no field's name", () => {
  const refusal = new EngineError({ id: "d", error: "player 1's blueprints hold 20 cells, not 21", field: "position" });
  assert.equal(refusal.message, "player 1's blueprints hold 20 cells, not 21 (position)");
  assert.equal(engineProblem(refusal), "Red's blueprints hold 20 cells, not 21");
  assert.equal(engineProblem(new Error("blueprint 2 of player 0 is not connected")), "blueprint 2 of Blue is not connected");
});
