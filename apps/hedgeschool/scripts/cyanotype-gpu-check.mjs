// The check of Cyanotype's GPU paths (its design 33, "The engine's files", item 4), on Cyanotype's preview: the review,
// the Analysis board and Practice, as scripts/gpu-check.mjs gives them. The review of On reviews the test game's first
// turns (tests/cyanotype-review.ts, LIVE_TURNS) at Lite. Run it in apps/hedgeschool:
//
//   CYANOTYPE_BASE_URL=http://127.0.0.1:4187 node scripts/cyanotype-gpu-check.mjs [--on | --auto] [--cpu]
//
// A run with WebGPU is a GPU-path check: it starts only through `scripts/machine run --gpu` (gpu-check.mjs).
import { ENGINE_KEY } from "../../cyanotype/src/lib/site.ts";
import { CYANOTYPE, LITE, LIVE_TURNS, pasteRecord, testRecord } from "../tests/cyanotype-review.ts";
import { gpuCheck } from "./gpu-check.mjs";

await gpuCheck({
  name: "Cyanotype", variable: "CYANOTYPE_BASE_URL", base: CYANOTYPE, engineKey: ENGINE_KEY, lite: LITE,
  liveTurns: LIVE_TURNS, record: testRecord, paste: pasteRecord, bot: "Stamp Duty",
  /** On the GPU (abscls-8tl1.64-gpu2, GPU On): the review of 3 turns took 34 s, the board 12 s, and the bot's first
   *  turn 1.4 s. Auto's test needs about 20 s of the GPU after its files load. Off the GPU (--cpu, 2 threads): the
   *  review took 113 to 151 s, the board 62 to 67 s, and the bot's first turn 4.9 to 6.6 s. */
  waits: {
    cpu: { autoTest: 60_000, review: 300_000, board: 180_000, practice: 120_000 },
    gpu: { autoTest: 120_000, review: 90_000, board: 60_000, practice: 60_000 },
  },
  /** Under the job's --expect (8 minutes on the GPU). */
  budget: { cpu: 12, gpu: 7.5 },
});
