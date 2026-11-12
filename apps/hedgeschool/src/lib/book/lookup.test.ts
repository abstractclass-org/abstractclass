// Checks the book's state at a position as the pages read it (lookup.svelte.ts) on the hand-made cases of the test
// book: loading, in the book, out of it, and the part that does not load or lacks a position, with "Try again". And the
// book once its index loads, which the review takes its values from (reviewBook.ts, giveBook). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import "@abstractclass/analysis/testing/svelteModules.ts";
import type { BookReader } from "./book.ts";
import type { BookPart } from "./form.ts";
import { CASES, readJson } from "./testing/testBook.ts";

const { OpeningBook } = await import("./lookup.svelte.ts");
const START = "A10-D10 Q10-T10 b1 0/0 0";
const settle = () => new Promise(r => setTimeout(r, 0));

/** The cases' files, and a file that does not exist fails as a fetch would. `down`: every file fails. */
function files(log: string[], down = { on: false }): BookReader {
  return async url => {
    log.push(url);
    if (down.on) throw new Error("offline");
    return readJson(url);
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
  const index = readJson(CASES);
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

test("a part that lacks a position of the index fails until Try again, which reads the part again", async () => {
  const index = readJson(CASES), PART = "/test-book/cases/1.json";
  const position: string = index.parts.find((p: { file: string }) => p.file === "1.json").positions[1];
  let reads = 0; // the reads of the part: only the first lacks the position
  const read: BookReader = async url => {
    const file = readJson(url) as BookPart;
    if (url !== PART) return file;
    reads++;
    return reads > 1 ? file : { ...file, positions: file.positions.filter(p => p.position !== position) };
  };
  const book = new OpeningBook(CASES, read);
  await book.opened();
  assert.equal(book.at(position).state, "loading");
  await settle(); await settle();
  const failed = book.at(position);
  assert.equal(failed.state, "failed");
  assert.equal(failed.state === "failed" && failed.error.url, PART);
  assert.equal(book.at(position).state, "failed", "the position fails until Try again");
  await settle();
  assert.equal(reads, 1, "without Try again, a later lookup of the position reads the part no more");
  book.retry();
  assert.equal(book.book?.peek(position), undefined, "the part counts as not loaded");
  assert.equal(book.at(position).state, "loading");
  await settle(); await settle();
  const found = book.at(position);
  assert.equal(found.state === "in" && found.position.position, position, "Try again reads the part again");
  assert.equal(reads, 2);
});

test("the book once its index loads, for the review's values, and null when the index does not load", async () => {
  const book = new OpeningBook(CASES, files([]));
  assert.equal((await book.opened())?.start, START);
  const down = new OpeningBook(CASES, files([], { on: true }));
  assert.equal(await down.opened(), null);
});
