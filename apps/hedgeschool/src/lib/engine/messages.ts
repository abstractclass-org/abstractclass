// The messages between the page and an engine worker (worker.ts, client.ts). The worker's replies are every worker's
// (channel.ts).
export type { ChannelReply as WorkerReply } from "./channel.ts";

export type WorkerRequest =
  | { type: "init"; id: number; module: WebAssembly.Module; library: string } // the module compiled, the library's URL
  | { type: "model"; id: number; model: Blob; name: string; settings?: Record<string, unknown> } // checked by the page
  | { type: "call"; id: number; request: object }
  | { type: "search"; id: number; request: object }
  | { type: "stop"; id: number };
