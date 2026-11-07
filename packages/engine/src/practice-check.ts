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
import type { Artifact, Manifest } from "./client.ts";
import type { PracticeLibrary } from "./library.ts";

export const MIN_PLAYOUTS_PER_THREAD = 8;

/** The value of minPlayoutsPerThread in a practice module's reply to kata-get-params (`reply`, "= {JSON}" or
 *  "? ERROR"), when it is 8. Else an error that names the module (its id in the lock), the value and design 24,
 *  item 14. */
export function checkMinPlayouts(id: string, reply: string): number {
  if (!reply.startsWith("=")) throw new Error(`${id}: kata-get-params gave ${reply.trim()}`);
  const value = JSON.parse(reply.slice(1)).minPlayoutsPerThread;
  if (value !== MIN_PLAYOUTS_PER_THREAD)
    throw new Error(`${id}: the practice bot has minPlayoutsPerThread ${value}, not ${MIN_PLAYOUTS_PER_THREAD}. ` +
                    `Hedge School's design 24, item 14 (docs/design/24-practice.md) rests on 8: the threaded bot's ` +
                    `threads at a move and its visits past the setting. Check the item before this release goes in.`);
  return value;
}

/** An evaluator that refuses any use: the threaded module's start and kata-get-params evaluate no position. */
const noEvaluator = new Proxy({}, {
  get(_, key) {
    throw new Error(`the practice check evaluates no position, but the bot asked for its evaluator's ${String(key)}`);
  },
});

/** Checks each practice module of a site's static/engine (the one-thread and the threaded bot) with checkMinPlayouts,
 *  from the site's folder (`root`) and its manifest. Returns a line for each module that passed. The threaded module
 *  needs JSPI (Node 24.21 and later have it with no flag). */
export async function checkPracticeModules(root: string, manifest: Manifest): Promise<string[]> {
  const files = (kind: string) => manifest.artifacts.filter(a => a.kind === kind);
  const bytes = (a: Artifact) => readFileSync(join(root, "static", a.url));
  const modules = [...files("practice-module"), ...files("practice-threaded-module")];
  if (modules.length === 0) return [];
  const [library] = files("practice-library"), [model] = files("model");
  if (!library || !model) throw new Error("static/engine has practice modules but no practice library or network");
  const lib = await import(pathToFileURL(join(root, "static", library.url)).href) as PracticeLibrary;
  const network = bytes(model);
  const lines = [];
  for (const m of modules) {
    const module = await WebAssembly.compile(bytes(m));
    const threaded = m.kind === "practice-threaded-module";
    const bot = threaded ? await lib.createBatchedPracticeBot(module, noEvaluator, { maxBatch: 2 })
      : await lib.createPracticeBot(module);
    // The game's start command, from the module's own list: enclosure-start, blueprints-start.
    const start = (await bot.command("list_commands")).split(/\s+/).find(c => c.endsWith("-start"));
    if (!start) throw new Error(`${m.id}: list_commands names no start command`);
    await bot.setModel(network);
    const started = await bot.command(threaded ? `${start} 1 2` : `${start} 1`);
    if (!started.startsWith("=")) throw new Error(`${m.id}: ${start} gave ${started.trim()}`);
    const value = checkMinPlayouts(m.id, await bot.command("kata-get-params"));
    lines.push(`${m.id}: minPlayoutsPerThread ${value}, as design 24, item 14 needs`);
  }
  return lines;
}
