import { test } from "node:test";
import assert from "node:assert/strict";
import { botName, endResult, NETWORKS } from "./stampduty.ts";

// The bot's name on Practice: the network's release name, which already names Stamp Duty, and the engine's name with
// the network's id for a network that has no release name.
test("the bot's name is its network's release name, or Stamp Duty with the network's id", () => {
  assert.deepEqual(NETWORKS.map(n => n.name), ["Stamp Duty 0.2"]);
  assert.equal(botName({ network: NETWORKS[0].id, visits: 64, variety: "low" }), "Stamp Duty 0.2, 64 visits, Low variety");
  assert.equal(botName({ network: "b6c96-s22323968-d845223", visits: 1, variety: "low" }),
               "Stamp Duty (b6c96-s22323968-d845223), 1 visit, Low variety");
});

// The result that the game keeps at its end comes from the scores by the one rule for a draw, at komi 0 too: the
// rules' own result does not take that rule. Blueprints' points are whole, so the two agree on a real game
// (stampduty.engine.test.ts).
test("the kept result takes the rule for a draw at every komi", () => {
  assert.deepEqual([endResult({ scores: [400, 1130] }, 0), endResult({ scores: [400, 1130] }, -730)], ["r+730", "0"]);
  assert.deepEqual([endResult({ scores: [10.0000004, 10] }, 0), endResult({ scores: [10, 10.03] }, 0)], ["0", "r+0.03"]);
});
