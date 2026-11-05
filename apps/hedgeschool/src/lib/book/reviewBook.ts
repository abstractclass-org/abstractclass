// The book's values in the review (design 32, "A book position's values"): the site's book gives a review the values
// of its game's positions and of its variations' positions that the book holds (results.ts), in the early edition,
// where the site has a book.
import type { GameAnalysis } from "@abstractclass/analysis/analysis.svelte.ts";
import type { Enclosure } from "#lib/review/enclosure.ts";
import type { OpeningBook } from "./lookup.svelte.ts";
import { bookValues } from "./results.ts";

/** Gives a review the book's values of its game's positions (GameAnalysis.useBook): once the book's index and the
 *  game's parts load, the review judges the positions that the book holds by the book's values, and its stages do not
 *  search them. It gives the book's lookup too, for the variations' positions, which "Evaluate quality" then does not
 *  search where the book holds them. Where the index does not load, or the book's values fail, it gives none, and the
 *  review searches every position: it never fails. Call once the analysis has started (GameAnalysis.start): its
 *  positions give the notation. `book`: the site's book in the early edition (place.svelte.ts, siteBook), the test
 *  book in a test, or none. */
export async function giveBook(g: GameAnalysis<Enclosure>, book: OpeningBook | null): Promise<void> {
  try {
    const opened = book && (await book.opened());
    if (!opened || !g.rulesReady) return;
    const values = bookValues(opened), lookup = (p: Enclosure["position"]) => values(p.notation);
    g.useBook(await Promise.all(g.positions.map(lookup)), lookup);
  } catch { /* no values: the review searches those positions */ }
}
