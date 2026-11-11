// Checks the book's values in the review (reviewBook.ts, giveBook): at a komi (design 24), the book's values are the
// engine's at komi 0, so a review at another komi takes none, and no part of the book loads for it. And a part that
// does not answer in the time limit (book.ts, BOOK_TIME_LIMIT): the review's lookup then gives no values, so the
// review searches the position, and a later lookup asks again. Run: npm test.
import { mock, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import "@abstractclass/analysis/testing/svelteModules.ts";
import type { GameAnalysis } from "@abstractclass/analysis/analysis.svelte.ts";
import type { Analysis } from "@abstractclass/analysis/model.ts";
import type { Enclosure } from "#lib/review/enclosure.ts";
import { BOOK_TIME_LIMIT, type BookReader } from "./book.ts";
import type { BookIndex } from "./form.ts";
import { giveBook } from "./reviewBook.ts";

const { OpeningBook } = await import("./lookup.svelte.ts");
const root = fileURLToPath(new URL("../../..", import.meta.url));
const TEST_BOOK = "/test-book/prototype/index.json";
const readJson = (url: string) => JSON.parse(readFileSync(join(root, "tests", "fixtures", url), "utf8"));
/** Lets the promises in flight settle, with setTimeout mocked. */
const settle = async () => { for (let k = 0; k < 20; k++) await new Promise(r => setImmediate(r)); };

/** A review at `komi`: giveBook reads whether it takes the book (GameAnalysis.takesBook) before anything else. */
const review = (komi: number) => ({ takesBook: !komi }) as unknown as GameAnalysis<Enclosure>;

test("a review at a komi does not open the book, and a review at komi 0 does", async () => {
  // A book with no index: a review that opens it takes no values from it.
  const opened = mock.fn(async () => null), book = { opened } as unknown as InstanceType<typeof OpeningBook>;
  await giveBook(review(-300), book);
  assert.equal(opened.mock.callCount(), 0);
  await giveBook(review(0), book);
  assert.equal(opened.mock.callCount(), 1);
});

test("a part that does not answer in the time limit gives the review no values, and a later lookup asks again", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  // The game's start is in the start's part, which answers. A variation's position is in part 1, which never answers
  // to its first request.
  const index = readJson(TEST_BOOK) as BookIndex, part = index.parts[1], variation = part.positions[0];
  let stalls = 1;
  const read: BookReader = async url =>
    (url.endsWith(`/${part.file}`) && stalls-- > 0 ? new Promise(() => {}) : readJson(url));
  const book = new OpeningBook(TEST_BOOK, read);
  // The review as giveBook reads it: GameAnalysis.useBook takes the values of the game's positions, and the lookup
  // of the variations' positions
  type Values = Analysis<string> | undefined;
  const useBook = mock.fn((_results: Values[], _lookup: (p: { notation: string }) => Promise<Values>) => {});
  const g = { takesBook: true, rulesReady: true, positions: [{ notation: index.start }], useBook };
  await giveBook(g as unknown as GameAnalysis<Enclosure>, book);
  const [results, lookup] = useBook.mock.calls[0].arguments;
  assert.equal(results[0]?.book, true, "the game's start takes the book's values");

  let answer: Values | "waiting" = "waiting";
  void lookup({ notation: variation }).then(a => (answer = a));
  await settle();
  assert.equal(answer, "waiting", "the evaluation waits for the book's answer");
  t.mock.timers.tick(BOOK_TIME_LIMIT - 1);
  await settle();
  assert.equal(answer, "waiting");
  t.mock.timers.tick(1);
  await settle();
  assert.equal(answer, undefined, "no values: the review searches the position (GameAnalysis.askBook)");
  assert.equal(book.at(variation).state, "loading", "the table asks again, as nothing failed there before");
  await settle();
  assert.equal(book.at(variation).state, "in", "the second request answers");
  assert.equal((await lookup({ notation: variation }))?.book, true,
               "a part that answers in time gives the book's values");
});
