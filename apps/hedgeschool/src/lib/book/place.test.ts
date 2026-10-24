// Checks the book where the review and the Analysis board show it (place.svelte.ts, design 32, items 3 and 8) on the
// hand-made cases of the test book: the choice that each page keeps apart, the table outside the book and back, and
// the last book position on the path. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import "@abstractclass/analysis/testing/svelteModules.ts";
import type { BookReader } from "./book.ts";

const { OpeningBook } = await import("./lookup.svelte.ts");
const { BookPlace, keptChoice, keepChoice, lastInBook } = await import("./place.svelte.ts");
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
  assert.deepEqual(keptChoice("review"), { show: "candidates", values: false });
  keepChoice("board", { show: "book", values: true });
  assert.deepEqual(keptChoice("board"), { show: "book", values: true });
  assert.deepEqual(keptChoice("review"), { show: "candidates", values: false }, "the review keeps its own");
  kept.set("hedge-school:book-table:review:1", '{"show":"all","values":"yes"}');
  assert.deepEqual(keptChoice("review"), { show: "candidates", values: false }, "a value that is not a choice");
});

test("the last book position on a path: a position that the index lists, also while its part loads", () => {
  assert.equal(lastInBook(["in", "in", "out", "out"]), 1);
  assert.equal(lastInBook(["in", "out", "loading", "out"]), 2, "a line that comes back into the book");
  assert.equal(lastInBook(["in", "failed", "out"]), 1, "a part that did not load is still in the index");
  assert.equal(lastInBook(["out", "out"]), -1);
});

test("outside the book the table shows the candidates, and the choice of Book comes back at a book position", async () => {
  kept.clear();
  const cell = new SvelteMap([["path", [START]]]);
  const book = new OpeningBook(CASES, read);
  const place = new BookPlace(book, "review", () => cell.get("path")!, () => null);
  assert.equal(place.ready, false, "the index still loads");
  await settle();
  assert.equal(place.ready, true);
  assert.equal(place.at.state, "in");
  assert.equal(place.shows, false, "off by default");
  place.toggle();
  assert.equal(place.show, "book");
  assert.equal(place.shows, true);
  assert.ok(place.rows.length > 0);
  assert.deepEqual(keptChoice("review").show, "book", "the browser keeps the choice");

  cell.set("path", [START, OUTSIDE]);
  assert.equal(place.at.state, "out");
  assert.equal(place.shows, false, "Candidates outside the book");
  assert.deepEqual(place.rows, []);
  assert.equal(place.last, 0, "the start is the last book position");
  place.toggle();
  assert.equal(place.show, "book", "the key o does nothing outside the book: Book is unavailable");

  cell.set("path", [START]);
  assert.equal(place.shows, true, "the choice of Book comes back");
  assert.equal(place.last, 0, "in the book, the position on screen");
});

test("a position with no notation is outside the book, and a path with no book position has none", async () => {
  const place = new BookPlace(new OpeningBook(CASES, read), "board", () => [undefined, OUTSIDE], () => null);
  await settle();
  assert.equal(place.at.state, "out");
  assert.equal(place.last, -1);
});

test("the game's move at the position comes into the rows", async () => {
  const place = new BookPlace(new OpeningBook(CASES, read), "review", () => [START],
                              () => ({ move: "D10-G13", label: "good", blueWin: 0.5 }));
  await settle();
  const own = place.rows.find(r => r.game);
  assert.equal(own?.move, "D10-G13");
});
