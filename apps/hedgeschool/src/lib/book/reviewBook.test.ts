// Checks the book's values in the review (reviewBook.ts, giveBook) at a komi (design 24): the book's values are the
// engine's at komi 0, so a review at another komi takes none, and no part of the book loads for it. Run: npm test.
import { mock, test } from "node:test";
import assert from "node:assert/strict";
import type { GameAnalysis } from "@abstractclass/analysis/analysis.svelte.ts";
import type { Enclosure } from "#lib/review/enclosure.ts";
import type { OpeningBook } from "./lookup.svelte.ts";
import { giveBook } from "./reviewBook.ts";

/** A review at `komi`: giveBook reads whether it takes the book (GameAnalysis.takesBook) before anything else. */
const review = (komi: number) => ({ takesBook: !komi }) as unknown as GameAnalysis<Enclosure>;

test("a review at a komi does not open the book, and a review at komi 0 does", async () => {
  // A book with no index: a review that opens it takes no values from it.
  const opened = mock.fn(async () => null), book = { opened } as unknown as OpeningBook;
  await giveBook(review(-300), book);
  assert.equal(opened.mock.callCount(), 0);
  await giveBook(review(0), book);
  assert.equal(opened.mock.callCount(), 1);
});
