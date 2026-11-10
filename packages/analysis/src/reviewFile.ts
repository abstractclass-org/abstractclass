// A reviewed game as a file (Hedge School's design 13): the game's record, the player's variations, and the engine's
// results for every position of the game and its variations, so that another browser opens the review without
// searching again. The results are keyed by the engine's build and network (cache.ts), so a browser whose site ships
// another network keeps the game and its variations, and its review searches again with its own engine. KaTrain keeps
// its analysis in its SGF files in the same spirit. The game's record alone, with evaluations and labels, is the
// annotated record (annotate.ts). Each site gives its part (ReviewFileSite): its name and its files' format, its
// record's reader, its store of games and its import's checks. Hedge School's src/lib/game/reviewFile.ts and
// Cyanotype's take it.
import { atShape, makeEarlierRemovalDue, ofModels } from "./cache.ts";
import { belongs, readSiteFile, shippedModels } from "./files.ts";
import { markReviewed, setGameSettings, type ReviewMark, type StoredGame } from "./games.ts";
import { mergeBranches, positionKeys, type KeptBranches } from "./kept.ts";
import { STORES, dbEntriesWhere, dbGet, dbPut, dbPutMany } from "@abstractclass/storage/db.ts";
import { searchModules, type Manifest } from "@abstractclass/engine/client.ts";

export const REVIEW_FILE_VERSION = 1;

export interface ReviewFile {
  format: string; // the site's: `hedge-school-review`, `cyanotype-review`
  version: number;
  exported: string; // ISO date and time
  site: string; // the site's version (its commit) that wrote the file
  review: FileReview | null; // the review that ran to its end, which the results hold
  record: string; // the game's record, as kept
  branches: KeptBranches | null;
  analyses: [string, unknown][]; // the engine's results, by their keys in the browser's store
}

/** The finished review in a file: the CPU module's and the network's SHA-256, the module's search (none in an older
 *  file), the network's id and name, the review's depth, and when it ended. */
export interface FileReview extends ReviewMark { networkName: string }

/** The results that belong to a game: of its positions, and of the positions one move from them, which confirm the
 *  Greats (analysis.svelte.ts, confirmGreats), in a shape that the readers read, and of `models` (the networks'
 *  SHA-256) when given: a result of a network that the site no longer ships is of no use to any copy of it. */
export function gameAnalyses(entries: [string, unknown][], positions: Set<string>, models: Set<string> | null = null): [string, unknown][] {
  return entries.filter(([key]) => belongs(key, positions, models));
}

/** The CPU modules of a manifest's search, by SHA-256: a file's review counts as done where it ran with one. */
export const shippedModules = (manifest: Manifest | null) => (manifest ? searchModules(manifest) : null);

/** What a site gives its review files. */
export interface ReviewFileSite<R extends { moves: string[]; komi: number }> {
  name: string; // the site's name, which the files' texts give: "Hedge School"
  format: string; // the files' format: "hedge-school-review"
  prefix: string; // the start of a file's name: "hedge-school"
  parse(text: string): R; // the site's record's reader, which throws with the record's own problem
  players(record: R): { blue: string; red: string };
  networkName(id: string): string; // a network's name, by its id
  loadGame(id: string): Promise<{ game: StoredGame; record: R } | undefined>; // the site's store of games (games.ts)
  /** Keeps a file's game in the site's store of games, and answers its id. Throws an Error that tells the player why
   *  the site does not take the game. */
  keep(text: string, record: R): Promise<string>;
}

/** A site's review files. */
export function reviewFiles<R extends { moves: string[]; komi: number }>(site: ReviewFileSite<R>) {
  /** The review file of a game, its record and its variations, with its results among `entries` (of `models` when
   *  given). `version` is the site's version, which the file names. `reviewed`: the game's mark. */
  function build(record: string, branches: KeptBranches | null, entries: [string, unknown][], version: string,
                 models: Set<string> | null = null, reviewed: ReviewMark | null = null, now = new Date()): ReviewFile {
    const { moves, komi } = site.parse(record);
    return {
      format: site.format, version: REVIEW_FILE_VERSION, exported: now.toISOString(), site: version,
      review: reviewed && { ...reviewed, networkName: site.networkName(reviewed.network) }, record, branches,
      analyses: atShape(gameAnalyses(entries, positionKeys(moves, branches, komi), models)),
    };
  }

  /** Reads a review file (files.ts, readSiteFile, for its frame and its results). Throws an Error that tells the
   *  player what is wrong. */
  function read(text: string): ReviewFile {
    const f = readSiteFile(text, site.name, site.format, REVIEW_FILE_VERSION, "review file") as Partial<ReviewFile> & { analyses: [string, unknown][] };
    if (typeof f.record !== "string") throw new Error("The review file has no game record.");
    site.parse(f.record); // throws with the record's own problem
    const b = f.branches;
    const branchesOk = b === null || b === undefined ||
      (b.version === 2 && Array.isArray(b.nodes) && b.nodes.every(n => Array.isArray(n) && typeof n[0] === "string" && typeof n[1] === "number")) ||
      (b.version === 1 && Array.isArray(b.lines) && b.lines.every(l => Array.isArray(l) && l.every(m => typeof m === "string")));
    if (!branchesOk) throw new Error(`${site.name} cannot read the review file's variations.`);
    const r = f.review;
    const review = r && typeof r === "object" && typeof r.module === "string" && typeof r.model === "string" &&
      typeof r.network === "string" && typeof r.visits === "number" ? r : null;
    if (review && typeof review.search !== "string") delete review.search; // an older file's review names no search
    return { ...f, review, branches: b ?? null } as ReviewFile;
  }

  /** Keeps a review file's game, variations and results in this browser. `models` are the networks that this site
   *  ships (their SHA-256): results of another network are left out, since this site's engine never asks for them.
   *  `modules` are the CPU modules of this site's search (their SHA-256). The file's review is the game's mark when
   *  it ran with a network kept: done here when it ran with one of these modules, else a review by an earlier engine,
   *  which opens as it was (Hedge School's design 20). A mark of this site's search stays over an earlier engine's.
   *  The mark keeps the search that the file's review names: an older file's review names none. The mark comes before
   *  the results: a removal of earlier results in another tab (Hedge School's earlierResults.ts) that runs between
   *  them then finds none of them, rather than results that no mark needs yet. */
  async function importReview(file: ReviewFile, models: Set<string> | null, modules: string[] | null = null) {
    const id = await site.keep(file.record, site.parse(file.record));
    if (file.branches) await dbPut(STORES.branches, id, mergeBranches((await dbGet<KeptBranches>(STORES.branches, id)) ?? null, file.branches));
    const r = file.review, before = (await site.loadGame(id))?.game.reviewed;
    const ours = (module?: string) => !!module && !!modules?.includes(module);
    if (r && (!models || models.has(r.model)) && (ours(r.module) || !ours(before?.module)))
      await markReviewed(id, { module: r.module, model: r.model, network: r.network, visits: r.visits,
                               ...(r.search ? { search: r.search } : {}),
                               modules: ours(r.module) ? modules! : [r.module] });
    // The game keeps the file's network and depth, when the site ships that network, so that its review opens as it
    // was made. The browser's settings stay for the other games.
    if (r && (!models || models.has(r.model))) await setGameSettings(id, { network: r.network, visits: r.visits });
    const wanted = ofModels(file.analyses, models);
    const kept = await dbPutMany(STORES.analysis, wanted), other = file.analyses.length - wanted.length;
    makeEarlierRemovalDue(); // results of an earlier engine that the game's mark may not need: a mark of this site's stays
    return { id, kept, other };
  }

  return {
    build, read, importReview,

    /** Reads a review file and keeps it in this browser (importReview), with the networks and the CPU modules that
     *  the manifest ships. Answers the game's id, and the file for the load's count. Throws an Error that tells the
     *  player what is wrong. */
    async load(text: string, manifest: Manifest | null): Promise<{ id: string; file: ReviewFile }> {
      const file = read(text);
      const { id } = await importReview(file, shippedModels(manifest), shippedModules(manifest));
      return { id, file };
    },

    /** A file name for the game: the site's, its players, and its id so that two games of the same players differ. */
    fileName(record: string, id: string): string {
      const p = site.players(site.parse(record));
      const slug = (s: string) => s.normalize("NFKD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "player";
      return `${site.prefix}-${slug(p.blue)}-vs-${slug(p.red)}-${id}.json`;
    },

    /** The review file of a stored game, with the results of `models`, the networks this site ships. `version` is the
     *  site's version. */
    async exportReview(id: string, version: string, models: Set<string> | null): Promise<ReviewFile> {
      const stored = await site.loadGame(id);
      if (!stored) throw new Error(`This browser has no game ${id}.`);
      const branches = (await dbGet<KeptBranches>(STORES.branches, id)) ?? null;
      const positions = positionKeys(stored.record.moves, branches, stored.record.komi);
      const entries = await dbEntriesWhere(STORES.analysis, key => belongs(key, positions, models));
      return build(stored.game.record, branches, entries, version, models, stored.game.reviewed ?? null);
    },
  };
}
