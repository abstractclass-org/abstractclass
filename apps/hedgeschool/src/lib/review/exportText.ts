// The annotated record of a reviewed game (design 13), from the review page's own review, or from the browser's store
// alone where no review runs (the home page): the engine's rules give the positions, the stored results give the
// values, and nothing is searched. Both write the same record.
import { GameAnalysis, type BranchNode } from "#lib/analysis/game.svelte.ts";
import { LABEL_VISITS } from "#lib/analysis/cache.ts";
import { loadEngine, networkName, settingsFor } from "#lib/analysis/engineSettings.ts";
import { EnginePool } from "@abstractclass/engine/pool.ts";
import { modelOf, type Manifest } from "@abstractclass/engine/client.ts";
import { SITE_NAME } from "#lib/edition.ts";
import { playerNames, type GameRecord } from "#lib/game/record.ts";
import { loadGame } from "#lib/game/store.ts";
import { annotatedRecord } from "./annotate.ts";
import { loadDisplay } from "./display.ts";
import { review, type Review, type Unit } from "./model.ts";

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
 *  not its network. */
export async function annotatedFromStore(id: string, manifest: Manifest | null): Promise<string> {
  const stored = await loadGame(id);
  if (!stored) throw new Error(`This browser has no game ${id}.`);
  if (!manifest) throw new Error("this site has no engine");
  const { network, visits } = settingsFor(stored.game, loadEngine());
  const model = modelOf(manifest, network);
  if (!model) throw new Error(`this site has no network ${network}`);
  const pool = new EnginePool(0); // the rules alone: no search
  try {
    await pool.start(manifest, network);
    const game = new GameAnalysis(pool, stored.record.moves, id);
    game.setReview(visits);
    await game.start();
    if (game.error) throw new Error(game.error);
    await game.fromStore(pool.search!, model.sha256);
    const data = game.data(playerNames(stored.record.tags));
    if (!data) throw new Error("the engine could not read this game");
    // A game this browser has not reviewed with the current engine and network, or only in part: a record without the
    // engine's values would still say it was reviewed. The review page reviews it. The start is left out: every game
    // shares it, so another game's review stores it.
    const own = data.analysis.slice(1, data.moves.length), found = own.filter(a => a).length;
    if (found === 0) throw new Error("open the game to review it first");
    if (found < own.length) throw new Error("open the game to finish its review first");
    return annotatedText(review(data, "lead", LABEL_VISITS), loadDisplay().judge, stored.record, game.branches, network);
  } finally {
    pool.terminate();
  }
}
