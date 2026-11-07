// Checks the book's values in the review (reviewBook.ts, giveBook) at a komi (design 24): the book's values are the
// engine's at komi 0, so a review at another komi takes none, and no part of the book loads for it. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { GameAnalysis } from "@abstractclass/analysis/analysis.svelte.ts";
import type { Enclosure } from "#lib/review/enclosure.ts";
import type { OpeningBook } from "./lookup.svelte.ts";
import { giveBook } from "./reviewBook.ts";

/** A review with its rules ready at `komi`, which counts the book's values that it takes. */
const review = (komi: number) => {
  const taken: unknown[] = [];
  const g = { komi, rulesReady: true, positions: [], useBook: (results: unknown[]) => void taken.push(results) };
  return { g: g as unknown as GameAnalysis<Enclosure>, taken };
};
/** A book that counts the reviews that open it. */
const book = () => {
  const asked: number[] = [];
  return { asked, book: { opened: async () => (asked.push(1), null) } as unknown as OpeningBook };
};

test("a review at a komi takes no values from the book, and does not open it", async () => {
  const atKomi = review(-300), b = book();
  await giveBook(atKomi.g, b.book);
  assert.deepEqual([atKomi.taken.length, b.asked.length], [0, 0]);
  // At komi 0 the review opens the book: this one has no index, so the review takes no values.
  const even = review(0);
  await giveBook(even.g, b.book);
  assert.deepEqual([even.taken.length, b.asked.length], [0, 1]);
});
