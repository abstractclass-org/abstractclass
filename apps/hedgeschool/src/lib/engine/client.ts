// The page's side of one engine worker: a promise for each request, and partial results while a search runs
// (channel.ts). Also the manifest of the engine's artifacts, and what the site looks up in it.
import { fetchArtifact, type StoredArtifact } from "./artifacts.ts";
import { WorkerChannel, type Timed } from "./channel.ts";
import type { WorkerRequest } from "./messages.ts";
import {
  PROTOCOL, speaksProtocol, type AnalysisQuery, type AnalysisReply, type DescribeGameReply, type DescribeReply,
  type LoadModelReply, type PlayReply, type PositionQuery, type VersionReply,
} from "./protocol.ts";

export { EngineError, Stopped, type Timed } from "./channel.ts";

/** The engine's artifacts that the site was built with (static/engine/manifest.json, scripts/fetch-engine.mjs). */
export interface Manifest { artifacts: Artifact[] }
export interface Artifact extends StoredArtifact {
  id: string; kind: ArtifactKind; interface: string | null; released: boolean;
  displayName?: string; // a network's name (the release's manifest): "HedgeFund 0.2 Lite"
  graphOf?: string; // a graph's network (its model's id)
  download: number; // the bytes a browser downloads for it: `bytes`, or the compressed parts'
  // A module's search (request 17). From protocol 0.6 the module reports it too: the page reads this one before the
  // module answers (cache.ts, warmCache).
  search?: string;
  sameSearchAs?: string[]; // the CPU module: the earlier CPU modules of its search, by SHA-256
}
/** The CPU module, the GPU module and its JavaScript half, a network, a network's ONNX graph, the notices (the licences
 *  of the works of others), the terms (the engine's own: LICENSE.txt), and ONNX Runtime Web's glue script and
 *  WebAssembly. The practice bot's (design 24): its module with one search thread, its module with several, the
 *  network alone for the CPU workers that evaluate for it, and their JavaScript (the bot's loader, and the CPU
 *  evaluator's pool and worker). */
export type ArtifactKind = "module" | "gpu-module" | "gpu-library" | "model" | "graph" | "notices" | "terms" | "ort-glue"
  | "ort-wasm" | "practice-module" | "practice-threaded-module" | "practice-evaluator" | "practice-library"
  | "cpu-evaluator-library";

/** The manifest, or null when the site has no engine (`npm run engine` was not run). The browser asks the server for
 *  it each time (`no-cache`): a kept copy would name an earlier build after an update. The artifacts themselves are in
 *  folders named by their build or network, so they can stay cached. */
export async function loadManifest(): Promise<Manifest | null> {
  const response = await fetch("/engine/manifest.json", { cache: "no-cache" });
  return response.ok ? response.json() : null;
}

export const moduleOf = (manifest: Manifest) => manifest.artifacts.find(a => a.kind === "module");
/** Refuses a module whose protocol the site does not speak (protocol.ts, speaksProtocol): the CPU module and the GPU
 *  module. */
export function checkVersion(version: VersionReply): VersionReply {
  if (!speaksProtocol(version.protocol)) throw new Error(`engine protocol ${version.protocol}: this site speaks ${PROTOCOL}`);
  return version;
}
/** The CPU modules whose search is the site's, by SHA-256: its own, and the earlier ones of the same search. A review's
 *  mark, a review file and a share link name the module that made the review, so a review made with one of these is
 *  the site's engine's. */
export const searchModules = (manifest: Manifest) => {
  const m = moduleOf(manifest);
  return m ? [m.sha256, ...(m.sameSearchAs ?? [])] : [];
};
/** Whether a module, by its SHA-256 or the first hex digits of it (a share link's), searches as the site's. */
export const sameSearch = (manifest: Manifest, module: string) => !!module && searchModules(manifest).some(m => m.startsWith(module));
/** The engine's JavaScript library, which drives both modules (library.ts). */
export const libraryOf = (manifest: Manifest) => manifest.artifacts.find(a => a.kind === "gpu-library");
/** A network by its id. */
export const modelOf = (manifest: Manifest, id: string) => manifest.artifacts.find(a => a.kind === "model" && a.id === id);
/** The files that the GPU worker needs for the network `id`, beside the library: the GPU module, ONNX Runtime's glue
 *  script and WebAssembly, the network's graph, and the network itself. Null when one is missing. */
export function gpuFilesOf(manifest: Manifest, id: string) {
  const kind = (k: ArtifactKind) => manifest.artifacts.find(a => a.kind === k);
  const files = { module: kind("gpu-module"), glue: kind("ort-glue"), wasm: kind("ort-wasm"),
                  graph: manifest.artifacts.find(a => a.kind === "graph" && a.graphOf === id), model: modelOf(manifest, id) };
  return Object.values(files).every(Boolean) ? (files as { [K in keyof typeof files]: Artifact }) : null;
}
/** A size in MB (10^6 bytes), one decimal: what a download costs. */
export const megabytes = (bytes: number) => (bytes / 1e6).toFixed(1);

/** What `make` gives for `url`, made once for the page: a failed fetch, compile or check is tried again on the next
 *  start. */
function once<T>(cache: Map<string, Promise<T>>, url: string, make: () => Promise<T>): Promise<T> {
  let value = cache.get(url);
  if (!value) {
    value = make();
    value.catch(() => cache.delete(url));
    cache.set(url, value);
  }
  return value;
}

// A module, compiled once for the page and each of its workers. A compiled module can be posted to a worker, which
// then only instantiates it, and the browser keeps one copy of its code. Before, each worker fetched and compiled it.
const compiled = new Map<string, Promise<WebAssembly.Module>>();
export const compile = (url: string) => once(compiled, url, () => WebAssembly.compileStreaming(fetch(url)));

// A network, fetched and checked once for the page (artifacts.ts, fetchArtifact), as a Blob of its checked bytes. Each
// worker reads the bytes from the Blob, and a Blob posts to a worker without a copy. The page keeps it, so a start
// after an idle release (analysis/pool.ts) or a change back to an earlier network fetches and checks nothing. Before,
// each worker fetched the network and checked its SHA-256 itself, at each start.
const checkedFiles = new Map<string, Promise<Blob>>();
export const checked = (a: StoredArtifact) =>
  once(checkedFiles, a.url, () => fetchArtifact(a).then(bytes => new Blob([bytes as BlobPart])));

export class EngineWorker {
  readonly kind = "cpu" as const;
  private channel = new WorkerChannel<WorkerRequest>(new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }));

  /** Starts the manifest's module in the worker, through the engine's library (library.ts). Refuses a protocol that
   *  the site does not speak (checkVersion). */
  async init(manifest: Manifest): Promise<Timed<VersionReply>> {
    const module = moduleOf(manifest), library = libraryOf(manifest);
    if (!module || !library) throw new Error("the manifest lacks the engine module or its library");
    const t = await this.channel.send<VersionReply>({ type: "init", module: await compile(module.url), library: library.url }).done;
    checkVersion(t.reply);
    return t;
  }
  /** Loads a network from the manifest: the page fetches it and checks its SHA-256 once for all its workers
   *  (checked). */
  async loadModel(model: Artifact, settings?: Record<string, unknown>) {
    return this.channel.send<LoadModelReply>({ type: "model", model: await checked(model), name: model.id, settings }).done;
  }
  describe(q: PositionQuery) {
    return this.channel.send<DescribeReply>({ type: "call", request: { id: "d", action: "describe", ...q } }).done;
  }
  /** Every position of a game from the position after `from` moves, in one request (describe_game). */
  describeGame(q: PositionQuery, from = 0) {
    return this.channel.send<DescribeGameReply>({ type: "call", request: { id: "g", action: "describe_game", ...q, from } }).done;
  }
  play(q: PositionQuery, move: string) {
    return this.channel.send<PlayReply>({ type: "call", request: { id: "p", action: "play", ...q, move } }).done;
  }
  /** Analyses a position. With a slice, `onPartial` gets the results after each slice, and `stop` ends the search. */
  analyse(q: AnalysisQuery, onPartial?: (r: AnalysisReply, ms: number) => void) {
    const { id, done } = this.channel.send<AnalysisReply>({ type: q.slice ? "search" : "call", request: { id: "a", ...q } },
                                                          onPartial as (r: unknown, ms: number) => void);
    return { done, stop: () => this.channel.post({ type: "stop", id }) };
  }
  /** Ends the worker. The requests still waiting for a reply reject with Stopped. */
  terminate() { this.channel.terminate(); }
}
