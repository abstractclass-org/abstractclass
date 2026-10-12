// The messages between the page and an engine worker (worker.ts, client.ts).

export type WorkerRequest =
  | { type: "init"; id: number; module: WebAssembly.Module; library: string } // the module compiled, the library's URL
  | { type: "model"; id: number; url: string; name: string; settings?: Record<string, unknown> }
  | { type: "call"; id: number; request: object }
  | { type: "search"; id: number; request: object }
  | { type: "stop"; id: number };

export type WorkerReply =
  | { type: "reply"; id: number; reply: unknown; ms: number; memory: number }
  | { type: "partial"; id: number; reply: unknown; ms: number }
  | { type: "error"; id: number; message: string };
