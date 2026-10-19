// The messages of an engine worker, both sides: the CPU worker (worker.ts, client.ts) and the GPU worker (gpuWorker.ts,
// gpuClient.ts) speak the same way. The page sends a request with an id and gets a promise for its reply; a search in
// slices posts its results after each slice; a worker that ends or fails rejects every request still waiting.
import { isError, type CheckReason, type ErrorReply } from "./protocol.ts";

export interface Timed<T> { reply: T; ms: number; memory: number }

/** What a worker posts: a request's reply (with its time and the worker's memory), a search's results so far, or a
 *  failure. */
export type ChannelReply =
  | { type: "reply"; id: number; reply: unknown; ms: number; memory: number }
  | { type: "partial"; id: number; reply: unknown; ms: number }
  | { type: "error"; id: number; message: string };

/** An error reply from the engine. `field` names the request's field at fault, as the protocol gives it, and
 *  `reasons` why a position could not occur. */
export class EngineError extends Error {
  readonly error: string;
  readonly field?: string;
  readonly reasons?: CheckReason[];
  constructor({ error, field, reasons }: ErrorReply) {
    super(`${error}${field ? ` (${field})` : ""}`);
    this.error = error;
    this.field = field;
    this.reasons = reasons;
  }
}

/** The rejection of a request whose worker ended before it replied (terminate). */
export class Stopped extends Error {
  constructor() { super("the engine worker ended"); }
}

type Pending = { resolve: (t: Timed<unknown>) => void; reject: (e: Error) => void; partial?: (r: unknown, ms: number) => void };
export type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

/** The page's side of one worker: a promise for each request. */
export class WorkerChannel<Request extends { id: number }> {
  private pending = new Map<number, Pending>();
  private nextId = 0;
  private worker: Worker;
  private ended = false;

  constructor(worker: Worker) {
    this.worker = worker;
    worker.onmessage = (event: MessageEvent<ChannelReply>) => {
      const m = event.data;
      const p = this.pending.get(m.id);
      if (!p) return;
      if (m.type === "partial") { p.partial?.(m.reply, m.ms); return; }
      this.pending.delete(m.id);
      if (m.type === "error") p.reject(new Error(m.message));
      else if (isError(m.reply)) p.reject(new EngineError(m.reply));
      else p.resolve({ reply: m.reply, ms: m.ms, memory: m.memory });
    };
    // The worker failed outside a request (its script did not load, or it ran out of memory): every request fails.
    worker.onerror = (event: ErrorEvent) => {
      event.preventDefault();
      this.rejectAll(new Error(`the engine worker failed: ${event.message || "no message"}`));
    };
  }

  /** Sends a request. `partial` gets a search's results after each slice. After terminate, the request rejects with
   *  Stopped: a network load sends only once the page has checked the network (client.ts, checked). */
  send<T>(m: DistributiveOmit<Request, "id">, partial?: (r: unknown, ms: number) => void): { id: number; done: Promise<Timed<T>> } {
    const id = this.nextId++;
    const done = new Promise<Timed<T>>((resolve, reject) => {
      if (this.ended) { reject(new Stopped()); return; }
      this.pending.set(id, { resolve: resolve as (t: Timed<unknown>) => void, reject, partial });
      this.worker.postMessage({ ...m, id });
    });
    return { id, done };
  }

  /** Posts a message that has no reply, such as a stop. */
  post(m: Request) { this.worker.postMessage(m); }

  /** Ends the worker. The requests still waiting for a reply reject with Stopped. */
  terminate() {
    this.ended = true;
    this.worker.terminate();
    this.rejectAll(new Stopped());
  }

  private rejectAll(e: Error) {
    for (const p of this.pending.values()) p.reject(e);
    this.pending.clear();
  }
}

/** The worker's side of a search in slices (the protocol's `slice`): the results after each slice go to `partial`, then
 *  the search goes on with "continue", or ends with "terminate" once `stopped()` says so. Between slices the worker
 *  yields, so that a stop message can arrive. Returns the last reply. */
export async function searchInSlices(request: object, qid: string, call: (request: object) => unknown,
                                     partial: (reply: unknown) => void, stopped: () => boolean): Promise<unknown> {
  let reply = (await call({ ...request, id: qid })) as { isDuringSearch?: boolean };
  while (reply.isDuringSearch) {
    partial(reply);
    await new Promise(resolve => setTimeout(resolve, 0));
    reply = (await call(stopped() ? { id: qid, action: "terminate", terminateId: qid } : { id: qid, action: "continue" })) as typeof reply;
  }
  return reply;
}
