// A review from the browser's store alone, with no search: the shared steps (@abstractclass/analysis/storedReview.ts),
// with Hedge School's step after the rules, the book's values. The engine's rules give the positions, the book gives
// its values, and the stored results give the rest. The annotated record of a stored game (exportText.ts) and the label
// snapshot (labels.snapshot.test.ts) take these steps here (openStored), in one order, so that their quality labels are
// the same. The review page's review snapshot (design 20) takes the book's step here too (bookStep): it finds the
// earlier review's search once the book has given its values, then reads its stored results.
import type { GameAnalysis } from "@abstractclass/analysis/analysis.svelte.ts";
import * as shared from "@abstractclass/analysis/storedReview.ts";
import type { OpeningBook } from "#lib/book/lookup.svelte.ts";
import { giveBook } from "#lib/book/reviewBook.ts";
import type { Enclosure } from "./enclosure.ts";

/** The values of `book` (giveBook), as Hedge School's step after the rules: it never refuses the game. */
export const bookStep = (book: OpeningBook | null): shared.StoredStep<Enclosure> => async g => {
  await giveBook(g, book);
  return null;
};

/** Opens the review of `g`'s game from the store at the review depth `visits`: the rules (GameAnalysis.start), the
 *  book's values (giveBook), then the stored results of the search `search` with the network `model`
 *  (GameAnalysis.fromStore). The book comes first: the stored results that the review reads (the Greats'
 *  confirmations) follow the book's values. False, with no results read, when the rules refuse the game (`g.error` says
 *  why). */
export async function openStored(g: GameAnalysis<Enclosure>, visits: number, search: string, model: string,
                                 book: OpeningBook | null) {
  return (await shared.openStored(g, visits, search, model, bookStep(book))) === null;
}
