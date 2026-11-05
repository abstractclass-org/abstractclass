// Stamp Duty's practice bot in its Web Worker (docs/design/33-cyanotype.md, "Practice against Stamp Duty"): the
// practice bot's worker of @abstractclass/practice, in its one form, which needs no evaluator: one search thread, with
// the network in the bot's own module, on the CPU. Blueprints' release has no threaded bot yet (abscls-wqdl,
// abscls-8tl1.29), so this worker loads no ONNX Runtime and no WebGPU.
import { serveBot } from "@abstractclass/practice/botWorker.ts";

serveBot();
