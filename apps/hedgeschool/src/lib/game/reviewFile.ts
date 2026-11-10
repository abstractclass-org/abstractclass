// A reviewed game as a file (design 13): the shared review file (@abstractclass/analysis/reviewFile.ts), in Hedge
// School's format, with its record's reader, its store of games and its import (import.ts). The file holds the game's
// record, the player's variations, and the engine's results for every position of the game and its variations, so
// that another browser opens the review without searching again. The game's record alone, with evaluations and labels,
// is the annotated record (review/annotate.ts).
import { STORES, dbGet, dbPut } from "@abstractclass/storage/db.ts";
import { parseRecord, playerNames } from "./record.ts";
import { branchNodes, loadGame, setGameSettings, type KeptBranches } from "./store.ts";
import type { Manifest } from "@abstractclass/engine/client.ts";
import { networkName } from "#lib/analysis/engineSettings.ts";
import { ENCLOSURE_CODE, sharedRecord, type SharedReview } from "./share.ts";
import { reviewLink, shareNote } from "@abstractclass/analysis/share.ts";
import { importRecord, type MoveCheck } from "./import.ts";
import { checkMoves } from "./check.ts";
import { saveToPartner, type GamePartner } from "./partners.ts";
import { mergeBranches, positionKeys } from "@abstractclass/analysis/kept.ts";
import { shippedModels } from "@abstractclass/analysis/files.ts";
import { reviewFiles } from "@abstractclass/analysis/reviewFile.ts";
import { download } from "@abstractclass/site/download.ts";
import { RECORD_EXPORTS, REVIEW_FILE, REVIEW_LINK, deliverFileOrRecord, type ExportItem, type ExportKind, type ExportResult } from "@abstractclass/review/exports.ts";

export const REVIEW_FORMAT = "hedge-school-review";
export { REVIEW_FILE_VERSION, gameAnalyses, shippedModules, type FileReview, type ReviewFile } from "@abstractclass/analysis/reviewFile.ts";

// The moves of every position of a game and its variations, as the results' keys spell them, at the game's komi: the
// shared ones (@abstractclass/analysis/kept.ts).
export { positionKeys };
// Which results belong to a file, and the networks a manifest ships: the shared ones (@abstractclass/analysis/files.ts).
export { belongs, shippedModels } from "@abstractclass/analysis/files.ts";

/** Hedge School's review files. A file's game comes in as a pasted record does (design 13, importRecord): the review
 *  refuses a game of other rules (design 18) or from a set-up start (design 21), the engine's rules check its moves
 *  with `check` (a test gives its own), its record gets its cut marks, and a browser that cannot keep it says so. So
 *  the list keeps no game that the review refuses. */
export const hedgeSchoolFiles = (check: MoveCheck = checkMoves) => reviewFiles({
  name: "Hedge School", format: REVIEW_FORMAT, prefix: "hedge-school", parse: parseRecord,
  players: r => playerNames(r.tags), networkName, loadGame, keep: (text, record) => importRecord(text, record, check),
});
const files = hedgeSchoolFiles();

/** The review file of a game, its record and its variations, with its results among `entries` (of `models` when
 *  given), the site's version, and the game's mark. */
export const buildReviewFile = files.build;

/** Reads a review file (@abstractclass/analysis/files.ts, readSiteFile, for its frame and its results). Throws an Error
 *  that tells the player what is wrong. */
export const readReviewFile = files.read;

/** Reads a review file and keeps it in this browser (importReview), with the networks and the engine modules that the
 *  manifest ships. Answers the game's id, and the file for the load's count. Throws an Error that tells the player what
 *  is wrong. */
export const loadReviewFile = files.load;

/** The variations kept for a game after an import: the shared rule (@abstractclass/analysis/kept.ts). */
export { mergeBranches } from "@abstractclass/analysis/kept.ts";

/** A file name for the game: its players, and its id so that two games of the same players differ. */
export const reviewFileName = files.fileName;

/** The review file of a stored game, with the results of `models`, the networks this site ships. */
const exportReview = files.exportReview;

/** What an export makes, an entry of the Export menu, and what an export tells the player: the shared menu's
 *  (@abstractclass/review/exports.ts). */
export type { ExportItem, ExportKind, ExportResult } from "@abstractclass/review/exports.ts";

/** The review's Export menu (design 13): a link that shares the review, the review file, with the engine's results, or
 *  the annotated record, copied or as a file. The link and the file differ most in what the other end gets: the link
 *  holds no results. A game that came from a partner site by its link (design 18) can go back to it: the review file,
 *  to the player's account there, first in the menu. */
export const reviewExports = (partner: string | null = null): ExportItem[] => [
  ...(partner ? [["partner_save", `Save to ${partner}`, "The review file, to your account there.", `Saved to ${partner}`] as ExportItem] : []),
  REVIEW_LINK,
  REVIEW_FILE,
  ...RECORD_EXPORTS,
];

/** The link that shares a game's review (share.ts): its record, its variations, and the engine, network and visits of its
 *  review (the game's mark: the deepest review that ran to its end). */
async function shareLink(id: string, origin: string): Promise<string> {
  const stored = await loadGame(id), mark = stored?.game.reviewed;
  if (!stored || !mark) throw new Error("the game's review is not done");
  const branches = branchNodes((await dbGet<KeptBranches>(STORES.branches, id)) ?? null);
  return reviewLink(origin, mark, stored.record, branches, ENCLOSURE_CODE);
}

/** Keeps a shared review's game and variations in this browser, beside the variations it may have already, and the sender's
 *  network and depth with the game (`network`: this site's id of the sender's network, null when it has no such
 *  network). Its review is not in the link: the review page searches again. Returns the game's id. */
export async function importShare(shared: SharedReview, network: string | null): Promise<string> {
  const text = sharedRecord(shared);
  const id = await importRecord(text, parseRecord(text));
  if (shared.branches.length) {
    await dbPut(STORES.branches, id, mergeBranches((await dbGet<KeptBranches>(STORES.branches, id)) ?? null,
                                                   { version: 2, nodes: shared.branches }));
  }
  if (network) await setGameSettings(id, { network, visits: shared.visits });
  return id;
}

/** Delivers a game's export: the share link, copied; the review file as a download; or the annotated record, which
 *  `annotated` writes when it is asked for, copied or as a download. `site` is the site's version, which the review
 *  file names. Answers what to tell the player, when that is more than the menu's own note. */
export async function deliverExport(kind: ExportKind, id: string, record: string, manifest: Manifest | null, site: string,
                                    annotated: () => string | Promise<string>, partner?: GamePartner): Promise<ExportResult | void> {
  // The review file to the partner site the game came from (design 18): its save page opens first, within the click,
  // and the file goes to it once the page is ready.
  if (kind === "partner_save") {
    if (!partner) throw new Error("this game came from no partner site");
    const file = exportReview(id, site, shippedModels(manifest)).then(review => ({ name: reviewFileName(record, id), review }));
    await saveToPartner(partner, file);
    return { note: `Saved to ${partner.name}.` };
  }
  if (kind === "share_link") {
    const link = await shareLink(id, location.origin);
    await navigator.clipboard.writeText(link);
    return { linkLength: link.length, note: shareNote(link.length) };
  }
  return deliverFileOrRecord(kind, reviewFileName(record, id), () => exportReview(id, site, shippedModels(manifest)), annotated);
}

/** Keeps a review file's game, variations and results in this browser (@abstractclass/analysis/reviewFile.ts). `models`
 *  are the networks that this site ships (their SHA-256), `modules` the engine modules of this site's search. The
 *  file's review is the game's mark when it ran with a network kept: done here when it ran with one of these modules,
 *  else a review by an earlier engine, which opens as it was (design 20). */
export const importReview = files.importReview;

/** Gives the player a file to save: the shared one (@abstractclass/site/download.ts). */
export { download };
