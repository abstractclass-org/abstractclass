// The messages between the page and the practice bot's worker (botWorker.ts, bot.ts). The worker's replies are every
// engine worker's (channel.ts): a command's reply is the bot's GTP response.
import type { StoredArtifact } from "@abstractclass/engine/artifacts.ts";
export type { ChannelReply as BotReply } from "@abstractclass/engine/channel.ts";

/** Where the bot's network runs (Hedge School's design 24): on the GPU or on CPU workers, through the threaded bot
 *  (JSPI), or in the bot's one search thread. An engine with no threaded bot runs in the last form only. */
export type BotMode = "gpu" | "cpu" | "single";

/** The threaded bot's files: its search threads (and its largest batch), and its evaluator's files for the form. */
export interface ThreadedFiles {
  threads: number;
  gpu?: { library: string; ortGlue: string; ortWasm: StoredArtifact; graph: StoredArtifact }; // gpu_engine.mjs, ONNX Runtime, the graph
  cpu?: { library: string; worker: string; module: WebAssembly.Module; workers: number }; // cpu_evaluator.mjs, its worker, the evaluator's module
}

export interface BotInit extends ThreadedFiles {
  type: "init";
  id: number;
  game: string; // the game's name in the bot's own commands: `enclosure-start`, `blueprints-start`
  mode: BotMode;
  seed: number; // the search's and the symmetries' seed (the start command's)
  library: string; // practice_bot.mjs
  module: WebAssembly.Module; // the bot's module for the mode, compiled by the page
  model: Blob; // the network's file, checked by the page (client.ts, checked), which the bot (and each CPU evaluator) reads
}

export type BotRequest = BotInit | { type: "command"; id: number; line: string };
