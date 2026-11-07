import { test } from "node:test";
import assert from "node:assert/strict";
import { checkMinPlayouts } from "./practice-check.ts";

// Replies of kata-get-params as the practice modules give them (release engine-d6786eba: `= {"...":...}`).
const reply = (minPlayoutsPerThread: unknown) =>
  `= ${JSON.stringify({ maxVisits: 256, minPlayoutsPerThread, numSearchThreads: 1 })}`;

test("a practice module with minPlayoutsPerThread 8 passes", () => {
  assert.equal(checkMinPlayouts("engine-x-bot", reply(8)), 8);
});

test("another minPlayoutsPerThread stops the check, with design 24, item 14 and the value", () => {
  assert.throws(() => checkMinPlayouts("engine-x-bot-batched", reply(4)),
    (e: Error) => /engine-x-bot-batched/.test(e.message) && /minPlayoutsPerThread 4\b/.test(e.message)
      && /design 24, item 14/.test(e.message));
});

test("a reply without the setting, or a refusal, stops the check", () => {
  assert.throws(() => checkMinPlayouts("m", `= ${JSON.stringify({ maxVisits: 256 })}`), /minPlayoutsPerThread/);
  assert.throws(() => checkMinPlayouts("m", "? no session: send enclosure-start SEED first"), /no session/);
});
