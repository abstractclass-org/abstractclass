// A site's files of saved work (Hedge School's designs 13 and 21): how a site reads its own files, which results of the
// browser's store belong in one, and the Analysis board's file. Each site names its files' format and itself in their
// texts: Hedge School's analysis file is `hedge-school-analysis`, Cyanotype's `cyanotype-analysis`.
//
// The analysis file: the board's lines, the moves evaluated, and the engine's results for every position of them and of
// the positions one move from them (which confirm the Greats), so that the analysis opens at once in another browser.
// It is the review file's kind for the board: the same results, chosen the same way, and read the same way. It names
// the network that the board searched with (`engine`), and the board that opens it searches with that network
// (boardNetwork), which it keeps as its own (kept.ts, KeptBoard's `network`), as a review file's game keeps its own.
import { atShape, isAnalysisKey, ofModels, parentKeyMoves, readAnalysisKey, readable } from "./cache.ts";
import { boardLines, type KeptBoard } from "./kept.ts";
import { boardPositionKeys } from "./boardLink.ts";
import { isKomi, komiLimitProblem } from "@abstractclass/record/record.ts";
import { STORES, dbEntriesWhere, dbPutMany } from "@abstractclass/storage/db.ts";
import { modelOf, moduleOf, type Manifest } from "@abstractclass/engine/client.ts";

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

/** The kind of a site's file, from its `format`: a review file in `review`, an analysis file in `analysis`, or null for
 *  another file. */
export function fileKind(text: string, review: string, analysis: string): "review" | "analysis" | null {
  try {
    const f = JSON.parse(text) as { format?: unknown };
    return f?.format === analysis ? "analysis" : f?.format === review ? "review" : null;
  } catch {
    return null;
  }
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
  engine?: FileEngine; // the network that the board searched with, and the search: none in an older file
  board: Omit<KeptBoard, "network">; // the lines: every node, with the moves evaluated, and the main line
  analyses: [string, unknown][]; // the engine's results, by their keys in the browser's store
}

/** The engine of an analysis file's board (Hedge School's design 21): the network that the board searched with, by its
 *  id, its name and its file's SHA-256, and the CPU module's search, as a review file's review names them. The board
 *  that opens the file searches with this network, so that the file's results show at once. A new field: the version
 *  stays (Hedge School's design 13). */
export interface FileEngine {
  network: string; // the network's id: "b10c128-s89066368-d17827487"
  networkName: string; // its name, as the engine's release names it: "HedgeFund 0.2 Lite"
  model: string; // the network file's SHA-256, which keys its results (cache.ts)
  search?: string; // the CPU module's search, which keys its results too
}

/** The engine of a board that searches with the network `network`, from the manifest: null when the manifest does not
 *  ship that network. */
export function fileEngine(manifest: Manifest | null, network: string): FileEngine | null {
  const model = manifest && modelOf(manifest, network), search = manifest && moduleOf(manifest)?.search;
  return model ? { network, networkName: model.displayName ?? network, model: model.sha256, ...(search ? { search } : {}) } : null;
}

/** The analysis file of a board in `format`, with the results of `models`, the networks the site ships, and the engine
 *  that the board searched with (fileEngine). `site` is the site's version. The board's own network (kept.ts) is the
 *  board's in this browser: the file names its network as `engine`. */
export async function exportAnalysis(format: string, board: KeptBoard, site: string, models: Set<string> | null,
                                     engine: FileEngine | null = null, now = new Date()): Promise<AnalysisFile> {
  const positions = boardPositionKeys(board);
  const analyses = atShape(await dbEntriesWhere(STORES.analysis, key => belongs(key, positions, models)));
  return { format, version: ANALYSIS_FILE_VERSION, exported: now.toISOString(), site, ...(engine ? { engine } : {}),
           board: boardLines(board), analyses };
}

/** A file name for an analysis in `format`: the format, then the date and time it was saved, the player's own. */
export function analysisFileName(format: string, now = new Date()): string {
  const two = (n: number) => String(n).padStart(2, "0");
  return `${format}-${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}-${two(now.getHours())}${two(now.getMinutes())}.json`;
}

/** Reads an analysis file of `site` in `format`. Throws an Error that tells the player what is wrong. Its version rule
 *  is the review file's (Hedge School's design 13). A board's komi is a number of whole or half points, as a record's
 *  `Komi` tag is (Hedge School's design 24). It is within the game's limit `maxKomi`, either way (its record's
 *  `MAX_RECORD_KOMI`, its engine's cap): beyond it, the analysis module searches with no error, but its numbers mean
 *  nothing. A site reads the file before it keeps its results (keepAnalyses), so a file that the board cannot open
 *  puts none in the store. */
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
  // An engine that the reader cannot use is as none: the results' keys then give the network (fileNetwork).
  const e = f.engine as Partial<FileEngine> | null | undefined;
  const engine = typeof e?.network === "string" && typeof e.model === "string" ?
    { network: e.network, model: e.model, networkName: typeof e.networkName === "string" ? e.networkName : e.network,
      ...(typeof e.search === "string" ? { search: e.search } : {}) } : undefined;
  return { ...f, engine, board: b } as AnalysisFile;
}

/** The network of an analysis file's results, for the board that opens it (Hedge School's design 21):
 *  - `one`: the network that the board searches with, by its id: the file's `engine`, else the one network that the
 *    site ships among its results.
 *  - `several`: the networks that the site ships among its results, more than one, with their counts of results, the
 *    most first. The player chooses one.
 *  - `gone`: a network that the site no longer ships, by its name when the file names it. The board cannot read its
 *    results, and does not search the file's positions with another network until the player chooses one.
 *  - `none`: no result that the site's search reads. The board searches with the browser's network.
 *  The results counted are those of the manifest's search, which the board reads (keepAnalyses). */
export type FileNetwork =
  | { kind: "one"; network: string }
  | { kind: "several"; networks: { network: string; results: number }[] }
  | { kind: "gone"; name: string | null }
  | { kind: "none" };

/** The network of an analysis file's results (FileNetwork), from the networks that the manifest ships. */
export function fileNetwork(file: Pick<AnalysisFile, "engine" | "analyses">, manifest: Manifest | null): FileNetwork {
  if (!manifest) return { kind: "none" };
  const shipped = new Map(manifest.artifacts.filter(a => a.kind === "model").map(a => [a.sha256, a.id]));
  if (file.engine) {
    const id = shipped.get(file.engine.model);
    return id ? { kind: "one", network: id } : { kind: "gone", name: file.engine.networkName };
  }
  const search = moduleOf(manifest)?.search, counts = new Map<string, number>();
  let other = 0; // results of networks that the site no longer ships
  for (const [key] of file.analyses) {
    const k = readAnalysisKey(key), id = shipped.get(k.model);
    if (search && k.search !== search) continue;
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    else other++;
  }
  const networks = [...counts].map(([network, results]) => ({ network, results })).sort((a, b) => b.results - a.results);
  return networks.length === 1 ? { kind: "one", network: networks[0].network }
    : networks.length > 1 ? { kind: "several", networks }
    : other ? { kind: "gone", name: null }
    : { kind: "none" };
}

/** The question that the board asks before it opens an analysis file whose network it cannot take alone (fileNetwork,
 *  `several` and `gone`): a title, why it asks, and a choice of networks, by their ids and names. */
export interface NetworkQuestion { title: string; text: string; choices: { network: string; name: string }[] }

/** A site's networks, as its question names them (networkQuestion): the site's name (`site`), each network's name by
 *  its id (`name`), and the networks that its settings offer (`offered`). */
export interface SiteNetworks { site: string; name: (id: string) => string; offered: string[] }

/** The question for an analysis file of several networks or of a network that the site no longer ships. A file of
 *  several networks offers its networks. A file of a network that has gone offers the networks that the site's settings
 *  offer. */
export function networkQuestion(found: Extract<FileNetwork, { kind: "several" | "gone" }>,
                                { site, name, offered }: SiteNetworks): NetworkQuestion {
  if (found.kind === "several") {
    const each = found.networks.map(n => `${name(n.network)} (${n.results.toLocaleString("en")} result${n.results === 1 ? "" : "s"})`);
    return {
      title: "Choose a network for this analysis",
      text: `This analysis file has results from ${found.networks.length} networks: ${listed(each)}. The board uses ` +
        "one network at a time. It shows the results of that network, and it searches with that network.",
      choices: found.networks.map(n => ({ network: n.network, name: name(n.network) })),
    };
  }
  return {
    title: "The file's network is not available",
    text: `The results in this analysis file are from ${found.name ? `${found.name}, a network` : "a network"} that ` +
      `${site} does not have now. ` +
      "The board cannot show these results. Choose a network to search the file's positions again, or cancel to keep " +
      "your board.",
    choices: offered.map(network => ({ network, name: name(network) })),
  };
}
/** Words in a list: "a", "a and b", "a, b and c". */
const listed = (words: string[]) => (words.length < 2 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`);

/** The network of the board that opens an analysis file (fileNetwork): the file's own, or the network that the player
 *  chooses (`choose`, which answers null for a cancel) when the file holds several or one that has gone. Answers the
 *  network's id, or a network of null for the browser's network (a file with no result that the board reads). Answers
 *  null when the player cancels: the board then stays as it was. */
export async function boardNetwork(file: AnalysisFile, manifest: Manifest | null, networks: SiteNetworks,
                                   choose: (q: NetworkQuestion) => Promise<string | null>): Promise<{ network: string | null } | null> {
  const found = fileNetwork(file, manifest);
  if (found.kind === "one") return { network: found.network };
  if (found.kind === "none") return { network: null };
  const network = await choose(networkQuestion(found, networks));
  return network ? { network } : null;
}

/** The board's address with its own network (`network`, from boardNetwork), which the board reads after the `#`
 *  (addressNetwork). */
export const withNetwork = (address: string, network: string | null) =>
  (network ? `${address}&network=${encodeURIComponent(network)}` : address);
/** The network that the board's address names (withNetwork): an analysis file's, while the site ships it (`ships`),
 *  else null. A board brought another way names none. */
export function addressNetwork(p: URLSearchParams, ships: (network: string) => boolean): string | null {
  const network = p.get("via") === "analysis_file" ? p.get("network") : null;
  return network && ships(network) ? network : null;
}

/** Keeps an analysis file's results in this browser, of the manifest's search and the networks it ships: the board
 *  reads no other (Hedge School's design 20, item 8). */
export async function keepAnalyses(file: AnalysisFile, manifest: Manifest | null): Promise<void> {
  const search = manifest && moduleOf(manifest)?.search;
  await dbPutMany(STORES.analysis, ofModels(file.analyses, shippedModels(manifest))
    .filter(([key]) => !search || readAnalysisKey(key).search === search));
}
