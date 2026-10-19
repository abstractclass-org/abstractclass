// Checks which engine protocols the site takes (speaksProtocol): 0.6.1, which brings describe_game, or a later 0.6.x.
// Before 1.0 a breaking change takes the next minor version, and a compatible one the next patch (the engine
// repository's design 04, "Versioning"). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { speaksProtocol } from "./protocol.ts";

test("the site takes 0.6.1 and every later 0.6.x", () => {
  for (const v of ["0.6.1", "0.6.2", "0.6.10"]) assert.equal(speaksProtocol(v), true, v);
});

test("the site refuses another minor version, and 0.6.0, which has no describe_game", () => {
  for (const v of ["0.5", "0.6", "0.6.0", "0.7", "0.7.1", "1.0", "0.60", "0.6.1.1", "0.6.x", ""]) assert.equal(speaksProtocol(v), false, v);
});
