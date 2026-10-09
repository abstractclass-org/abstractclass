// The page's side of one engine worker: a promise for each request, and partial results while a search runs.
import type { WorkerReply, WorkerRequest } from "./messages.ts";
import {
  PROTOCOL_MAJOR, isError, type AnalysisQuery, type AnalysisReply, type DescribeReply, type LoadModelReply,
  type PlayReply, type PositionQuery, type VersionReply,
} from "./protocol.ts";

export interface Timed<T> { reply: T; ms: number; memory: number }

/** The engine's artifacts that the site was built with (static/engine/manifest.json, scripts/fetch-engine.mjs). */
export interface Manifest {
  artifacts: { id: string; kind: "module" | "model"; interface: string | null; url: string; sha256: string; bytes: number; released: boolean }[];
}

type Pending = { resolve: (t: Timed<unknown>) => void; reject: (e: Error) => void; partial?: (r: unknown, ms: number) => void };

export class EngineWorker {
  private worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  private pending = new Map<number, Pending>();
  private nextId = 0;

  constructor() {
    this.worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      const m = event.data;
      const p = this.pending.get(m.id);
      if (!p) return;
      if (m.type === "partial") { p.partial?.(m.reply, m.ms); return; }
      this.pending.delete(m.id);
      if (m.type === "error") p.reject(new Error(m.message));
      else if (isError(m.reply)) p.reject(new Error(`${m.reply.error}${m.reply.field ? ` (${m.reply.field})` : ""}`));
      else p.resolve({ reply: m.reply, ms: m.ms, memory: m.memory });
    };
  }

  private send<T>(m: DistributiveOmit<WorkerRequest, "id">, partial?: (r: unknown, ms: number) => void): { id: number; done: Promise<Timed<T>> } {
    const id = this.nextId++;
    const done = new Promise<Timed<T>>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (t: Timed<unknown>) => void, reject, partial });
      this.worker.postMessage({ ...m, id } as WorkerRequest);
    });
    return { id, done };
  }

  /** Loads the module. Refuses a protocol whose major version this site does not know. */
  async init(moduleUrl: string): Promise<Timed<VersionReply>> {
    const t = await this.send<VersionReply>({ type: "init", moduleUrl }).done;
    const major = Number(t.reply.protocol.split(".")[0]);
    if (major !== PROTOCOL_MAJOR) throw new Error(`engine protocol ${t.reply.protocol}: this site speaks ${PROTOCOL_MAJOR}.x`);
    return t;
  }
  loadModel(url: string, name: string, settings?: Record<string, unknown>) {
    return this.send<LoadModelReply>({ type: "model", url, name, settings }).done;
  }
  describe(q: PositionQuery) {
    return this.send<DescribeReply>({ type: "call", request: { id: "d", action: "describe", ...q } }).done;
  }
  play(q: PositionQuery, move: string) {
    return this.send<PlayReply>({ type: "call", request: { id: "p", action: "play", ...q, move } }).done;
  }
  /** Analyses a position. With a slice, `onPartial` gets the results after each slice, and `stop` ends the search. */
  analyse(q: AnalysisQuery, onPartial?: (r: AnalysisReply, ms: number) => void) {
    const { id, done } = this.send<AnalysisReply>({ type: q.slice ? "search" : "call", request: { id: "a", ...q } },
                                                  onPartial as (r: unknown, ms: number) => void);
    return { done, stop: () => this.worker.postMessage({ type: "stop", id } satisfies WorkerRequest) };
  }
  terminate() { this.worker.terminate(); }
}

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;
