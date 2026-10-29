// The practice bot in a Web Worker (Hedge School's design 24): the engine's practice bot (practice_bot.mjs), one GTP
// command at a time, in order. A site's worker module calls serveBot, with an evaluator for each form of the threaded
// bot that its engine has (Hedge School's: the network on the GPU, or on CPU workers). The bot with one search thread
// needs none, and no JSPI: it runs the network in its own module, on the CPU.
import { bytesOf } from "@abstractclass/engine/artifacts.ts";
import type { PracticeLibrary } from "@abstractclass/engine/library.ts";
import { errorText } from "@abstractclass/engine/errors.ts";
import type { BotInit, BotReply, BotRequest } from "./botMessages.ts";

/** The threaded bot's evaluator for a form, from the start's files and the network's bytes. */
export type Evaluator = (m: BotInit, model: Uint8Array) => Promise<unknown>;

/** Answers the page's requests in this worker: the start, then the GTP commands. */
export function serveBot(evaluators: Partial<Record<"gpu" | "cpu", Evaluator>> = {}) {
  let bot: { command(line: string): string | Promise<string> } | null = null;
  let queue: Promise<void> = Promise.resolve();
  const post = (m: BotReply) => self.postMessage(m);
  const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;

  async function init(m: BotInit): Promise<string> {
    const library = await load<PracticeLibrary>(m.library);
    const model = await bytesOf(m.model); // checked by the page (client.ts, checked)
    if (m.mode === "single") {
      const one = await library.createPracticeBot(m.module);
      one.setModel(model);
      bot = one;
      return one.command(`${m.game}-start ${m.seed}`);
    }
    const evaluate = evaluators[m.mode];
    if (!evaluate) throw new Error(`the bot's ${m.mode} form lacks its files`);
    const threaded = await library.createBatchedPracticeBot(m.module, await evaluate(m, model), { maxBatch: m.threads });
    await threaded.setModel(model);
    bot = threaded;
    return threaded.command(`${m.game}-start ${m.seed} ${m.threads}`);
  }

  self.onmessage = (event: MessageEvent<BotRequest>) => {
    const m = event.data;
    queue = queue.then(async () => {
      const t0 = performance.now();
      const reply = m.type === "init" ? await init(m)
        : bot ? await bot.command(m.line) : (() => { throw new Error("the practice bot has not started"); })();
      post({ type: "reply", id: m.id, reply, ms: performance.now() - t0, memory: 0 });
    }).catch(e => post({ type: "error", id: m.id, message: errorText(e) }));
  };
}
