// A reviewed game as a file (design 13): the game's record, the player's variations, and the engine's results for every
// position of the game and its variations, so that another browser opens the review without searching again. The
// results are keyed by the engine's build and network (@abstractclass/analysis/cache.ts), so a browser whose site ships
// another network keeps the game and its variations, and its review searches again with its own engine. KaTrain keeps its
// analysis in its SGF files in the same spirit. The game's record alone, with evaluations and labels, is the annotated
// record (review/annotate.ts).
import { atShape, makeEarlierRemovalDue, ofModels } from "@abstractclass/analysis/cache.ts";
import { belongs, readSiteFile, shippedModels } from "@abstractclass/analysis/files.ts";
import { STORES, dbEntriesWhere, dbGet, dbPut, dbPutMany } from "@abstractclass/storage/db.ts";
import { parseRecord, playerNames } from "./record.ts";
import { branchNodes, loadGame, markReviewed, saveGame, setGameSettings, type KeptBranches, type ReviewMark } from "./store.ts";
import { prefixKeys } from "@abstractclass/analysis/tree.ts";
import { searchModules, type Manifest } from "@abstractclass/engine/client.ts";
import { networkName } from "#lib/analysis/engineSettings.ts";
import { encodeShare, sharedRecord, type SharedReview } from "./share.ts";
import { shareNote } from "@abstractclass/analysis/share.ts";
import { importRecord, variantProblem } from "./import.ts";
import { saveToPartner, type GamePartner } from "./partners.ts";
import { mergeBranches } from "@abstractclass/analysis/kept.ts";
import { download } from "@abstractclass/site/download.ts";
import type { ExportItem, ExportKind, ExportResult } from "@abstractclass/review/exports.ts";

export const REVIEW_FORMAT = "hedge-school-review";
export const REVIEW_FILE_VERSION = 1;

export interface ReviewFile {
  format: typeof REVIEW_FORMAT;
  version: number;
  exported: string; // ISO date and time
  site: string; // the site's version (its commit) that wrote the file
  review: FileReview | null; // the review that ran to its end, which the results hold
  record: string; // the game's record, as kept
  branches: KeptBranches | null;
  analyses: [string, unknown][]; // the engine's results, by their keys in the browser's store
}

/** The finished review in a file: the engine module's and the network's SHA-256, the module's search (none in an older
 *  file), the network's id and name, the review's depth, and when it ended. */
export interface FileReview extends ReviewMark { networkName: string }

/** The moves of every position of a game and its variations, as the results' keys spell them: the record's own moves on
 *  the game's line, and a variation node's path key off it (@abstractclass/analysis/analysis.svelte.ts, engineMoves).
 *  Version 1 kept a variation as its line: each node of it. */
export function positionKeys(moves: string[], branches: KeptBranches | null): Set<string> {
  const out = new Set(prefixKeys(moves));
  if (branches?.version === 1) for (const line of branches.lines) for (const k of prefixKeys(line)) out.add(k);
  else for (const [key] of branchNodes(branches)) out.add(key);
  return out;
}

/** The results that belong to a game: of its positions, and of the positions one move from them, which confirm the
 *  Greats (@abstractclass/analysis/analysis.svelte.ts, confirmGreats), in a shape that the readers read, and of `models`
 *  (the networks' SHA-256) when given: a result of a network that the site no longer ships is of no use to any copy of
 *  it. */
export function gameAnalyses(entries: [string, unknown][], positions: Set<string>, models: Set<string> | null = null): [string, unknown][] {
  return entries.filter(([key]) => belongs(key, positions, models));
}
// Which results belong to a file, and the networks a manifest ships: the shared ones (@abstractclass/analysis/files.ts).
export { atPositions, belongs, shippedModels } from "@abstractclass/analysis/files.ts";

export function buildReviewFile(record: string, branches: KeptBranches | null, entries: [string, unknown][], site: string,
                                models: Set<string> | null = null, reviewed: ReviewMark | null = null, now = new Date()): ReviewFile {
  const moves = parseRecord(record).moves;
  return {
    format: REVIEW_FORMAT, version: REVIEW_FILE_VERSION, exported: now.toISOString(), site,
    review: reviewed && { ...reviewed, networkName: networkName(reviewed.network) }, record, branches,
    analyses: atShape(gameAnalyses(entries, positionKeys(moves, branches), models)),
  };
}

/** Reads a Hedge School file of `format` (a review file or an analysis file: `noun`), its fields not yet checked but
 *  its results (@abstractclass/analysis/files.ts, readSiteFile). Throws an Error that tells the player what is wrong. */
export const readSchoolFile = (text: string, format: string, version: number, noun: string) =>
  readSiteFile(text, "Hedge School", format, version, noun);

/** Reads a review file. Throws an Error that tells the player what is wrong. */
export function readReviewFile(text: string): ReviewFile {
  const f = readSchoolFile(text, REVIEW_FORMAT, REVIEW_FILE_VERSION, "review file") as Partial<ReviewFile> & { analyses: [string, unknown][] };
  if (typeof f.record !== "string") throw new Error("The review file has no game record.");
  parseRecord(f.record); // throws with the record's own problem
  const b = f.branches;
  const branchesOk = b === null || b === undefined ||
    (b.version === 2 && Array.isArray(b.nodes) && b.nodes.every(n => Array.isArray(n) && typeof n[0] === "string" && typeof n[1] === "number")) ||
    (b.version === 1 && Array.isArray(b.lines) && b.lines.every(l => Array.isArray(l) && l.every(m => typeof m === "string")));
  if (!branchesOk) throw new Error("Hedge School cannot read the review file's variations.");
  const r = f.review;
  const review = r && typeof r === "object" && typeof r.module === "string" && typeof r.model === "string" &&
    typeof r.network === "string" && typeof r.visits === "number" ? r : null;
  if (review && typeof review.search !== "string") delete review.search; // an older file's review names no search
  return { ...f, review, branches: b ?? null } as ReviewFile;
}

/** Reads a review file and keeps it in this browser (importReview), with the networks and the engine modules that the
 *  manifest ships. Answers the game's id, and the file for the load's count. Throws an Error that tells the player what
 *  is wrong. */
export async function loadReviewFile(text: string, manifest: Manifest | null): Promise<{ id: string; file: ReviewFile }> {
  const file = readReviewFile(text);
  const { id } = await importReview(file, shippedModels(manifest), shippedModules(manifest));
  return { id, file };
}

/** The variations kept for a game after an import: the shared rule (@abstractclass/analysis/kept.ts). */
export { mergeBranches } from "@abstractclass/analysis/kept.ts";

/** A file name for the game: its players, and its id so that two games of the same players differ. */
export function reviewFileName(record: string, id: string): string {
  const p = playerNames(parseRecord(record).tags);
  const slug = (s: string) => s.normalize("NFKD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "player";
  return `hedge-school-${slug(p.blue)}-vs-${slug(p.red)}-${id}.json`;
}

/** The review file of a stored game, with the results of `models`, the networks this site ships. */
async function exportReview(id: string, site: string, models: Set<string> | null): Promise<ReviewFile> {
  const stored = await loadGame(id);
  if (!stored) throw new Error(`This browser has no game ${id}.`);
  const branches = (await dbGet<KeptBranches>(STORES.branches, id)) ?? null;
  const positions = positionKeys(stored.record.moves, branches);
  const entries = await dbEntriesWhere(STORES.analysis, key => belongs(key, positions, models));
  return buildReviewFile(stored.game.record, branches, entries, site, models, stored.game.reviewed ?? null);
}

/** The engine modules of a manifest's search, by SHA-256: a file's review counts as done where it ran with one. */
export const shippedModules = (manifest: Manifest | null) => (manifest ? searchModules(manifest) : null);

/** What an export makes, an entry of the Export menu, and what an export tells the player: the shared menu's
 *  (@abstractclass/review/exports.ts). */
export type { ExportItem, ExportKind, ExportResult } from "@abstractclass/review/exports.ts";

/** The review's Export menu (design 13): a link that shares the review, the review file, with the engine's results, or
 *  the annotated record, copied or as a file. The link and the file differ most in what the other end gets: the link
 *  holds no results. A game that came from a partner site by its link (design 18) can go back to it: the review file,
 *  to the player's account there, first in the menu. */
export const reviewExports = (partner: string | null = null): ExportItem[] => [
  ...(partner ? [["partner_save", `Save to ${partner}`, "The review file, to your account there.", `Saved to ${partner}`] as ExportItem] : []),
  ["share_link", "Copy a link to share the review", "Short. The recipient's browser reviews the game again.", "Link copied"],
  ["review_file", "Review file, to load later or elsewhere", "With the engine's results: the review opens at once.", "Review file saved"],
  ["record_copy", "Copy the annotated record", "", "Annotated record copied"],
  ["record_file", "Annotated record as a file", "", "Annotated record saved"],
];

/** The link that shares a game's review (share.ts): its record, its variations, and the engine, network and visits of its
 *  review (the game's mark: the deepest review that ran to its end). */
async function shareLink(id: string, origin: string): Promise<string> {
  const stored = await loadGame(id), mark = stored?.game.reviewed;
  if (!stored || !mark) throw new Error("the game's review is not done");
  const branches = branchNodes((await dbGet<KeptBranches>(STORES.branches, id)) ?? null);
  return `${origin}/review#packed=${encodeShare({ module: mark.module.slice(0, 8), model: mark.model.slice(0, 8), visits: mark.visits,
                                            tags: stored.record.tags, moves: stored.record.moves, branches })}`;
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
  const name = reviewFileName(record, id);
  if (kind === "review_file") {
    download(name, JSON.stringify(await exportReview(id, site, shippedModels(manifest))));
    return;
  }
  const text = await annotated();
  if (kind === "record_copy") await navigator.clipboard.writeText(text);
  else download(name.replace(/\.json$/, ".txt"), text, "text/plain");
}

/** Keeps a review file's game, variations and results in this browser. `models` are the networks that this site ships
 *  (their SHA-256): results of another network are left out, since this site's engine never asks for them. `modules` are
 *  the engine modules of this site's search (their SHA-256). The file's review is the game's mark when it ran with a
 *  network kept: done here when it ran with one of these modules, else a review by an earlier engine, which opens as
 *  it was (design 20). A mark of this site's search stays over an earlier engine's. The mark keeps the search that the
 *  file's review names: an older file's review names none. The mark comes before the results:
 *  a removal of earlier results in another tab (earlierResults.ts) that runs between them then finds none of them,
 *  rather than results that no mark needs yet. */
export async function importReview(file: ReviewFile, models: Set<string> | null, modules: string[] | null = null) {
  const variant = variantProblem(parseRecord(file.record));
  if (variant) throw new Error(variant);
  const { id } = await saveGame(file.record, parseRecord(file.record));
  if (file.branches) await dbPut(STORES.branches, id, mergeBranches((await dbGet<KeptBranches>(STORES.branches, id)) ?? null, file.branches));
  const r = file.review, before = (await loadGame(id))?.game.reviewed;
  const ours = (module?: string) => !!module && !!modules?.includes(module);
  if (r && (!models || models.has(r.model)) && (ours(r.module) || !ours(before?.module)))
    await markReviewed(id, { module: r.module, model: r.model, network: r.network, visits: r.visits,
                             ...(r.search ? { search: r.search } : {}),
                             modules: ours(r.module) ? modules! : [r.module] });
  // The game keeps the file's network and depth, when the site ships that network, so that its review opens as it was
  // made. The browser's settings stay for the other games.
  if (r && (!models || models.has(r.model))) await setGameSettings(id, { network: r.network, visits: r.visits });
  const wanted = ofModels(file.analyses, models);
  const kept = await dbPutMany(STORES.analysis, wanted), other = file.analyses.length - wanted.length;
  makeEarlierRemovalDue(); // results of an earlier engine that the game's mark may not need: a mark of this site's stays
  return { id, kept, other };
}

/** Gives the player a file to save: the shared one (@abstractclass/site/download.ts). */
export { download };
