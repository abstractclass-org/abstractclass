// Checks why a stored review runs again (reviewAgainWhy): only for the site's own change of engine or network file. And
// when a new mark frees the results of an earlier one (replacesAnother), and what a game's mark keeps (markReviewed).
// Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { gameId, markReviewed, replacesAnother, reviewAgainWhy, type ReviewMark, type StoredGame } from "./store.ts";
import { STORES, dbGet } from "#lib/storage/db.ts";
import { memoryDb } from "#lib/storage/memoryDb.ts";

const db = memoryDb();

const mark: ReviewMark = { module: "m1", model: "n1", network: "lite", visits: 512, at: "2026-10-12" };
const want = (change: Partial<ReviewMark>) => {
  const w = { module: "m1", model: "n1", network: "lite", visits: 512, ...change };
  return { ...w, modules: w.module === "m1" ? ["m1", "m0"] : [w.module] }; // m0: an earlier module of m1's search
};

test("a review runs again for a new engine or a new network file, and says so", () => {
  assert.equal(reviewAgainWhy(mark, want({ module: "m2" })), "engine");
  assert.equal(reviewAgainWhy({ ...mark, module: "m0" }, want({})), null); // an earlier module of the same search
  assert.equal(reviewAgainWhy(mark, want({ model: "n2" })), "network");
  assert.equal(reviewAgainWhy(mark, want({ module: "m2", model: "n2" })), "engine");
});

test("the player's own changes, and a game never reviewed, give no reason to tell", () => {
  assert.equal(reviewAgainWhy(mark, want({ network: "standard", model: "n9" })), null); // another network chosen
  assert.equal(reviewAgainWhy(mark, want({ visits: 1024 })), null); // a deeper review chosen
  assert.equal(reviewAgainWhy(undefined, want({})), null);
  assert.equal(reviewAgainWhy(mark, null), null);
});

test("a game's id: its moves alone from the standard start, as before, and its set-up start with them", async () => {
  const moves = ["D10-G10", "N9-Q10"];
  assert.equal(await gameId(moves), await gameId(moves, undefined));
  assert.notEqual(await gameId(moves, "A10-D10 Q10-T10 b2 0/0 3"), await gameId(moves));
  assert.match(await gameId(moves), /^[0-9a-f]{12}$/);
});

test("a new mark frees an earlier review's results when it replaces a mark of another module or network file", () => {
  assert.equal(replacesAnother(undefined, mark), false); // a first review frees nothing
  assert.equal(replacesAnother(mark, { ...mark, visits: 1024 }), false); // deeper, with the same files
  assert.equal(replacesAnother(mark, { ...mark, module: "m2" }), true);
  assert.equal(replacesAnother(mark, { ...mark, model: "n2" }), true);
});

test("a finished review's mark names its search, and so does a mark kept before that covers the review", async () => {
  const game = (id: string, reviewed?: ReviewMark): StoredGame => ({ version: 1, id, record: "", added: "", reviewed });
  const markOf = async (id: string) => (await dbGet<StoredGame>(STORES.games, id))?.reviewed;
  const done = { module: "m1", model: "n1", network: "lite", visits: 512, search: "s1", modules: ["m1", "m0"] };
  db.rows(STORES.games).set("new", game("new"));
  await markReviewed("new", done);
  assert.equal((await markOf("new"))?.search, "s1");
  // A deeper mark of an earlier module of the same search stays, with the search it lacked.
  db.rows(STORES.games).set("kept", game("kept", { ...mark, module: "m0", visits: 1024 }));
  await markReviewed("kept", done);
  assert.deepEqual(await markOf("kept"), { ...mark, module: "m0", visits: 1024, search: "s1" });
});
