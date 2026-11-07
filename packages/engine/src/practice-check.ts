// The check of the practice modules that fetch-engine.mjs runs at each engine update, in Node: each practice module of
// a site's static/engine must give KataGo's minPlayoutsPerThread the value 8. Hedge School's design 24, item 14 rests
// on it: the threaded bot searches with at most one thread for each 8 of a move's new playouts, so it searches as the
// one-thread bot below 16 visits, and from 16 visits it passes its setting by at most an eighth. KataGo's GTP setup
// gives the value when the config does not set it (the engine repository's katagame/cpp/program/setup.cpp), and no
// config of ours sets it. So a new release or config could change it, and only this check would see it.
//
// Each module starts a session (the network, then its game's start command) and answers kata-get-params. The threaded
// module's start evaluates no position, so its evaluator here refuses any use: the check needs no CPU workers.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Artifact, ArtifactKind, Manifest } from "./client.ts";
import { errorText } from "./errors.ts";
import type { PracticeLibrary } from "./library.ts";

const MIN_PLAYOUTS_PER_THREAD = 8;

/** A GTP reply's text: `= TEXT` gives TEXT. Else an error that names the command and gives the reply. */
function answer(command: string, reply: string): string {
  if (!reply.startsWith("=")) throw new Error(`${command} gave ${reply.trim()}`);
  return reply.slice(1).trim();
}

/** Checks a practice module's reply to kata-get-params. An error when the reply is a refusal, and an error with the
 *  value and design 24, item 14 when its minPlayoutsPerThread is not 8. */
export function checkMinPlayoutsPerThread(reply: string): void {
  const value = JSON.parse(answer("kata-get-params", reply)).minPlayoutsPerThread;
  if (value !== MIN_PLAYOUTS_PER_THREAD)
    throw new Error(`the practice bot has minPlayoutsPerThread ${value}, not ${MIN_PLAYOUTS_PER_THREAD}. ` +
                    `Hedge School's design 24, item 14 (docs/design/24-practice.md) rests on 8: the threaded bot's ` +
                    `threads at a move and its visits past the setting. Check the item before this release goes in.`);
}

/** An evaluator that refuses any use: the threaded module's start and kata-get-params evaluate no position. */
const noEvaluator = new Proxy({}, {
  get(_, key) {
    throw new Error(`the practice check evaluates no position, but the bot asked for its evaluator's ${String(key)}`);
  },
});

/** Checks each practice module of a site's static/engine (the one-thread and the threaded bot) with
 *  checkMinPlayoutsPerThread, from the site's folder (`root`) and its manifest, and logs a line for each. An error
 *  names the module. The threaded module needs JSPI (Node 24.21 has it with no flag). */
export async function checkPracticeModules(root: string, manifest: Manifest): Promise<void> {
  const ofKind = (kind: ArtifactKind) => manifest.artifacts.filter(a => a.kind === kind);
  const read = (a: Artifact) => readFileSync(join(root, "static", a.url));
  const modules = [...ofKind("practice-module"), ...ofKind("practice-threaded-module")];
  if (modules.length === 0) return;
  // The smallest network, since the setting does not depend on the network.
  const [library] = ofKind("practice-library"), [model] = ofKind("model").sort((a, b) => a.bytes - b.bytes);
  if (!library || !model) throw new Error("static/engine has practice modules but no practice library or network");
  const lib = await import(pathToFileURL(join(root, "static", library.url)).href) as PracticeLibrary;
  const network = read(model);
  for (const m of modules) {
    try {
      const module = await WebAssembly.compile(read(m));
      // The threaded bot with two threads, the fewest of its form. The setting does not depend on them.
      const threads = m.kind === "practice-threaded-module" ? 2 : 1;
      const bot = threads > 1 ? await lib.createBatchedPracticeBot(module, noEvaluator, { maxBatch: threads })
        : await lib.createPracticeBot(module);
      // The game's start command, from the module's own list: enclosure-start, blueprints-start.
      const commands = answer("list_commands", await bot.command("list_commands")).split(/\s+/);
      const start = commands.find(c => c.endsWith("-start"));
      if (!start) throw new Error("list_commands names no start command");
      await bot.setModel(network);
      answer(start, await bot.command(`${start} 1 ${threads}`)); // SEED THREADS
      checkMinPlayoutsPerThread(await bot.command("kata-get-params"));
    } catch (e) {
      throw new Error(`${m.id}: ${errorText(e)}`, { cause: e });
    }
    console.log(`${m.id}: minPlayoutsPerThread ${MIN_PLAYOUTS_PER_THREAD}, as design 24, item 14 needs`);
  }
}
