// A review from the browser's store alone, with no search: the shared steps (@abstractclass/analysis/storedReview.ts),
// with Cyanotype's step after the rules, the check of the record's capture marks against what each move did. The
// review page (routes/review/+page.svelte) takes the first steps here (startChecked), then reads the stored results as
// openStored does, and drops a failed read of the store. Its review snapshot (Hedge School's design 20) takes the
// check here too (captureMarksStep), at the earlier review's depth. The annotated record of a stored game
// (exportText.ts) and the label snapshot (labels.snapshot.engine.test.ts) take all the steps here (openStored), so that
// their quality labels are the ones that a player sees. As Hedge School's storedReview.ts, with no book: Cyanotype has
// none.
import type { GameAnalysis } from "@abstractclass/analysis/analysis.svelte.ts";
import * as shared from "@abstractclass/analysis/storedReview.ts";
import { checkCaptures } from "../game/check.ts";
import type { GameRecord } from "../game/record.ts";
import { SITE_NAME } from "../site.ts";
import type { Blueprints } from "./blueprints.ts";

/** The capture marks of `record` against what each move of the game's analysis did (checkCaptures, design 33, item 6),
 *  as Cyanotype's step after the rules: why the site cannot review the game, or null. */
export const captureMarksStep = (record: GameRecord): shared.StoredStep<Blueprints> => async g => {
  const effects = g.played.map(m => ({ captured: Object.keys(m.did.captured).length, points: m.did.points }));
  const problem = checkCaptures(record, effects).problem;
  return problem && `${SITE_NAME} cannot review this game: ${problem}`;
};

/** Starts the review of `g`'s game, whose record is `record`, at the review depth `visits`: the engine's rules
 *  (GameAnalysis.start), then the record's capture marks (captureMarksStep). Answers why the site cannot review the
 *  game, from its capture marks, or null, or false when the rules refuse the game (`g.error` says why). */
export const startChecked = (g: GameAnalysis<Blueprints>, record: GameRecord, visits: number) =>
  shared.startStored(g, visits, captureMarksStep(record));

/** Opens the review of `g`'s game from the store: startChecked, then the stored results of the search `search` with
 *  the network `model` (GameAnalysis.fromStore). Answers as startChecked. When the rules refuse the game, or the
 *  capture marks are wrong, it reads no results. */
export const openStored = (g: GameAnalysis<Blueprints>, record: GameRecord, visits: number, search: string, model: string) =>
  shared.openStored(g, visits, search, model, captureMarksStep(record));
