// Checks Practice's pure parts (practice.ts): the takeback's reach, the results, the GTP answers, the bot's commands,
// and the record, read back by the record's reader. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { NETWORKS } from "#lib/analysis/engineSettings.ts";
import { parseRecord } from "#lib/game/record.ts";
import { botCommands, gtpAnswer, practiceEndParams, practiceOutcome, practiceParams, practiceRecord, resignResult, scoreResult, takebackCount,
         type KeptPractice } from "./practice.ts";

test("a takeback undoes the bot's turn after the player's last turn, then that turn", () => {
  // Blue (0) is the player. Blue 1 edge, Red 2, Blue 2, Red 2.
  assert.equal(takebackCount([0, 1, 1, 0, 0, 1, 1], 0), 4);
  assert.equal(takebackCount([0, 1, 1, 0, 0], 0), 2); // the bot has not answered yet
  assert.equal(takebackCount([0, 1, 1, 0], 0), 1); // the player's turn is half played
  assert.equal(takebackCount([0], 0), 1);
  // Red (1) is the player: Blue's first edge is the bot's, and stays.
  assert.equal(takebackCount([0], 1), 0);
  assert.equal(takebackCount([0, 1, 1, 0, 0], 1), 4);
  assert.equal(takebackCount([], 0), 0);
});

test("the result from the scores, as the meaf.us reader writes it", () => {
  assert.equal(scoreResult([60.5, 48]), "b+12.5");
  assert.equal(scoreResult([10, 13]), "r+3");
  assert.equal(scoreResult([7, 7]), "0");
  assert.equal(scoreResult([1183.2292748917748, 1024.404761904762]), "b+158.824513");
  assert.equal(resignResult(0), "r+R"); // the player is Blue and resigns: Red, the bot, wins
  assert.equal(resignResult(1), "b+R");
});

test("a GTP answer gives its text, and an error throws with the bot's message", () => {
  assert.equal(gtpAnswer("= N9-Q10"), "N9-Q10");
  assert.equal(gtpAnswer("="), "");
  assert.throws(() => gtpAnswer("? illegal move in this position: A1-B1"), /illegal move in this position: A1-B1/);
});

test("the bot's commands set the visits and the variety", () => {
  assert.deepEqual(botCommands({ network: NETWORKS[0].id, visits: 64, variety: "low" }), [
    "kata-set-param maxVisits 64", "kata-set-param chosenMoveTemperatureEarly 0.5", "kata-set-param chosenMoveTemperature 0.1",
    "kata-set-param chosenMoveTemperatureHalflife 19",
  ]);
});

const game = (over: Partial<KeptPractice> = {}): KeptPractice => ({
  version: 1, bot: { network: NETWORKS[0].id, visits: 64, variety: "low" }, human: 0, name: "Ann", seed: 1,
  moves: ["D10-G10", "N9-Q10", "O9-Q10", "G10-K9"], builds: ["54486cd"], started: "2026-10-14T12:00:00Z", ...over,
});

test("the record names both sides and the bot, and reads back with its moves and cut marks", () => {
  const text = practiceRecord(game(), [0, 1, 1, 0], [false, false, true, false], "*");
  const r = parseRecord(text);
  assert.deepEqual(r.moves, ["D10-G10", "N9-Q10", "O9-Q10", "G10-K9"]);
  assert.deepEqual(r.marked, [false, false, true, false]);
  assert.equal(r.tags.Blue, "Ann");
  assert.equal(r.tags.Red, "HedgeFund 0.1 Lite, 64 visits, Low variety");
  assert.equal(r.tags.Event, "Hedge School practice");
  assert.equal(r.tags.Termination, undefined);
  assert.match(r.tags.Bot, /^HedgeFund 0\.1 Lite \(b10c128-s66625408-d13350730\), 64 visits a move, Low variety, engine 54486cd$/);
  assert.equal(r.result, "*");
  assert.match(text, /\n1\. D10-G10 2\. N9-Q10 O9-Q10x 3\. G10-K9 \*\n$/);
});

test("the player's side is \"You\" without a name, and a finished game has its result and termination", () => {
  const text = practiceRecord(game({ human: 1, name: " " }), [0, 1, 1, 0], [false, false, false, false], "b+R", "resignation");
  const r = parseRecord(text);
  assert.equal(r.tags.Red, "You");
  assert.equal(r.tags.Blue, "HedgeFund 0.1 Lite, 64 visits, Low variety");
  assert.equal(r.result, "b+R");
  assert.equal(r.tags.Termination, "resignation");
});

test("the events about a game carry its settings and counts as ranges, never a move or a name (design 17)", () => {
  const k = game({ human: 1, bot: { network: NETWORKS[1].id, visits: 256, variety: "medium" }, takebacks: 3, botTurns: 4, botMs: 9_000 });
  assert.deepEqual(practiceParams(k, "gpu", 16), {
    network: "b15c192", bot_visits: 256, bot_variety: "medium", practice_side: "red", bot_form: "gpu", cores: "9-16",
  });
  const end = practiceEndParams(k, "gpu", 16, "won", 61);
  assert.equal(end.practice_outcome, "won");
  assert.equal(end.edges, "60-89");
  assert.equal(end.practice_takebacks, "2-4");
  assert.equal(end.bot_seconds, "1-2"); // 9 s over 4 turns: 2.25 s a turn
  assert.ok(!JSON.stringify(end).includes("Ann") && !JSON.stringify(end).includes("D10-G10"));
  assert.equal(practiceEndParams(game(), "cpu", 4, "aborted", 1).bot_seconds, "none");
  assert.equal(practiceEndParams(game({ botTurns: 2, botMs: 500 }), "single", 2, "lost", 10).bot_seconds, "0"); // under a second
});

test("a game's outcome is the player's", () => {
  assert.equal(practiceOutcome([60, 50], 0, false), "won");
  assert.equal(practiceOutcome([60, 50], 1, false), "lost");
  assert.equal(practiceOutcome([50.02, 50], 1, false), "draw");
  assert.equal(practiceOutcome([60, 50], 0, true), "resigned");
});
