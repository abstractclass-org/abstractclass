// The book's values in the review (design 32, "A book position's values"): the site's book gives a review the values
// of its game's positions that the book holds (results.ts), in the early edition, where the site has a book.
import type { GameAnalysis } from "@abstractclass/analysis/analysis.svelte.ts";
import { EARLY_ACCESS } from "#lib/edition.ts";
import type { Enclosure } from "#lib/review/enclosure.ts";
import { siteBook } from "./place.svelte.ts";
import { bookResults } from "./results.ts";

/** Gives a review the book's values of its game's positions (GameAnalysis.useBook): once the book's index and the
 *  game's parts load, the review judges the positions that the book holds by the book's values, and its stages do not
 *  search them. Where the index does not load, or the book's values fail, it gives none, and the review searches every
 *  position: it never fails. Call once the analysis has started (GameAnalysis.start): its positions give the notation. */
export async function giveBook(g: GameAnalysis<Enclosure>): Promise<void> {
  try {
    const book = EARLY_ACCESS ? siteBook() : null, opened = book && (await book.opened());
    if (opened && g.rulesReady) g.useBook(await bookResults(opened, g.positions.map(p => p.notation)));
  } catch { /* no values: the review searches those positions */ }
}
