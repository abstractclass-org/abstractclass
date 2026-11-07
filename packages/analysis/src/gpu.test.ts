// Checks the engine settings' line for the GPU's first-use test (gpuStatusText): while searches run, the line says that
// the test measures the speed. While none runs, the test waits, and the line says that it continues with the next
// searches. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import "./testing/svelteModules.ts";

const { gpuStatusText } = await import("./gpu.svelte.ts");

test("the first-use test's line tells a test that searches from a test that waits for searches", () => {
  assert.equal(gpuStatusText({ state: "testing", searching: true }), "In use. Testing its speed against a worker…");
  assert.equal(gpuStatusText({ state: "testing", searching: false }), "In use. The speed test continues with the next searches.");
});
