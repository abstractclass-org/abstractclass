// The page's side of the practice bot (botWorker.ts, Hedge School's design 24): the bot in its own worker, in one form,
// sent GTP commands one at a time. The site chooses the form and gives its worker module, which calls serveBot (Hedge
// School: src/lib/practice/botForms.ts).
import { WorkerChannel } from "@abstractclass/engine/channel.ts";
import { checked, compile, modelOf, type ArtifactKind, type Manifest } from "@abstractclass/engine/client.ts";
import { gtpAnswer } from "./practice.ts";
import type { BotMode, BotRequest, ThreadedFiles } from "./botMessages.ts";

/** The practice bot in its own worker, in one form. `game` is the game's name in the bot's own commands
 *  (`enclosure`, `blueprints`), and `worker` the site's worker module. */
export class PracticeBot {
  private channel: WorkerChannel<BotRequest>;
  constructor(readonly game: string, readonly mode: BotMode, worker: Worker) {
    this.channel = new WorkerChannel<BotRequest>(worker);
  }

  /** Starts the bot with the network `network` and the seed `seed`. A threaded form takes its files (`threaded`). */
  async start(manifest: Manifest, network: string, seed: number, threaded?: ThreadedFiles): Promise<void> {
    const file = (kind: ArtifactKind) => manifest.artifacts.find(a => a.kind === kind);
    const library = file("practice-library"), model = modelOf(manifest, network);
    const module = file(this.mode === "single" ? "practice-module" : "practice-threaded-module");
    if (!library || !model || !module) throw new Error("the manifest lacks the practice bot's files");
    if (this.mode !== "single" && !threaded) throw new Error(`the bot's ${this.mode} form lacks its files`);
    const [compiled, checkedModel] = await Promise.all([compile(module.url), checked(model)]);
    gtpAnswer((await this.channel.send<string>({ type: "init", game: this.game, mode: this.mode, seed, threads: 1, ...threaded,
                                                 library: library.url, module: compiled, model: checkedModel }).done).reply);
  }

  /** A GTP command's answer. Throws with the bot's message when it refuses the command. */
  async command(line: string): Promise<string> {
    return gtpAnswer((await this.channel.send<string>({ type: "command", line }).done).reply);
  }

  /** Ends the worker, and its CPU evaluators with it. */
  terminate() { this.channel.terminate(); }
}
