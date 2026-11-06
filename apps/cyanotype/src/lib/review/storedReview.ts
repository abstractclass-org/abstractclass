// A review from the browser's store alone, with no search: the engine's rules give the positions, the record's capture
// marks are checked against them, and the stored results give the rest. The review page (routes/review/+page.svelte)
// takes the first steps here (startChecked), then reads the stored results as openStored does, and drops a failed read
// of the store. The label snapshot (labels.snapshot.engine.test.ts) takes all the steps here (openStored), so that its
// quality labels are the ones that a player sees. As Hedge School's storedReview.ts, with no book: Cyanotype has none.
import type { GameAnalysis } from "@abstractclass/analysis/analysis.svelte.ts";
import { checkCaptures } from "../game/check.ts";
import type { GameRecord } from "../game/record.ts";
import type { Blueprints } from "./blueprints.ts";

/** Starts the review of `g`'s game, whose record is `record`, at the review depth `visits`: the engine's rules
 *  (GameAnalysis.start), then the record's capture marks against what each move did (checkCaptures, design 33, item 6).
 *  Answers why the site cannot review the game, from its capture marks, or null. When the rules refuse the game, it
 *  answers null, and `g.error` says why. */
export async function startChecked(g: GameAnalysis<Blueprints>, record: GameRecord, visits: number) {
  g.setReview(visits);
  await g.start();
  if (!g.rulesReady) return null;
  const effects = g.played.map(m => ({ captured: Object.keys(m.did.captured).length, points: m.did.points }));
  return checkCaptures(record, effects).problem;
}

/** Opens the review of `g`'s game from the store: startChecked, then the stored results of the search `search` with
 *  the network `model` (GameAnalysis.fromStore). Answers as startChecked. When the rules refuse the game, or the
 *  capture marks are wrong, it reads no results. */
export async function openStored(g: GameAnalysis<Blueprints>, record: GameRecord, visits: number, search: string,
                                 model: string) {
  const problem = await startChecked(g, record, visits);
  if (!problem && g.rulesReady) await g.fromStore(search, model);
  return problem;
}
