import { test } from "node:test";
import assert from "node:assert/strict";
import { botName, endResult, NETWORKS } from "./stampduty.ts";

// The bot's name on Practice: the network's release name, which already names StampDuty, and the engine's name with
// the network's id for a network that has no release name.
test("the bot's name is its network's release name, or StampDuty with the network's id", () => {
  assert.deepEqual(NETWORKS.map(n => n.name), ["StampDuty 0.2"]);
  assert.equal(botName({ network: NETWORKS[0].id, visits: 64, variety: "low" }), "StampDuty 0.2, 64 visits, Low variety");
  assert.equal(botName({ network: "b6c96-s22323968-d845223", visits: 1, variety: "low" }),
               "StampDuty (b6c96-s22323968-d845223), 1 visit, Low variety");
});

// The kept result takes the scores by the one rule for a draw at every komi, not the rules' own result at komi 0.
test("the kept result takes the rule for a draw at every komi", () => {
  assert.deepEqual([endResult({ scores: [10.0000004, 10] }, 0), endResult({ scores: [400, 1130] }, -730)], ["0", "0"]);
});
