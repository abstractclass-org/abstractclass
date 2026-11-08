// The annotated record of a reviewed game (design 13), from the review page's own review, or from the browser's store
// alone where no review runs (the Review tab): the engine's rules give the positions, the stored results give the
// values, and nothing is searched (@abstractclass/analysis/storedReview.ts). Both write the same record.
import { annotatedFromStore as fromStore } from "@abstractclass/analysis/storedReview.ts";
import { LABEL_VISITS } from "@abstractclass/analysis/cache.ts";
import { loadEngine, networkName, settingsFor } from "#lib/analysis/engineSettings.ts";
import type { Manifest } from "@abstractclass/engine/client.ts";
import { EARLY_ACCESS, SITE_NAME } from "#lib/edition.ts";
import { playerNames, type GameRecord } from "#lib/game/record.ts";
import { loadGame } from "#lib/game/store.ts";
import { siteBook } from "#lib/book/place.svelte.ts";
import { annotatedRecord } from "./annotate.ts";
import { loadDisplay } from "./display.ts";
import { openStored } from "./storedReview.ts";
import { enclosure, review, type BranchNode, type Review, type Unit } from "./enclosure.ts";

/** The annotated record of a review. Its note names the network and the least visits of the game's searches: the
 *  results' own, not the review depth set now, which may differ from the depth the results were searched to. */
export function annotatedText(R: Review, unit: Unit, record: GameRecord, branches: Record<string, BranchNode>, network: string) {
  const visits = R.data.analysis.slice(0, R.data.moves.length).flatMap(a => (a ? [a.visits] : []));
  const depth = visits.length ? `, at least ${Math.min(...visits)} visits a position` : "";
  return annotatedRecord({
    R, unit, tags: record.tags, result: record.result, clocks: record.clocks, branches,
    note: `Reviewed by ${SITE_NAME} with ${networkName(network)} (the network ${network})${depth}.`, annotator: SITE_NAME,
  });
}

/** The annotated record of a stored game, from the stored results of the network and the review depth that the game
 *  reviews with (settingsFor), with the labels by turn or by edge as the review shows them. Loads the engine's rules,
 *  not its network (@abstractclass/analysis/storedReview.ts, annotatedFromStore). */
export async function annotatedFromStore(id: string, manifest: Manifest | null): Promise<string> {
  const stored = await loadGame(id);
  if (!stored) throw new Error(`This browser has no game ${id}.`);
  if (!manifest) throw new Error("this site has no engine");
  const { network, visits } = settingsFor(stored.game, loadEngine()), record = stored.record;
  return fromStore({
    game: enclosure, id, moves: record.moves, komi: record.komi,
    // The book's values, as the review takes them (the stages did not search those positions), and the stored results.
    // Where the review takes no book (at a komi, design 24), the export makes none: siteBook() starts to load its
    // index.
    open: async (g, v, search, model) =>
      ((await openStored(g, v, search, model, EARLY_ACCESS && g.takesBook ? siteBook() : null)) ? null : g.error),
  }, manifest, network, visits, playerNames(record.tags), (data, branches) =>
    annotatedText(review(data, "lead", LABEL_VISITS), loadDisplay().judge, record, branches, network));
}
