// Checks the import's events (importEvents.ts): their names and parameters, sent to the site's analytics, with a game's
// length as the site's range. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { importEvents } from "./importEvents.ts";

test("imports and loads go to the site's analytics, with the game's length as the site's range", () => {
  const sent: [string, Record<string, unknown>][] = [];
  const events = importEvents<"pasted_words" | "words_bookmarklet">({
    track: (name, params) => sent.push([name, params]),
    range: moves => (moves < 10 ? "1-9" : "10+"),
  });
  events.trackImport("review", "words_bookmarklet", 12);
  events.trackImportFailed("analysis", "pasted_words", "record");
  events.trackLoad("review_file", 3, { with_results: true });
  events.trackLoadFailed("analysis_share_link", "link");
  assert.deepEqual(sent, [
    ["import_game", { import_to: "review", import_source: "words_bookmarklet", edges: "10+" }],
    ["import_failed", { import_to: "analysis", import_source: "pasted_words", import_failure: "record" }],
    ["load_saved", { load_source: "review_file", edges: "1-9", with_results: true }],
    ["load_failed", { load_source: "analysis_share_link", load_failure: "link" }],
  ]);
});
