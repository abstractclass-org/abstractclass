// Checks which part of an address after its `#` holds a game (addressHash.ts), with a test game's record of words.
// Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { hashParams, holdsGame } from "./addressHash.ts";

test("which part after the `#` holds a game", () => {
  const games = ["#record=1.%20ab", "#packed=AQx", "#from=https%3A%2F%2Fpartner.example", "#tool=bookmarklet&v=1&record=x",
                 "#1.%20ab"];
  for (const hash of games) assert.equal(holdsGame(hash), true, hash);
  for (const hash of ["", "#", "#game=abc", "#at=4", "#game=abc&at=2"]) assert.equal(holdsGame(hash), false, hash);
});

test("a bare record has no parameters, even when it holds a name and \"=\"", () => {
  assert.equal(hashParams(encodeURIComponent('[Event "a=b"]\n\n1. ab *')), null);
  assert.deepEqual([...hashParams("game=abc&at=2")!.keys()], ["game", "at"]);
});
