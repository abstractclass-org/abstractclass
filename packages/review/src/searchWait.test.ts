import { test } from "node:test";
import assert from "node:assert/strict";
import { noSearchReason, unlabeledText } from "./searchWait.ts";

const on = { snapshot: false, paused: false, error: "" };

// The network's state is no input: a search can run while it loads, as it starts once the network is loaded.
test("a search can run with the engine on, no error and no snapshot", () => {
  assert.equal(noSearchReason(on), null);
  assert.equal(unlabeledText(noSearchReason(on)), "Evaluating…");
});

test("with the engine off, the move says why and what to do", () => {
  assert.equal(unlabeledText(noSearchReason({ ...on, paused: true })),
               "Not analyzed yet. The engine is off. To evaluate this move, set the engine switch to on.");
});

test("an engine error and a review snapshot run no search", () => {
  assert.equal(unlabeledText(noSearchReason({ ...on, error: "x" })), "Not analyzed yet. The engine has an error.");
  assert.equal(unlabeledText(noSearchReason({ ...on, snapshot: true })),
               "Not analyzed yet. A review snapshot does no searches.");
});

test("a review snapshot gives its own reason, also with the engine paused", () => {
  assert.equal(noSearchReason({ snapshot: true, paused: true, error: "" }), "A review snapshot does no searches.");
});
