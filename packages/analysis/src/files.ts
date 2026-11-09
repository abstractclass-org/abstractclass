// A site's files of saved work (Hedge School's designs 13 and 21): how a site reads its own files, which results of the
// browser's store belong in one, and the Analysis board's file. Each site names its files' format and itself in their
// texts: Hedge School's analysis file is `hedge-school-analysis`, Cyanotype's `cyanotype-analysis`.
//
// The analysis file: the board's lines, the moves evaluated, and the engine's results for every position of them and of
// the positions one move from them (which confirm the Greats), so that the analysis opens at once in another browser.
// It is the review file's kind for the board: the same results, chosen the same way, and read the same way.
import { atShape, isAnalysisKey, ofModels, parentKeyMoves, readAnalysisKey, readable } from "./cache.ts";
import type { KeptBoard } from "./kept.ts";
import { boardPositionKeys } from "./boardLink.ts";
import { isKomi, komiLimitProblem } from "@abstractclass/record/record.ts";
import { STORES, dbEntriesWhere, dbPutMany } from "@abstractclass/storage/db.ts";
import { moduleOf, type Manifest } from "@abstractclass/engine/client.ts";

/** Reads a file of `site` in `format` (`noun`: "review file", "analysis file"), its fields not yet checked but its
 *  results. Throws an Error that tells the player what is wrong. The version changes only when a field changes its
 *  meaning or goes: a new field keeps it, and a reader ignores the fields it does not know (Hedge School's design 13).
 *  The results carry their own shape in their keys (cache.ts): it keeps the shapes that the readers read (readable),
 *  and drops the others. */
export function readSiteFile(text: string, site: string, format: string, version: number, noun: string): Record<string, unknown> & { analyses: [string, unknown][] } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`This is not a ${site} ${noun}: it is not JSON.`);
  }
  const f = data as Record<string, unknown> | null;
  if (!f || typeof f !== "object" || f.format !== format) throw new Error(`This is not a ${site} ${noun}.`);
  if (typeof f.version !== "number" || f.version > version)
    throw new Error(`This ${noun} has version ${f.version}: a newer ${site} wrote it. Reload the site and try again.`);
  if (f.version < version) throw new Error(`This ${noun} has version ${f.version}, which this site no longer reads.`);
  const analyses = (Array.isArray(f.analyses) ? f.analyses : []).filter((e): e is [string, unknown] =>
    Array.isArray(e) && typeof e[0] === "string" && isAnalysisKey(e[0]) && readable(readAnalysisKey(e[0]).shape) &&
    !!e[1] && typeof e[1] === "object");
  return { ...f, analyses };
}

/** Whether a result belongs to a file of `positions`: of one of them, or one move from one, in a shape that the readers
 *  read, and of `models` (the networks' SHA-256) when given. A result of a network that the site no longer ships is of no
 *  use to any copy of it. */
export const belongs = (key: string, positions: Set<string>, models: Set<string> | null) => {
  const k = readAnalysisKey(key);
  return readable(k.shape) && atPositions(k.moves, positions) && (!models || models.has(k.model));
};
/** Whether a result's position (its moves) is one of `positions`, or one move from one. A start (at a set-up position,
 *  at a komi) is no move from another position (cache.ts, parentKeyMoves). */
const atPositions = (moves: string, positions: Set<string>) => {
  const parent = parentKeyMoves(moves);
  return positions.has(moves) || (parent !== null && positions.has(parent));
};

/** The networks a manifest ships, by their SHA-256. */
export const shippedModels = (manifest: { artifacts: { kind: string; sha256: string }[] } | null) =>
  manifest ? new Set(manifest.artifacts.filter(a => a.kind === "model").map(a => a.sha256)) : null;

export const ANALYSIS_FILE_VERSION = 1;

export interface AnalysisFile {
  format: string; // the site's: `hedge-school-analysis`, `cyanotype-analysis`
  version: number;
  exported: string; // ISO date and time
  site: string; // the site's version (its commit) that wrote the file
  board: KeptBoard; // the lines: every node, with the moves evaluated, and the main line
  analyses: [string, unknown][]; // the engine's results, by their keys in the browser's store
}

/** The analysis file of a board in `format`, with the results of `models`, the networks the site ships. `site` is the
 *  site's version. */
export async function exportAnalysis(format: string, board: KeptBoard, site: string, models: Set<string> | null,
                                     now = new Date()): Promise<AnalysisFile> {
  const positions = boardPositionKeys(board);
  const analyses = atShape(await dbEntriesWhere(STORES.analysis, key => belongs(key, positions, models)));
  return { format, version: ANALYSIS_FILE_VERSION, exported: now.toISOString(), site, board, analyses };
}

/** A file name for an analysis in `format`: the format, then the date and time it was saved, the player's own. */
export function analysisFileName(format: string, now = new Date()): string {
  const two = (n: number) => String(n).padStart(2, "0");
  return `${format}-${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}-${two(now.getHours())}${two(now.getMinutes())}.json`;
}

/** Reads an analysis file of `site` in `format`. Throws an Error that tells the player what is wrong. Its version rule
 *  is the review file's (Hedge School's design 13). A board's komi is a number of whole or half points, as a record's
 *  `Komi` tag is (Hedge School's design 24). It is within the game's limit `maxKomi`, either way (its record's
 *  `MAX_RECORD_KOMI`): the engine would refuse a komi beyond it. A site reads the file before it keeps its results
 *  (keepAnalyses), so a file that the board cannot open puts none in the store. */
export function readAnalysisFile(text: string, site: string, format: string, maxKomi: number): AnalysisFile {
  const f = readSiteFile(text, site, format, ANALYSIS_FILE_VERSION, "analysis file") as Partial<AnalysisFile> & { analyses: [string, unknown][] };
  const b = f.board;
  const boardOk = !!b && b.version === 2 && Array.isArray(b.main) && b.main.every(m => typeof m === "string") && Array.isArray(b.nodes) &&
    b.nodes.every(n => Array.isArray(n) && typeof n[0] === "string" && typeof n[1] === "number") &&
    (b.start === undefined || typeof b.start === "string") &&
    (b.komi === undefined || isKomi(b.komi));
  if (!boardOk) throw new Error(`${site} cannot read the analysis file's lines.`);
  const komi = b.komi ?? 0, beyond = komiLimitProblem(komi, maxKomi, komi, "the analysis file's komi");
  if (beyond) throw new Error(beyond);
  return { ...f, board: b } as AnalysisFile;
}

/** Keeps an analysis file's results in this browser, of the manifest's search and the networks it ships: the board
 *  reads no other (Hedge School's design 20, item 8). */
export async function keepAnalyses(file: AnalysisFile, manifest: Manifest | null): Promise<void> {
  const search = manifest && moduleOf(manifest)?.search;
  await dbPutMany(STORES.analysis, ofModels(file.analyses, shippedModels(manifest))
    .filter(([key]) => !search || readAnalysisKey(key).search === search));
}
