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
  const place = new BookPlace(book, "review", () => cell.get("path")!, () => "edge");
  assert.equal(place.ready, false, "the index still loads");
  await settle();
  assert.equal(place.ready, true);
  assert.equal(place.at.state, "in");
  assert.equal(place.showsBook, false, "off by default");
  place.toggle();
  assert.equal(place.show, "book");
  assert.equal(place.showsBook, true);
  assert.ok(place.rows.length > 0);
  assert.equal(keptChoice("review").show, "book", "the browser keeps the choice");

  cell.set("path", [START, OUTSIDE]);
  assert.equal(place.at.state, "out");
  assert.equal(place.showsBook, false, "Candidates outside the book");
  assert.deepEqual(place.rows, []);
  place.toggle();
  assert.equal(place.show, "book", "the key o does nothing outside the book: Book is unavailable");

  cell.set("path", [START]);
  assert.equal(place.showsBook, true, "the choice of Book comes back");
});

test("a position with no notation is outside the book", async () => {
  const place = new BookPlace(new OpeningBook(CASES, read), "board", () => [START, undefined], () => "edge");
  await settle();
  assert.equal(place.at.state, "out");
});

test("by turn: whole turns at a turn's start once its positions load, single edges by edge and elsewhere", async () => {
  kept.clear();
  keepChoice("review", { show: "book" });
  const PROTOTYPE = "/test-book/prototype/index.json", AFTER_G9 = "A10-D10,D10-G9* Q10-T10 r2 0/0 1";
  const cell = new SvelteMap<string, unknown>([["path", [START, AFTER_G9]], ["unit", "turn"]]);
  const place = new BookPlace(new OpeningBook(PROTOTYPE, read), "review", () => cell.get("path") as string[],
                              () => cell.get("unit") as "turn" | "edge");
  for (let k = 0; k < 4 && !(place.at.state === "in" && place.byTurn); k++) await settle();
  assert.equal(place.at.state, "in");
  assert.equal(place.byTurn, true);
  assert.ok(place.rows.filter(r => r.book).every(r => r.edges.length === 2));
  // The board: each first edge's number, and a click on it plays its row's two edges
  const first = place.rows[0];
  place.point(first.edges[0]);
  assert.equal(place.pointed, first.move);
  assert.equal(place.numbered, first.edges[0]);
  assert.deepEqual(place.movesAt(first.edges[0]), first.edges);
  // "Review by" edge: the rows are single edges, with no new load
  cell.set("unit", "edge");
  assert.equal(place.byTurn, false);
  assert.ok(place.rows.every(r => r.edges.length === 1));
  // The start: its turn has one edge, so its rows stay single edges by turn too
  cell.set("unit", "turn");
  cell.set("path", [START]);
  assert.equal(place.byTurn, false);
});

test("by turn: the best 8 book turns, and the rest after Show more at this position only", async () => {
  // Turn 2 after Blue's A10-D9: 19 whole turns, as N11-Q10 O11-Q10 and O11-Q10 N11-Q10 are one
  const PROTOTYPE = "/test-book/prototype/index.json", AFTER_D9 = "A10-D9*,A10-D10 Q10-T10 r2 0/0 1";
  const cell = new SvelteMap<string, unknown>([["path", [START, AFTER_D9]]]);
  const place = new BookPlace(new OpeningBook(PROTOTYPE, read), "review", () => cell.get("path") as string[], () => "turn");
  for (let k = 0; k < 4 && !(place.at.state === "in" && place.byTurn); k++) await settle();
  const plain = place.rows.filter(r => r.group === "fine" || r.group === "other");
  assert.equal(plain.length, 19);
  assert.equal(place.shown.filter(r => r.group === "fine" || r.group === "other").length, 8);
  assert.ok(place.numbers.length <= place.shown.length);
  place.more = true;
  assert.equal(place.shown.length, place.rows.length);
  cell.set("path", [START]);
  assert.equal(place.more, false, "the next position shows the best turns only again");
});
