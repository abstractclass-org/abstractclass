// A review from the browser's store alone, with no search: the engine's rules give the positions, the book gives its
// values, and the stored results give the rest. The annotated record of a stored game (exportText.ts) and the label
// snapshot (labels.snapshot.test.ts) take these steps here (openStored), in one order, so that their quality labels are
// the same. The review page's review snapshot (design 20) takes the first steps here too (startWithBook): it finds the
// earlier review's search once the book has given its values, then reads its stored results.
import type { GameAnalysis } from "@abstractclass/analysis/analysis.svelte.ts";
import type { OpeningBook } from "#lib/book/lookup.svelte.ts";
import { giveBook } from "#lib/book/reviewBook.ts";
import type { Enclosure } from "./enclosure.ts";

/** Starts the review of `g`'s game at the review depth `visits`: the rules (GameAnalysis.start), then the book's
 *  values (giveBook). False when the rules refuse the game (`g.error` says why): the book then gives nothing. */
export async function startWithBook(g: GameAnalysis<Enclosure>, visits: number, book: OpeningBook | null) {
  g.setReview(visits);
  await g.start();
  if (!g.rulesReady) return false;
  await giveBook(g, book);
  return true;
}

/** Opens the review of `g`'s game from the store: startWithBook, then the stored results of the search `search` with
 *  the network `model` (GameAnalysis.fromStore). The book comes first: the stored results that the review reads (the
 *  Greats' confirmations) follow the book's values. False, with no results read, when the rules refuse the game. */
export async function openStored(g: GameAnalysis<Enclosure>, visits: number, search: string, model: string,
                                 book: OpeningBook | null) {
  if (!(await startWithBook(g, visits, book))) return false;
  await g.fromStore(search, model);
  return true;
}
