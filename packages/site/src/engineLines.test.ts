// Checks the page's lines for an engine that failed (engineLines.ts). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { engineLine } from "./engineLines.ts";

test("an engine's failure says what failed, then what the player can do, with the site's name for its engine", () => {
  assert.equal(engineLine("unstarted"), "The engine did not start. Load the page again.");
  assert.equal(engineLine("error"), "The engine has an error. Load the page again.");
  assert.equal(engineLine("unstarted", "Stamp Duty"), "Stamp Duty did not start. Load the page again.");
  assert.equal(engineLine("error", "Stamp Duty"), "Stamp Duty has an error. Load the page again.");
});
