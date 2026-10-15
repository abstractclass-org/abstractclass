// An analysis as a file (design 21): the Analysis board's lines, the moves evaluated, and the engine's results for every
// position of them, so that the analysis opens at once in another browser. It is the review file's kind for the board
// (reviewFile.ts): the same results, chosen the same way (of the lines' positions and of the positions one move from
// them, which confirm the Greats), and read the same way.
import { ofModels } from "#lib/analysis/cache.ts";
import { STORES, dbEntriesWhere, dbPutMany } from "#lib/storage/db.ts";
import type { Manifest } from "#lib/engine/client.ts";
import { REVIEW_FORMAT, belongs, readSchoolFile, shippedModels } from "./reviewFile.ts";
import { boardLink, boardPositionKeys } from "./board.ts";
import type { KeptBoard } from "./store.ts";

export const ANALYSIS_FORMAT = "hedge-school-analysis";
export const ANALYSIS_FILE_VERSION = 1;

export interface AnalysisFile {
  format: typeof ANALYSIS_FORMAT;
  version: number;
  exported: string; // ISO date and time
  site: string; // the site's version (its commit) that wrote the file
  board: KeptBoard; // the lines: every node, with the moves evaluated, and the main line
  analyses: [string, unknown][]; // the engine's results, by their keys in the browser's store
}

/** The kind of a Hedge School file, from its `format`, or null for another file. */
export function fileKind(text: string): "review" | "analysis" | null {
  try {
    const f = JSON.parse(text) as { format?: unknown };
    return f?.format === ANALYSIS_FORMAT ? "analysis" : f?.format === REVIEW_FORMAT ? "review" : null;
  } catch {
    return null;
  }
}

/** The analysis file of a board, with the results of `models`, the networks this site ships. */
export async function exportAnalysis(board: KeptBoard, site: string, models: Set<string> | null, now = new Date()): Promise<AnalysisFile> {
  const positions = boardPositionKeys(board);
  const analyses = await dbEntriesWhere(STORES.analysis, key => belongs(key, positions, models));
  return { format: ANALYSIS_FORMAT, version: ANALYSIS_FILE_VERSION, exported: now.toISOString(), site, board, analyses };
}

/** A file name for an analysis: the date and time it was saved, the player's own. */
export function analysisFileName(now = new Date()): string {
  const two = (n: number) => String(n).padStart(2, "0");
  return `hedge-school-analysis-${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}-${two(now.getHours())}${two(now.getMinutes())}.json`;
}

/** Reads an analysis file. Throws an Error that tells the player what is wrong. Its version rule is the review file's
 *  (design 13). */
export function readAnalysisFile(text: string): AnalysisFile {
  const f = readSchoolFile(text, ANALYSIS_FORMAT, ANALYSIS_FILE_VERSION, "analysis file") as Partial<AnalysisFile> & { analyses: [string, unknown][] };
  const b = f.board;
  const boardOk = !!b && b.version === 2 && Array.isArray(b.main) && b.main.every(m => typeof m === "string") && Array.isArray(b.nodes) &&
    b.nodes.every(n => Array.isArray(n) && typeof n[0] === "string" && typeof n[1] === "number") &&
    (b.start === undefined || typeof b.start === "string");
  if (!boardOk) throw new Error("Hedge School cannot read the analysis file's lines.");
  return { ...f, board: b } as AnalysisFile;
}

/** Reads an analysis file and keeps its results in this browser, of the networks that the manifest ships. Answers the
 *  board's address with the file's lines (board.ts), as a shared analysis opens: the board counts the load. Throws an
 *  Error that tells the player what is wrong. */
export async function openAnalysisFile(text: string, manifest: Manifest | null): Promise<string> {
  const file = readAnalysisFile(text);
  await dbPutMany(STORES.analysis, ofModels(file.analyses, shippedModels(manifest)));
  return boardLink("", file.board, 0, "analysis_file");
}
