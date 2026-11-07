// Checks how the engine step reads a practice module's kata-get-params (practice-check.ts): minPlayoutsPerThread 8
// passes, and another value, a reply without it or a refusal stops the step. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkMinPlayoutsPerThread, noEvaluator } from "./practice-check.ts";

// Replies of kata-get-params as the practice modules give them (release engine-d6786eba: `= {"...":...}`).
const reply = (minPlayoutsPerThread: unknown) =>
  `= ${JSON.stringify({ maxVisits: 256, minPlayoutsPerThread, numSearchThreads: 1 })}`;

test("a practice module with minPlayoutsPerThread 8 passes", () => {
  assert.doesNotThrow(() => checkMinPlayoutsPerThread(reply(8)));
});

test("another minPlayoutsPerThread stops the check, with design 24, item 14 and the value", () => {
  assert.throws(() => checkMinPlayoutsPerThread(reply(4)),
    (e: Error) => /minPlayoutsPerThread 4\b/.test(e.message) && /design 24, item 14/.test(e.message));
});

test("a reply without the setting, or a refusal, stops the check", () => {
  assert.throws(() => checkMinPlayoutsPerThread(`= ${JSON.stringify({ maxVisits: 256 })}`),
    /minPlayoutsPerThread undefined/);
  assert.throws(() => checkMinPlayoutsPerThread("? no session: send enclosure-start SEED first"),
    /kata-get-params gave \? no session/);
});

test("the check's evaluator gives the manifest's sizes, and refuses any other use", () => {
  const sizes = { board: 67, policyChannels: 6 };
  assert.deepEqual((noEvaluator(sizes) as { sizes?: unknown }).sizes, sizes);
  assert.equal((noEvaluator() as { sizes?: unknown }).sizes, undefined); // Enclosure's: the library's default
  assert.throws(() => (noEvaluator(sizes) as { evaluate?: unknown }).evaluate, /evaluates no position.*evaluate/);
});
