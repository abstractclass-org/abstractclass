// A reviewed game as a file (design 33, as Hedge School's design 13): the shared review file
// (@abstractclass/analysis/reviewFile.ts), in Cyanotype's format. It holds the game's record, the player's variations,
// and the engine's results for every position of them, so that another browser opens the review without searching
// again. A file's game comes in as a pasted record does (import.ts): the review refuses a game from a set-up start, and
// the engine's rules check its record and its capture marks. So the list keeps no game that the review refuses.
import { reviewFiles } from "@abstractclass/analysis/reviewFile.ts";
import { networkName } from "../analysis/engineSettings.ts";
import { SITE_NAME } from "../site.ts";
import { importRecord, type RecordCheck } from "./import.ts";
import { parseRecord, playerNames } from "./record.ts";
import { loadGame } from "./store.ts";
import { checkRecordMarks } from "../review/recordCheck.ts";

export const REVIEW_FORMAT = "cyanotype-review";
export type { ReviewFile } from "@abstractclass/analysis/reviewFile.ts";

/** Cyanotype's review files, whose games the engine's rules check with `check` (a test gives its own). */
export const cyanotypeFiles = (check: RecordCheck = checkRecordMarks) => reviewFiles({
  name: SITE_NAME, format: REVIEW_FORMAT, prefix: "cyanotype", parse: parseRecord, players: r => playerNames(r.tags),
  networkName, loadGame, keep: (text, record) => importRecord(text, record, check),
});
const files = cyanotypeFiles();

/** The review file of a game, its record and its variations, with its results among `entries` (of `models` when
 *  given), the site's version, and the game's mark. */
export const buildReviewFile = files.build;

/** Reads a review file. Throws an Error that tells the player what is wrong. */
export const readReviewFile = files.read;

/** Reads a review file and keeps it in this browser, with the networks and the engine modules that the manifest ships.
 *  Answers the game's id, and the file. Throws an Error that tells the player what is wrong. */
export const loadReviewFile = files.load;

/** A file name for the game: its players, and its id so that two games of the same players differ. */
export const reviewFileName = files.fileName;

/** The review file of a stored game, with the results of `models`, the networks this site ships. `site` is the site's
 *  version. */
export const exportReview = files.exportReview;
