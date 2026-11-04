import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hasEngine, nodeEngine } from "@abstractclass/engine/node-engine.mjs";
import type { GamePosition } from "../board/described.ts";
import { parseRecord } from "../game/record.ts";
import { recordProblem, type DescribeGame } from "./recordCheck.ts";

// A record's check by the engine's rules (recordCheck.ts), which the import page and the Analysis board make before
// they open a record: on the review's test game (fixtures/stamp-duty.txt, Stamp Duty against itself), on that game
// with a wrong capture mark, and on a move that the rules refuse. The engine runs on the CPU in Node from the site's
// static/engine: CI has no engine files, so this is skipped there.
const app = join(import.meta.dirname, "..", "..", "..");
const text = readFileSync(join(import.meta.dirname, "fixtures", "stamp-duty.txt"), "utf8");

test("the engine's rules confirm a record, or say what is wrong with it", {
  skip: hasEngine(app) ? false : "no engine in static/engine (npm run engine)",
}, async () => {
  const { call } = await nodeEngine(app);
  // As the worker answers: an error reply refuses (channel.ts)
  const describe: DescribeGame = async moves => {
    const reply = call({ id: "g", action: "describe_game", moves });
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
});
