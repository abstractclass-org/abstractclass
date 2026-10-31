import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hasEngine, nodeEngine } from "@abstractclass/engine/node-engine.mjs";
import { checkCaptures } from "../game/check.ts";
import { parseRecord } from "../game/record.ts";
import { blueprints, endingText, playedText, type ReviewData } from "./blueprints.ts";

// Blueprints' game (blueprints.ts) on the review's test game, a game of Stamp Duty against itself
// (fixtures/stamp-duty.txt, scripts/selfplay.mjs), through the engine's describe_game, the request that the review's
// analysis sends: each move with what it did, and the record's capture marks confirmed by it. The engine runs on the
// CPU in Node from the site's static/engine: CI has no engine files, so this is skipped there.
const app = join(import.meta.dirname, "..", "..", "..");
const text = readFileSync(join(import.meta.dirname, "fixtures", "stamp-duty.txt"), "utf8");

test("the review's game reads each move of a game of Stamp Duty from the engine", {
  skip: hasEngine(app) ? false : "no engine in static/engine (npm run engine)",
}, async () => {
  const { call } = await nodeEngine(app);
  const record = parseRecord(text);
  const fields = call({ id: "g", action: "describe_game", moves: record.moves }).positions;
  assert.equal(fields.length, record.moves.length + 1);
  const positions = fields.map(blueprints.position);
  const played = record.moves.map((m, i) => blueprints.played(m, fields[i], fields[i + 1]));
  // Every capture mark of the record is the engine's: the record writes each move as the move list does.
  const effects = played.map(p => ({ captured: Object.keys(p.did.captured).length, points: p.did.points }));
  assert.equal(checkCaptures(record, effects).problem, null);
  const words = text.slice(text.indexOf("\n\n")).split(/\s+/).filter(w => w && !/^\d+\.$/.test(w)).slice(0, -1);
  assert.deepEqual(played.map(playedText), words);
  // The players alternate as Enclosure's turns: one move, then two a turn.
  played.forEach((p, i) => assert.equal(p.player, positions[i].player, `move ${i + 1}`));
  // The game ends at its 120th move, with the record's result.
  assert.equal(positions.at(-1)!.over, true);
  const [blue, red] = positions.at(-1)!.scores;
  const data = { players: { blue: "Blue", red: "Red" }, result: { blue, red }, moves: played, positions, analysis: [] } as unknown as ReviewData;
  const margin = Math.abs(blue - red).toLocaleString("en");
  assert.equal(endingText(data), `${blue > red ? "Blue" : "Red"} won by ${margin}`);
  assert.equal(record.result, `${blue > red ? "b" : "r"}+${Math.abs(blue - red)}`);
});
