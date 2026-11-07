import { test } from "node:test";
import assert from "node:assert/strict";
import { sizesOption } from "./library.ts";

// The evaluators' options for a manifest: its networks' sizes where it gives them (Blueprints' release), else none, so
// that the engine's library keeps its default, Enclosure's, and Hedge School's evaluators start as before.
test("the evaluators take the manifest's sizes, and no option from a manifest without them", () => {
  assert.deepEqual(sizesOption({}), {});
  assert.deepEqual(sizesOption({ sizes: { board: 67, policyChannels: 6 } }), { sizes: { board: 67, policyChannels: 6 } });
});
