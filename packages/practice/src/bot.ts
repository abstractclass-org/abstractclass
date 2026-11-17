// The page's side of the practice bot (botWorker.ts, Hedge School's design 24): the bot in its own worker, in one form,
// sent GTP commands one at a time. botForms.ts chooses the form and gives the worker module (botFormsWorker.ts), which
// calls serveBot.
import { WorkerChannel } from "@abstractclass/engine/channel.ts";
import { checked, compile, modelOf, type ArtifactKind, type Manifest } from "@abstractclass/engine/client.ts";
import { sizesOption } from "@abstractclass/engine/library.ts";
import { gtpAnswer } from "./practice.ts";
import type { BotMode, BotRequest, ThreadedFiles } from "./botMessages.ts";

/** The practice bot in its own worker, in one form. `game` is the game's name in the bot's own commands
 *  (`enclosure`, `blueprints`), and `worker` the bot's worker module (botForms.ts). */
export class PracticeBot {
  readonly game: string;
  readonly mode: BotMode | null; // where the bot runs: null for a bot that started in no form (failed)
  private channel: WorkerChannel<BotRequest> | null;
  private failure: unknown = null; // the error of a start in no form (failed)
  constructor(game: string, mode: BotMode | null, worker: Worker | null) {
    this.game = game;
    this.mode = mode;
    this.channel = worker && new WorkerChannel<BotRequest>(worker);
  }

  /** A bot that started in no form, with the error of its start: each command fails with it, so that the game stops
   *  as on a later failure (game.svelte.ts, fail). It has no form, and the game's data names none (Hedge School's
   *  design 25). */
  static failed(game: string, failure: unknown): PracticeBot {
    const bot = new PracticeBot(game, null, null);
    bot.failure = failure;
    return bot;
  }

  /** Starts the bot with the network `network` and the seed `seed`. A threaded form takes its files (`threaded`). */
  async start(manifest: Manifest, network: string, seed: number, threaded?: ThreadedFiles): Promise<void> {
    const { mode, channel } = this.live();
    const file = (kind: ArtifactKind) => manifest.artifacts.find(a => a.kind === kind);
    const library = file("practice-library"), model = modelOf(manifest, network);
    const module = file(mode === "single" ? "practice-module" : "practice-threaded-module");
    if (!library || !model || !module) throw new Error("the manifest lacks the practice bot's files");
    if (mode !== "single" && !threaded) throw new Error(`the bot's ${mode} form lacks its files`);
    const [compiled, checkedModel] = await Promise.all([compile(module.url), checked(model)]);
    gtpAnswer((await channel.send<string>({
      type: "init", game: this.game, mode, seed, threads: 1, ...threaded, library: library.url, module: compiled,
      model: checkedModel, ...sizesOption(manifest) }).done).reply);
  }

  /** A GTP command's answer. Throws with the bot's message when it refuses the command. */
  async command(line: string): Promise<string> {
    return gtpAnswer((await this.live().channel.send<string>({ type: "command", line }).done).reply);
  }

  /** Ends the worker, and its CPU evaluators with it. */
  terminate() { this.channel?.terminate(); }

  /** The bot's form and its worker's channel. A bot that started in no form has neither: it throws the error of its
   *  start. */
  private live(): { mode: BotMode; channel: WorkerChannel<BotRequest> } {
    if (!this.mode || !this.channel) throw this.failure;
    return { mode: this.mode, channel: this.channel };
  }
}
