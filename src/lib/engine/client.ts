// The page's side of one engine worker: a promise for each request, and partial results while a search runs
// (channel.ts). Also the manifest of the engine's artifacts, and what the site looks up in it.
import type { StoredArtifact } from "./artifacts.ts";
import { WorkerChannel, type Timed } from "./channel.ts";
import type { WorkerRequest } from "./messages.ts";
import {
  PROTOCOL, PROTOCOL_REPORTED, type AnalysisQuery, type AnalysisReply, type DescribeReply, type LoadModelReply,
  type PlayReply, type PositionQuery, type VersionReply,
} from "./protocol.ts";

export { EngineError, Stopped, type Timed } from "./channel.ts";

/** The engine's artifacts that the site was built with (static/engine/manifest.json, scripts/fetch-engine.mjs). */
export interface Manifest { artifacts: Artifact[] }
export interface Artifact extends StoredArtifact {
  id: string; kind: ArtifactKind; interface: string | null; released: boolean;
  displayName?: string; // a network's name (the release's manifest): "HedgeFund 0.1 Lite"
  graphOf?: string; // a graph's network (its model's id)
  download: number; // the bytes a browser downloads for it: `bytes`, or the compressed parts'
}
/** The CPU module, the GPU module and its JavaScript half, a network, a network's ONNX graph, the notices (the licences
 *  of the works of others), the terms (the engine's own: LICENSE.txt), and ONNX Runtime Web's glue script and
 *  WebAssembly. */
export type ArtifactKind = "module" | "gpu-module" | "gpu-library" | "model" | "graph" | "notices" | "terms" | "ort-glue"
  | "ort-wasm";

/** The manifest, or null when the site has no engine (`npm run engine` was not run). The browser asks the server for
 *  it each time (`no-cache`): a kept copy would name an earlier build after an update. The artifacts themselves are in
 *  folders named by their build or network, so they can stay cached. */
export async function loadManifest(): Promise<Manifest | null> {
  const response = await fetch("/engine/manifest.json", { cache: "no-cache" });
  return response.ok ? response.json() : null;
}

export const moduleOf = (manifest: Manifest) => manifest.artifacts.find(a => a.kind === "module");
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

// A module, compiled once for the page and each of its workers. A compiled module can be posted to a worker, which
// then only instantiates it, and the browser keeps one copy of its code. Before, each worker fetched and compiled it.
const compiled = new Map<string, Promise<WebAssembly.Module>>();
export function compile(url: string): Promise<WebAssembly.Module> {
  let module = compiled.get(url);
  if (!module) {
    module = WebAssembly.compileStreaming(fetch(url));
    module.catch(() => compiled.delete(url)); // a failed fetch or compile is tried again on the next start
    compiled.set(url, module);
  }
  return module;
}

export class EngineWorker {
  readonly kind = "cpu" as const;
  private channel = new WorkerChannel<WorkerRequest>(new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }));

  /** Starts the manifest's module in the worker, through the engine's library (library.ts). Refuses any protocol
   *  version but the one this site was written for. */
  async init(manifest: Manifest): Promise<Timed<VersionReply>> {
    const module = moduleOf(manifest), library = libraryOf(manifest);
    if (!module || !library) throw new Error("the manifest lacks the engine module or its library");
    const t = await this.channel.send<VersionReply>({ type: "init", module: await compile(module.url), library: library.url }).done;
    if (!PROTOCOL_REPORTED.includes(t.reply.protocol))
      throw new Error(`engine protocol ${t.reply.protocol}: this site speaks ${PROTOCOL}`);
    return t;
  }
  /** Loads a network from the manifest: the worker fetches it and checks its SHA-256 (artifacts.ts). */
  loadModel(model: Artifact, settings?: Record<string, unknown>) {
    return this.channel.send<LoadModelReply>({ type: "model", model, name: model.id, settings }).done;
  }
  describe(q: PositionQuery) {
    return this.channel.send<DescribeReply>({ type: "call", request: { id: "d", action: "describe", ...q } }).done;
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
