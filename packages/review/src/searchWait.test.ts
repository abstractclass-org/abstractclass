import { test } from "node:test";
import assert from "node:assert/strict";
import { noSearchReason, unlabeledText } from "./searchWait.ts";

const on = { snapshot: false, off: false, error: "" };

test("a search can run with the engine on, its network loaded or loading", () => {
  assert.equal(noSearchReason(on), null);
  assert.equal(unlabeledText(noSearchReason(on)), "Evaluating…");
});

test("with the engine off, the move says why and what to do", () => {
  const text = unlabeledText(noSearchReason({ ...on, off: true }));
  assert.equal(text, "Not analyzed yet. The engine is off. Turn it on to evaluate this move.");
  assert.doesNotMatch(text, /Evaluating/);
});

test("an engine error and a review snapshot run no search", () => {
  assert.equal(unlabeledText(noSearchReason({ ...on, error: "x" })), "Not analyzed yet. The engine has an error.");
  assert.equal(unlabeledText(noSearchReason({ ...on, snapshot: true })), "Not analyzed yet. A review snapshot does no searches.");
});

test("a snapshot says so before the engine's switch, which it shows off", () => {
  assert.equal(noSearchReason({ snapshot: true, off: true, error: "" }), "A review snapshot does no searches.");
});
