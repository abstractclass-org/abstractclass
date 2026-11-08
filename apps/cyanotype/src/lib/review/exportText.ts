// The annotated record of a reviewed game (Hedge School's design 13, design 33), from the review page's own review, or
// from the browser's store alone where no review runs (the Review tab): the engine's rules give the positions, the
// record's capture marks are checked against them, the stored results give the values, and nothing is searched
// (@abstractclass/analysis/storedReview.ts). Both write the same record, as Hedge School's exportText.ts does.
import { annotatedFromStore as fromStore } from "@abstractclass/analysis/storedReview.ts";
import { LABEL_VISITS } from "@abstractclass/analysis/cache.ts";
import { review, type Review, type Unit } from "@abstractclass/analysis/model.ts";
import type { Manifest } from "@abstractclass/engine/client.ts";
import { loadEngine, networkName, settingsFor } from "../analysis/engineSettings.ts";
import { playerNames, type GameRecord } from "../game/record.ts";
import { loadGame } from "../game/store.ts";
import { SITE_NAME } from "../site.ts";
import { annotatedRecord, type AnnotateInput } from "./annotate.ts";
import { blueprints, type Blueprints } from "./blueprints.ts";
import { loadDisplay } from "./display.ts";
import { openStored } from "./storedReview.ts";

/** The annotated record of a review. Its note names the network and the least visits of the game's searches: the
 *  results' own, not the review depth set now, which may differ from the depth the results were searched to. */
export function annotatedText(R: Review<Blueprints>, unit: Unit, record: GameRecord, branches: AnnotateInput["branches"],
                              network: string): string {
  const visits = R.data.analysis.slice(0, R.data.moves.length).flatMap(a => (a ? [a.visits] : []));
  const depth = visits.length ? `, at least ${Math.min(...visits)} visits a position` : "";
  return annotatedRecord({
    R, unit, tags: record.tags, result: record.result, clocks: record.clocks, branches,
    note: `Reviewed by ${SITE_NAME} with ${networkName(network)} (the network ${network})${depth}.`, annotator: SITE_NAME,
  });
}

/** The annotated record of a stored game, from the stored results of the network and the review depth that the game
 *  reviews with (settingsFor), with the labels by turn or by move as the review shows them. Loads the engine's rules,
 *  not its network. */
export async function annotatedFromStore(id: string, manifest: Manifest | null): Promise<string> {
  const stored = await loadGame(id);
  if (!stored) throw new Error(`This browser has no game ${id}.`);
  const { network, visits } = settingsFor(stored.game, loadEngine()), record = stored.record;
  return fromStore({
    game: blueprints, id, moves: record.moves, komi: record.komi,
    // A record whose capture marks the rules refuse: the review says why, and so does the export
    open: async (g, v, search, model) => {
      const problem = await openStored(g, record, v, search, model);
      return problem ? `${SITE_NAME} cannot review this game: ${problem}` : g.rulesReady ? null : g.error;
    },
  }, manifest, network, visits, playerNames(record.tags), (data, branches) =>
    annotatedText(review(blueprints, data, "lead", LABEL_VISITS), loadDisplay().judge, record, branches, network));
}
