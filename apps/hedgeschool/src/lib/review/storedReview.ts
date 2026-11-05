// A review from the browser's store alone, with no search: the engine's rules give the positions, the book gives its
// values, and the stored results give the rest. The review page's review snapshot (design 20), the annotated record of a
// stored game (exportText.ts) and the label snapshot (labels.snapshot.test.ts) take these steps here, in one order, so
// that their quality labels are the same.
import type { GameAnalysis } from "@abstractclass/analysis/analysis.svelte.ts";
import { giveBook, type ReviewBook } from "#lib/book/reviewBook.ts";
import type { Enclosure } from "./enclosure.ts";

/** Opens the review of `g`'s game at the review depth `visits` from the store: the rules (GameAnalysis.start), then
 *  the book's values (giveBook, with `book` where it is given), then the stored results of a search with the network
 *  `model` (GameAnalysis.fromStore). `search` is the search, or gives it once the book has given its values: the review
 *  snapshot needs the stored results of the positions that the book does not hold. Answers the search whose results it
 *  read. Undefined, with no results read, when the rules refuse the game (`g.error` says why) or there is no search. */
export async function openStored(g: GameAnalysis<Enclosure>, visits: number, model: string,
                                 search: string | (() => Promise<string | undefined>),
                                 book?: ReviewBook | null): Promise<string | undefined> {
  g.setReview(visits);
  await g.start();
  if (!g.rulesReady) return undefined;
  await giveBook(g, book);
  const found = typeof search === "string" ? search : await search();
  if (found) await g.fromStore(found, model);
  return found;
}
