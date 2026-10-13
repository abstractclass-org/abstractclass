// A reviewed game as a file (design 13): the game's record, the player's branches, and the engine's results for every
// position of the game and its branches, so that another browser opens the review without searching again. The
// results are keyed by the engine's build and network (analysis/cache.ts), so a browser whose site ships another
// network keeps the game and its branches, and its review searches again with its own engine. KaTrain keeps its
// analysis in its SGF files in the same spirit. The game's record alone, with evaluations and labels, is the annotated
// record (review/annotate.ts).
import { SHAPE, readAnalysisKey } from "#lib/analysis/cache.ts";
import { STORES, dbEntriesWhere, dbGet, dbPut, dbPutMany } from "#lib/storage/db.ts";
import { parseRecord, playerNames } from "./record.ts";
import { branchNodes, loadGame, markReviewed, saveGame, setGameSettings, type BranchNode, type KeptBranches, type ReviewMark } from "./store.ts";
import { moduleOf, type Manifest } from "#lib/engine/client.ts";
import { networkName } from "#lib/analysis/engineSettings.ts";
import { DISCORD_LIMIT, encodeShare, sharedRecord, type SharedReview } from "./share.ts";
import { importRecord, variantProblem } from "./import.ts";
import { saveToPartner, type GamePartner } from "./partners.ts";

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

/** The finished review in a file: the engine module's and the network's SHA-256, the network's id and name, the
 *  review's depth, and when it ended. */
export interface FileReview extends ReviewMark { networkName: string }

/** The moves of every position of a game and its branches, as the results' keys spell them: the record's own moves on
 *  the game's line, and a branch node's path key off it (analysis/game.svelte.ts, engineMoves). */
export function positionKeys(moves: string[], branches: KeptBranches | null): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i <= moves.length; i++) out.add(moves.slice(0, i).join(" "));
  for (const [key] of branchNodes(branches)) out.add(key);
  return out;
}

/** The results that belong to a game: of its positions, and of the positions one move from them, which confirm the
 *  Greats (analysis/game.svelte.ts, confirmGreats), in the store's current shape, and of `models` (the networks'
 *  SHA-256) when given: a result of a network that the site no longer ships is of no use to any copy of it. */
export function gameAnalyses(entries: [string, unknown][], positions: Set<string>, models: Set<string> | null = null): [string, unknown][] {
  return entries.filter(([key]) => belongs(key, positions, models));
}
const belongs = (key: string, positions: Set<string>, models: Set<string> | null) => {
  const k = readAnalysisKey(key);
  const parent = k.moves.includes(" ") ? k.moves.slice(0, k.moves.lastIndexOf(" ")) : k.moves ? "" : null;
  return k.shape === SHAPE && (positions.has(k.moves) || (parent !== null && positions.has(parent))) && (!models || models.has(k.model));
};

export function buildReviewFile(record: string, branches: KeptBranches | null, entries: [string, unknown][], site: string,
                                models: Set<string> | null = null, reviewed: ReviewMark | null = null, now = new Date()): ReviewFile {
  const moves = parseRecord(record).moves;
  return {
    format: REVIEW_FORMAT, version: REVIEW_FILE_VERSION, exported: now.toISOString(), site,
    review: reviewed && { ...reviewed, networkName: networkName(reviewed.network) }, record, branches,
    analyses: gameAnalyses(entries, positionKeys(moves, branches), models),
  };
}

/** Reads a review file. Throws an Error that tells the player what is wrong. */
export function readReviewFile(text: string): ReviewFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This is not a Hedge School review file: it is not JSON.");
  }
  const f = data as Partial<ReviewFile>;
  if (!f || typeof f !== "object" || f.format !== REVIEW_FORMAT) throw new Error("This is not a Hedge School review file.");
  // The version changes only when a field changes its meaning or goes: a new field keeps it, and a reader ignores the
  // fields it does not know (design 13). The results carry their own shape in their keys (analysis/cache.ts).
  if (typeof f.version !== "number" || f.version > REVIEW_FILE_VERSION)
    throw new Error(`This review file has version ${f.version}: a newer Hedge School wrote it. Reload the site and try again.`);
  if (f.version < REVIEW_FILE_VERSION) throw new Error(`This review file has version ${f.version}, which this site no longer reads.`);
  if (typeof f.record !== "string") throw new Error("The review file has no game record.");
  parseRecord(f.record); // throws with the record's own problem
  const b = f.branches;
  const branchesOk = b === null || b === undefined ||
    (b.version === 2 && Array.isArray(b.nodes) && b.nodes.every(n => Array.isArray(n) && typeof n[0] === "string" && typeof n[1] === "number")) ||
    (b.version === 1 && Array.isArray(b.lines) && b.lines.every(l => Array.isArray(l) && l.every(m => typeof m === "string")));
  if (!branchesOk) throw new Error("The review file's branches cannot be read.");
  const analyses = Array.isArray(f.analyses) ? f.analyses : [];
  const results = analyses.filter((e): e is [string, unknown] =>
    Array.isArray(e) && typeof e[0] === "string" && /^\d+\|[^|]*\|[0-9a-f]+\|\d+\|/.test(e[0]) && !!e[1] && typeof e[1] === "object");
  const r = f.review;
  const review = r && typeof r === "object" && typeof r.module === "string" && typeof r.model === "string" &&
    typeof r.network === "string" && typeof r.visits === "number" ? r : null;
  return { ...f, review, branches: b ?? null, analyses: results } as ReviewFile;
}

/** The branches kept for a game after an import: the kept ones first, in their order, then the file's that are new, after
 *  them in the file's order. */
export function mergeBranches(kept: KeptBranches | null, added: KeptBranches | null): KeptBranches | null {
  const mine = branchNodes(kept), theirs = branchNodes(added);
  if (!mine.length && !theirs.length) return kept ?? added;
  const have = new Set(mine.map(n => n[0]));
  const next = Math.max(-1, ...mine.map(n => n[1])) + 1;
  const fresh = theirs.filter(n => !have.has(n[0])).sort((a, b) => a[1] - b[1])
    .map((n, i): BranchNode => (n[2] ? [n[0], next + i, 1] : [n[0], next + i]));
  return { version: 2, nodes: [...mine, ...fresh] };
}

/** A file name for the game: its players, and its id so that two games of the same players differ. */
export function reviewFileName(record: string, id: string): string {
  const p = playerNames(parseRecord(record).tags);
  const slug = (s: string) => s.normalize("NFKD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "player";
  return `hedge-school-${slug(p.blue)}-vs-${slug(p.red)}-${id}.json`;
}

/** The review file of a stored game, with the results of `models`, the networks this site ships. */
export async function exportReview(id: string, site: string, models: Set<string> | null): Promise<ReviewFile> {
  const stored = await loadGame(id);
  if (!stored) throw new Error(`This browser has no game ${id}.`);
  const branches = (await dbGet<KeptBranches>(STORES.branches, id)) ?? null;
  const positions = positionKeys(stored.record.moves, branches);
  const entries = await dbEntriesWhere(STORES.analysis, key => belongs(key, positions, models));
  return buildReviewFile(stored.game.record, branches, entries, site, models, stored.game.reviewed ?? null);
}

/** The networks a manifest ships, by their SHA-256. */
export const shippedModels = (manifest: { artifacts: { kind: string; sha256: string }[] } | null) =>
  manifest ? new Set(manifest.artifacts.filter(a => a.kind === "model").map(a => a.sha256)) : null;

/** The engine module a manifest ships, by its SHA-256: a file's review counts as done where it ran with it. */
export const shippedModule = (manifest: Manifest | null) => (manifest && moduleOf(manifest)?.sha256) ?? null;

/** The three exports of a game (design 13): the review file, or the annotated record copied or as a text file. */
export type ExportKind = "link" | "file" | "copy" | "text" | "partner";

/** What an export tells the player beyond the menu's own note, and a share link's length (design 17 counts it). */
export interface ExportResult { note?: string; linkLength?: number }

/** The link that shares a game's review (share.ts): its record, its branches, and the engine, network and visits of its
 *  review (the game's mark: the deepest review that ran to its end). */
export async function shareLink(id: string, origin: string): Promise<string> {
  const stored = await loadGame(id), mark = stored?.game.reviewed;
  if (!stored || !mark) throw new Error("the game's review is not done");
  const branches = branchNodes((await dbGet<KeptBranches>(STORES.branches, id)) ?? null);
  return `${origin}/import#s=${encodeShare({ module: mark.module.slice(0, 8), model: mark.model.slice(0, 8), visits: mark.visits,
                                            tags: stored.record.tags, moves: stored.record.moves, branches })}`;
}

/** Keeps a shared review's game and branches in this browser, beside the branches it may have already, and the sender's
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
  if (kind === "partner") {
    if (!partner) throw new Error("this game came from no partner site");
    const file = exportReview(id, site, shippedModels(manifest)).then(review => ({ name: reviewFileName(record, id), review }));
    await saveToPartner(partner, file);
    return { note: `Saved to ${partner.name}.` };
  }
  if (kind === "link") {
    const link = await shareLink(id, location.origin);
    await navigator.clipboard.writeText(link);
    const n = link.length.toLocaleString("en");
    return {
      linkLength: link.length,
      note: link.length > DISCORD_LIMIT
        ? `Link copied: ${n} characters, more than a Discord message takes (${DISCORD_LIMIT.toLocaleString("en")}). Delete some branches, or send the review file.`
        : `Link copied (${n} characters). The recipient's browser reviews the game again.`,
    };
  }
  const name = reviewFileName(record, id);
  if (kind === "file") {
    download(name, JSON.stringify(await exportReview(id, site, shippedModels(manifest))));
    return;
  }
  const text = await annotated();
  if (kind === "copy") await navigator.clipboard.writeText(text);
  else download(name.replace(/\.json$/, ".txt"), text, "text/plain");
}

/** Keeps a review file's game, branches and results in this browser. `models` are the networks that this site ships
 *  (their SHA-256): results of another network are left out, since this site's engine never asks for them. `module` is
 *  this site's engine module (its SHA-256): the file's review counts as done here when it ran with it and with a
 *  network kept. */
export async function importReview(file: ReviewFile, models: Set<string> | null, module: string | null = null) {
  const variant = variantProblem(parseRecord(file.record));
  if (variant) throw new Error(variant);
  const { id } = await saveGame(file.record, parseRecord(file.record));
  if (file.branches) await dbPut(STORES.branches, id, mergeBranches((await dbGet<KeptBranches>(STORES.branches, id)) ?? null, file.branches));
  const wanted = file.analyses.filter(([key]) => !models || models.has(readAnalysisKey(key).model));
  const kept = await dbPutMany(STORES.analysis, wanted), other = file.analyses.length - wanted.length;
  const r = file.review;
  if (r && r.module === module && (!models || models.has(r.model)))
    await markReviewed(id, { module: r.module, model: r.model, network: r.network, visits: r.visits });
  // The game keeps the file's network and depth, when the site ships that network, so that its review opens as it was
  // made. The browser's settings stay for the other games.
  if (r && (!models || models.has(r.model))) await setGameSettings(id, { network: r.network, visits: r.visits });
  return { id, kept, other };
}

/** Gives the player a file to save. */
export function download(name: string, text: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
