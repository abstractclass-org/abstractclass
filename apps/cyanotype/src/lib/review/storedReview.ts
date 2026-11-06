// A review from the browser's store alone, with no search: the engine's rules give the positions, and the stored
// results give the rest. The review page (routes/review/+page.svelte) takes these steps here (openStored) before it
// shows the review, and the label snapshot (labels.snapshot.engine.test.ts) takes the same steps, in one order, so that
// its quality labels are the ones that a player sees. As Hedge School's storedReview.ts, with no book: Cyanotype has
// none.
import type { GameAnalysis } from "@abstractclass/analysis/analysis.svelte.ts";
import { checkCaptures } from "../game/check.ts";
import type { GameRecord } from "../game/record.ts";
import type { Blueprints } from "./blueprints.ts";

/** The engine whose stored results a review reads: its search (the module's `search`) and the network's SHA-256. */
export interface StoredEngine { search: string; model: string }

/** Opens the review of `g`'s game, whose record is `record`, at the review depth `visits`: the engine's rules
 *  (GameAnalysis.start), the record's capture marks against what each move did (checkCaptures, design 33, item 6),
 *  then the stored results of `engine` (GameAnalysis.fromStore), after the read of the store that `warm` waits for.
 *  Answers why the site cannot review the game, from its capture marks, or null. When the rules refuse the game, or
 *  the capture marks are wrong, it reads no results: `g.error` says why the rules refused it. A store that cannot be
 *  read leaves the results to the review's search. */
export async function openStored(g: GameAnalysis<Blueprints>, record: GameRecord, visits: number,
                                 engine: StoredEngine | null, warm?: Promise<unknown>): Promise<string | null> {
  g.setReview(visits);
  await g.start();
  if (!g.rulesReady) return null;
  const effects = g.played.map(m => ({ captured: Object.keys(m.did.captured).length, points: m.did.points }));
  const problem = checkCaptures(record, effects).problem;
  if (problem) return problem;
  await warm;
  if (engine) await g.fromStore(engine.search, engine.model).catch(() => {});
  return null;
}
