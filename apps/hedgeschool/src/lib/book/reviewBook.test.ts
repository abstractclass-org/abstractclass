// Checks the book's values in the review (reviewBook.ts, giveBook): at a komi (design 24), the book's values are the
// engine's at komi 0, so a review at another komi takes none, and no part of the book loads for it. And a part that
// does not answer in the time limit (book.ts, BOOK_TIME_LIMIT), or a part of another form: the review's lookup then
// gives no values there, so the review searches the position, the game's other positions keep theirs, and a later
// lookup asks again. Run: npm test.
import { mock, test } from "node:test";
import assert from "node:assert/strict";
import "@abstractclass/analysis/testing/svelteModules.ts";
import type { GameAnalysis } from "@abstractclass/analysis/analysis.svelte.ts";
import type { Analysis } from "@abstractclass/analysis/model.ts";
import type { Enclosure } from "#lib/review/enclosure.ts";
import { BOOK_TIME_LIMIT, BookLoadError, type BookReader } from "./book.ts";
import { BOOK_VERSION, type BookIndex } from "./form.ts";
import { giveBook } from "./reviewBook.ts";
import { TEST_BOOK, readJson } from "./testing/testBook.ts";

const { OpeningBook } = await import("./lookup.svelte.ts");
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

test("a part of another form gives the review no values there, the game's other positions keep theirs, and the table "
     + "reads the part again", async () => {
  // The game's start is in the start's part. Its second position is in part 1, whose first two reads give a part of
  // another form: the table's, then the review's.
  const index = readJson(TEST_BOOK) as BookIndex, part = index.parts[1], other = part.positions[0];
  const url = TEST_BOOK.replace("index.json", part.file);
  let reads = 0;
  const read: BookReader = async u => {
    const file = readJson(u);
    return u === url && reads++ < 2 ? { ...file, version: BOOK_VERSION + 1 } : file;
  };
  const book = new OpeningBook(TEST_BOOK, read);
  await book.opened();
  assert.equal(book.at(other).state, "loading");
  await settle();
  const failed = book.at(other);
  assert.ok(failed.state === "failed" && failed.error instanceof BookLoadError && failed.error.url === url,
            "the table: the part's file did not load");

  type Values = Analysis<string> | undefined;
  const useBook = mock.fn((_results: Values[], _lookup: (p: { notation: string }) => Promise<Values>) => {});
  const g = { takesBook: true, rulesReady: true, positions: [{ notation: index.start }, { notation: other }], useBook };
  await giveBook(g as unknown as GameAnalysis<Enclosure>, book);
  assert.equal(useBook.mock.callCount(), 1, "the review takes the book's values");
  const [results, lookup] = useBook.mock.calls[0].arguments;
  assert.deepEqual(results.map(a => a?.book), [true, undefined],
                   "the start keeps the book's values, and the review searches the other position");

  book.retry(); // "Try again"
  assert.equal(book.at(other).state, "loading");
  await settle();
  assert.equal(book.at(other).state, "in", "the third read gives the book's form");
  assert.equal(reads, 3);
  assert.equal((await lookup({ notation: other }))?.book, true);
});
