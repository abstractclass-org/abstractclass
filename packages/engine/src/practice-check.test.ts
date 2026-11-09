// Checks how the engine step reads a practice module's kata-get-params (practice-check.ts): minPlayoutsPerThread 8
// passes, and another value, a reply without it or a refusal stops the step. A module's komi cap must be the site's
// MAX_RECORD_KOMI. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkKomiCap, checkMinPlayoutsPerThread, noEvaluator } from "./practice-check.ts";

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

// GTP's komi as KataGo's gtp.cpp answers it: `=` within the cap, `? unacceptable komi` past it.
const gtpKomi = (cap: number) => async (value: number) => (Math.abs(value) <= cap ? "= " : "? unacceptable komi");

test("a module whose komi cap is the site's MAX_RECORD_KOMI passes", async () => {
  await assert.doesNotReject(checkKomiCap(5052, gtpKomi(5052)));
  await assert.doesNotReject(checkKomiCap(90_980, gtpKomi(90_980)));
});

test("a module whose komi cap moved stops the check, with the komi and what to change", async () => {
  // A smaller cap: the module refuses the site's limit
  await assert.rejects(checkKomiCap(5052, gtpKomi(5000)),
    (e: Error) => /refuses komi 5052\b.*MAX_RECORD_KOMI 5052 .*unacceptable komi/.test(e.message) &&
      /Rules::MAX_USER_KOMI/.test(e.message));
  // A larger cap: the module takes half a point past it
  await assert.rejects(checkKomiCap(5052, gtpKomi(6000)), /takes komi 5052\.5, past the site's MAX_RECORD_KOMI 5052/);
  // A module that takes any komi, as GTP's standard says: the check cannot pass
  await assert.rejects(checkKomiCap(5052, async () => "="), /takes komi 5052\.5/);
  // Another refusal past the limit says nothing about the cap
  const unknown = async (value: number) => (Math.abs(value) <= 5052 ? "= " : "? unknown command");
  await assert.rejects(checkKomiCap(5052, unknown), /gives \? unknown command for komi 5052\.5, not KataGo's refusal/);
});

test("the check asks each komi in turn: the limit either way, then half a point past it", async () => {
  const asked: number[] = [];
  await checkKomiCap(5052, async v => { asked.push(v); return gtpKomi(5052)(v); });
  assert.deepEqual(asked, [5052, -5052, 5052.5, -5052.5]);
});
