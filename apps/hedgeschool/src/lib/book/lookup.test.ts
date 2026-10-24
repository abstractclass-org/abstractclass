// Checks the book's state at a position as the pages read it (lookup.svelte.ts) on the hand-made cases of the test
// book: loading, in the book, out of it, and the part that does not load, with "Try again". Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import "@abstractclass/analysis/testing/svelteModules.ts";
import type { BookReader } from "./book.ts";

const { OpeningBook } = await import("./lookup.svelte.ts");
const root = fileURLToPath(new URL("../../..", import.meta.url));
const CASES = "/test-book/cases/index.json", START = "A10-D10 Q10-T10 b1 0/0 0";
const settle = () => new Promise(r => setTimeout(r, 0));

/** The cases' files, and a file that does not exist fails as a fetch would. `down`: every file fails. */
function files(log: string[], down = { on: false }): BookReader {
  return async url => {
    log.push(url);
    if (down.on) throw new Error("offline");
    return JSON.parse(readFileSync(join(root, "tests", "fixtures", url), "utf8"));
  };
}

test("a position loads, then is in the book; a position that the book does not hold is out at once", async () => {
  const log: string[] = [], book = new OpeningBook(CASES, files(log));
  assert.equal(book.at(START).state, "loading");
  await settle(); await settle();
  const start = book.at(START);
  assert.equal(start.state, "in");
  assert.equal(start.state === "in" && start.position.position, START);
  assert.equal(book.source?.name !== undefined, true);
  assert.equal(book.at("A10-D10,D10-T19* Q10-T10 r2 0/0 1").state, "out");
});

test("a part that does not load fails until Try again, and the index's failure too", async () => {
  const index = JSON.parse(readFileSync(join(root, "tests/fixtures", CASES), "utf8"));
  const missing = index.parts.find((p: { file: string }) => p.file === "2.json").positions[0];
  const log: string[] = [], down = { on: true }, book = new OpeningBook(CASES, files(log, down));
  await settle();
  assert.equal(book.at(START).state, "failed", "the index did not load");
  down.on = false;
  book.retry();
  await settle(); await settle();
  assert.equal(book.at(START).state, "in");
  assert.equal(book.at(missing).state, "loading");
  await settle(); await settle();
  assert.equal(book.at(missing).state, "failed");
  const tries = log.filter(u => u.endsWith("/2.json")).length;
  book.retry();
  assert.equal(book.at(missing).state, "loading");
  await settle(); await settle();
  assert.equal(book.at(missing).state, "failed");
  assert.equal(log.filter(u => u.endsWith("/2.json")).length, tries + 1, "Try again loads the part again");
});
