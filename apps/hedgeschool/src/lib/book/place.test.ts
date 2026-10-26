// Checks the book where the review and the Analysis board show it (place.svelte.ts, design 32, items 3 and 8) on the
// hand-made cases of the test book: the choice that each page keeps apart, and the table outside the book and back.
// Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import "@abstractclass/analysis/testing/svelteModules.ts";
import type { BookReader } from "./book.ts";

const { OpeningBook } = await import("./lookup.svelte.ts");
const { BookPlace, keptChoice, keepChoice } = await import("./place.svelte.ts");
const { SvelteMap } = await import("svelte/reactivity"); // a reactive cell for the path, as a page's $derived is
const root = fileURLToPath(new URL("../../..", import.meta.url));
const CASES = "/test-book/cases/index.json", START = "A10-D10 Q10-T10 b1 0/0 0";
const OUTSIDE = "A10-D10,D10-T19* Q10-T10 r2 0/0 1"; // not in the cases' book
const settle = async () => { for (let k = 0; k < 4; k++) await new Promise(r => setTimeout(r, 0)); };
const read: BookReader = async url => JSON.parse(readFileSync(join(root, "tests", "fixtures", url), "utf8"));

// The browser's storage, for the kept choices
const kept = new Map<string, string>();
Object.assign(globalThis, { localStorage: {
  getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => void kept.set(k, v),
  removeItem: (k: string) => void kept.delete(k),
} });

test("the book is off by default, and each page keeps its own choice", () => {
  kept.clear();
  assert.deepEqual(keptChoice("review"), { show: "candidates" });
  keepChoice("board", { show: "book" });
  assert.deepEqual(keptChoice("board"), { show: "book" });
  assert.deepEqual(keptChoice("review"), { show: "candidates" }, "the review keeps its own");
  kept.set("hedge-school:book-table:review:1", '{"show":"all"}');
  assert.deepEqual(keptChoice("review"), { show: "candidates" }, "a value that is not a choice");
});

test("outside the book the table shows the candidates, and the choice of Book comes back at a book position", async () => {
  kept.clear();
  const cell = new SvelteMap([["path", [START]]]);
  const book = new OpeningBook(CASES, read);
  const place = new BookPlace(book, "review", () => cell.get("path")!);
  assert.equal(place.ready, false, "the index still loads");
  await settle();
  assert.equal(place.ready, true);
  assert.equal(place.at.state, "in");
  assert.equal(place.inBook, true);
  assert.equal(place.showsBook, false, "off by default");
  place.toggle();
  assert.equal(place.show, "book");
  assert.equal(place.showsBook, true);
  assert.ok(place.rows.length > 0);
  assert.equal(keptChoice("review").show, "book", "the browser keeps the choice");

  cell.set("path", [START, OUTSIDE]);
  assert.equal(place.at.state, "out");
  assert.equal(place.inBook, false, "the page shows its candidates alone");
  assert.equal(place.showsBook, false, "Candidates outside the book");
  assert.deepEqual(place.rows, []);
  place.toggle();
  assert.equal(place.show, "book", "the key o does nothing outside the book: Book is unavailable");

  cell.set("path", [START]);
  assert.equal(place.showsBook, true, "the choice of Book comes back");
});

test("a position with no notation is outside the book", async () => {
  const place = new BookPlace(new OpeningBook(CASES, read), "board", () => [START, undefined]);
  await settle();
  assert.equal(place.at.state, "out");
  assert.equal(place.inBook, false);
});
