import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hasEngine, nodeEngine } from "@abstractclass/engine/node-engine.mjs";
import { sitePosition, type DescribeReply, type GamePosition } from "../board/described.ts";
import { hexKey, parseHex, shift, TOUCHING } from "../board/hex.ts";
import { enginePosition, readPosition, STANDARD_START, writePosition } from "../game/position.ts";
import { parseRecord, writeRecord } from "../game/record.ts";
import { turnFromCount } from "@abstractclass/analysis/turns.ts";
import { EngineError } from "@abstractclass/engine/client.ts";
import { engineProblem, recordProblem, startChecked, startProblem, type Rules } from "./recordCheck.ts";

// A record's check by the engine's rules (recordCheck.ts), which the import page and the Analysis board make before
// they open a record: on the review's test game (fixtures/stamp-duty.txt, Stamp Duty against itself), on that game
// with a wrong capture mark, on a move that the rules refuse, and on the game's later moves from a set-up start (its
// position after 40 moves), that start without a cell, and starts that no game reaches (the engine's position check,
// protocol 0.8.0). The engine runs on the CPU in Node from the site's static/engine: without its files, this is
// skipped.
const app = join(import.meta.dirname, "..", "..", "..");
const text = readFileSync(join(import.meta.dirname, "fixtures", "stamp-duty.txt"), "utf8");

test("the engine's rules confirm a record, or say what is wrong with it", {
  skip: hasEngine(app) ? false : "no engine in static/engine (npm run engine)",
}, async () => {
  const rules = await nodeRules();
  const describe = rules.describeGame;
  assert.equal(await recordProblem(rules, parseRecord(text)), null);
  // The first three turns, with an x on 2@1,-5, which captures nothing
  const marked = parseRecord("1. 1:-1,1>2:0,-1 2. 1:-1,1>2:-2,1 1:0,2>2:0,3 3. 1:0,2>2:2,2 2@1,-5x *");
  assert.equal(await recordProblem(rules, marked), "Move 5 (2@1,-5x) has the mark x, but the move captures no opponent cells.");
  // A placement on Blue's own cells: the rules refuse it, and the problem is the engine's
  const illegal = await recordProblem(rules, parseRecord("1. 1@0,0 *"));
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
  assert.equal(await recordProblem(rules, parseRecord(fromStart)), null);
  // A start that the engine refuses: Blue's blueprint 3 without its last cell, a hand of 20 cells.
  const fields = start.split(" ");
  fields[2] = fields[2].replace(/;[^;|]+$/, "");
  const refused = await recordProblem(rules, parseRecord(`[Position "${fields.join(" ")}"]\n\n${withMarks[k]}`));
  assert.match(refused ?? "", /hold 20 cells, not 21/);
  // A Red cell beside a Blue cell that is not a wall: no game reaches the start, so the record's moves are not played
  // (beside one such Blue cell only: two pairs get other words)
  const p = readPosition(start), near = (h: string) => TOUCHING.map(d => hexKey(shift([parseHex(h)], d)[0]));
  const blue = (h: string) => p.cells[h]?.[0] === 0 && p.cells[h][1] !== "wall";
  const beside = Object.keys(p.cells).filter(blue).flatMap(near)
    .find(h => !p.cells[h] && near(h).filter(blue).length === 1)!;
  const touching = writePosition({ ...p, cells: { ...p.cells, [beside]: [1, "plain"] } });
  const unreached = await recordProblem(rules, parseRecord(`[Position "${touching}"]\n\n${withMarks[k]}`));
  assert.match(unreached ?? "", new RegExp(`^This position cannot occur in a game: Blue's cell on \\S+ touches Red's cell on ${beside}`));
});

test("a start alone: the engine's refusal, or whether a game can reach it, with the hexes that each reason names", {
  skip: hasEngine(app) ? false : "no engine in static/engine (npm run engine)",
}, async () => {
  const rules = await nodeRules();
  assert.deepEqual(await startChecked(rules, STANDARD_START), { refused: null, check: { possible: true, reasons: [] } });
  // A cell more at the standard start, with no move played: only the start is a position of 0 moves
  const s = readPosition(STANDARD_START), added = writePosition({ ...s, cells: { ...s.cells, "0,9": [0, "plain"] } });
  const read = await startChecked(rules, added);
  assert.equal(read.refused, null);
  assert.equal(read.check?.possible, false);
  assert.deepEqual(read.check?.reasons.map(r => [r.code, r.hexes]), [["start", ["0,9"]]]);
  assert.equal(await startProblem(rules, added), `This position cannot occur in a game: ${read.check!.reasons[0].text.replace(/\.$/, "")}.`);
  // The same cell after 3 moves: a game can reach it
  assert.equal(await startProblem(rules, writePosition({ ...readPosition(added), ply: 3 })), null);
  // A start that the engine cannot read: its refusal, and no check
  const fields = STANDARD_START.split(" ");
  fields[2] = fields[2].replace(/;[^;|]+$/, "");
  const cut = await startChecked(rules, fields.join(" "));
  assert.equal(cut.check, null);
  assert.match(cut.refused ?? "", /Blue's blueprints hold 20 cells, not 21/);
});

/** The site's rules on the engine in Node, as the rules worker answers: an error reply refuses (channel.ts). */
async function nodeRules(): Promise<Rules> {
  const { call } = await nodeEngine(app);
  const send = (request: object) => {
    const reply = call(request);
    if (reply.error) throw new EngineError(reply);
    return reply;
  };
  return {
    describeGame: async (moves, start) =>
      send({ id: "g", action: "describe_game", moves, ...(start ? { position: enginePosition(start) } : {}) }).positions as GamePosition[],
    checkStart: async start => (send({ id: "d", action: "describe", position: enginePosition(start), moves: [] }) as DescribeReply).check!,
  };
}

test("an engine's refusal shows its words, with the players' names and no field's name", () => {
  const refusal = new EngineError({ id: "d", error: "player 1's blueprints hold 20 cells, not 21", field: "position" });
  assert.equal(refusal.message, "player 1's blueprints hold 20 cells, not 21 (position)");
  assert.equal(engineProblem(refusal), "Red's blueprints hold 20 cells, not 21");
  assert.equal(engineProblem(new Error("blueprint 2 of player 0 is not connected")), "blueprint 2 of Blue is not connected");
});
