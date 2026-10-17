// The messages between the page and the practice bot's worker (botWorker.ts, bot.ts). The worker's replies are every
// engine worker's (channel.ts): a command's reply is the bot's GTP response.
import type { StoredArtifact } from "#lib/engine/artifacts.ts";
export type { ChannelReply as BotReply } from "#lib/engine/channel.ts";

/** Where the bot's network runs (design 24): on the GPU or on CPU workers, through the threaded bot (JSPI), or in the
 *  bot's one search thread. */
export type BotMode = "gpu" | "cpu" | "single";

export interface BotInit {
  type: "init";
  id: number;
  mode: BotMode;
  seed: number; // the search's and the symmetries' seed (`enclosure-start`)
  threads: number; // the threaded bot's search threads, and its largest batch
  library: string; // practice_bot.mjs
  module: WebAssembly.Module; // the bot's module for the mode, compiled by the page
  model: StoredArtifact; // the network's file, which the bot (and each CPU evaluator) reads
  gpu?: { library: string; ortGlue: string; ortWasm: StoredArtifact; graph: StoredArtifact }; // gpu_engine.mjs, ONNX Runtime, the graph
  cpu?: { library: string; worker: string; module: WebAssembly.Module; workers: number }; // cpu_evaluator.mjs, its worker, enclosure-eval.wasm
}

export type BotRequest = BotInit | { type: "command"; id: number; line: string };
