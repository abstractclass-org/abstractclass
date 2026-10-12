// The messages between the page and an engine worker (worker.ts, client.ts). The worker's replies are every worker's
// (channel.ts).
import type { StoredArtifact } from "./artifacts.ts";
export type { ChannelReply as WorkerReply } from "./channel.ts";

export type WorkerRequest =
  | { type: "init"; id: number; module: WebAssembly.Module; library: string } // the module compiled, the library's URL
  | { type: "model"; id: number; model: StoredArtifact; name: string; settings?: Record<string, unknown> }
  | { type: "call"; id: number; request: object }
  | { type: "search"; id: number; request: object }
  | { type: "stop"; id: number };
