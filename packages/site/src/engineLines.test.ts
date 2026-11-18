// Checks the page's lines for an engine that failed (engineLines.ts). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { engineLine, unreadLine } from "./engineLines.ts";

test("an engine's failure says what failed, then what the player can do, with the site's name for its engine", () => {
  assert.equal(engineLine("unstarted"), "The engine did not start. Load the page again.");
  assert.equal(engineLine("error"), "The engine has an error. Load the page again.");
  assert.equal(engineLine("unstarted", "Stamp Duty"), "Stamp Duty did not start. Load the page again.");
  assert.equal(engineLine("error", "Stamp Duty"), "Stamp Duty has an error. Load the page again.");
});

test("a game that the engine did not read: the rules' reason when they refused it, else the engine's error line", () => {
  const refused = { refused: true, error: "the move 3 is not legal" };
  assert.equal(unreadLine(refused, "game"), "The engine could not read this game: the move 3 is not legal");
  assert.equal(unreadLine(refused, "board", "Stamp Duty"), "The engine could not read this board: the move 3 is not legal");
  const failed = { refused: false, error: "RuntimeError: unreachable" };
  assert.equal(unreadLine(failed, "game"), "The engine has an error. Load the page again.");
  assert.equal(unreadLine(failed, "board", "Stamp Duty"), "Stamp Duty has an error. Load the page again.");
});
