// The check of the practice modules that fetch-engine.mjs runs at each engine update, in Node: each practice module of
// a site's static/engine must give KataGo's minPlayoutsPerThread the value 8. Hedge School's design 24, item 14 rests
// on it: the threaded bot searches with at most one thread for each 8 of a move's new playouts, so it searches as the
// one-thread bot below 16 visits, and from 16 visits it passes its setting by at most an eighth. KataGo's GTP setup
// gives the value when the config does not set it (the engine repository's katagame/cpp/program/setup.cpp), and no
// config of ours sets it. So a new release or config could change it, and only this check would see it.
//
// The same session checks the game's komi cap. Each site's record copies it as MAX_RECORD_KOMI (Hedge School's design
// 24, item 15): Enclosure's Rules::MAX_USER_KOMI, and Blueprints' from its MAX_BOARD_LEN and SCORE_SCALE (the engine
// repository's katagame/cpp/game/rules.h). The site's reader refuses a record, a board's link or an analysis file
// beyond it. The module's GTP `komi` (KataGo's) takes a komi from -MAX_USER_KOMI to MAX_USER_KOMI in whole or half
// points, and refuses any other. So the module must take the site's limit either way, and refuse half a point past it.
// The analysis modules (the CPU and the GPU module) are not run here: the step takes them from the practice modules'
// engine commit, so they have the same cap (lock-check.ts, checkOneEngineCommit).
//
// Each module starts a session (the network, then its game's start command) and answers kata-get-params. The threaded
// module's start evaluates no position, so its evaluator here refuses any use but its sizes: the check needs no CPU
// workers.
//
// Then the step plays Practice's CPU form (checkThreadedBot): the threaded bot with its network on the CPU evaluator's
// workers, as the page starts it on the CPU (packages/practice/src/botForms.ts). The lock takes the bot, the evaluator
// and the evaluator's two libraries as separate files, and its `sizes` by hand, so a bot and an evaluator that do not
// compute the same network could pass every other check: a wrong size traps or plays another move with no message
// (lock-check.ts). The one-thread bot runs the network in its own module, so it is the reference. At 1 visit, with the
// same seed, both bots play the network's own move, and they played the same moves on both sites' locks from the
// standard start and from a set-up start. From 4 visits they part at some moves with the right files, so the check
// plays 1 visit. With the other site's sizes, Cyanotype's threaded bot played another move from the first, and Hedge
// School's evaluator trapped. But at 1 visit the bot sends the evaluator one position at a time, and the moves show
// only the policy: one policy channel too many passed 30 moves on both sites, and one too few on Hedge School passed
// 10. So the evaluator also evaluates the bot's first batch again with each row twice (checkingRows). The bot and the
// evaluator place each row by the evaluator's sizes, so a wrong size gives the second copy other outputs. With the
// right files the copies differed by at most 2e-6. With each wrong size tried, a board one too small or one channel
// too few or too many, the policy differed by 15 to 29.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import type { Artifact, ArtifactKind, Manifest } from "./client.ts";
import { errorText } from "./errors.ts";
import { sizesOption, type CpuEvaluatorLibrary, type NetworkSizes, type PracticeLibrary } from "./library.ts";
import { positionQuery } from "./protocol.ts";

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

/** Checks that a module's komi cap is `max`, the site's MAX_RECORD_KOMI: `send` sends GTP's `komi K` and gives the
 *  reply. The module must take K = max and -max, and refuse half a point past each, the next komi that a record can
 *  give, with KataGo's refusal for a komi past the cap ("? unacceptable komi"). Another refusal there says nothing
 *  about the cap, so it stops the check too. An error says which komi the module took or refused, and what to
 *  change. */
export async function checkKomiCap(max: number, send: (value: number) => string | Promise<string>): Promise<void> {
  const fix = "Make the site's MAX_RECORD_KOMI (src/lib/game/record.ts) the engine's Rules::MAX_USER_KOMI, and check " +
              "the Notation page's Komi row, before this release goes in.";
  for (const value of [max, -max]) {
    const reply = await send(value);
    if (!reply.startsWith("="))
      throw new Error(`the practice bot refuses komi ${value}, which the site's MAX_RECORD_KOMI ${max} takes ` +
                      `(${reply.trim()}). ${fix}`);
  }
  for (const value of [max + 0.5, -max - 0.5]) {
    const reply = await send(value);
    if (reply.startsWith("="))
      throw new Error(`the practice bot takes komi ${value}, past the site's MAX_RECORD_KOMI ${max}. ${fix}`);
    if (!/^\?\s*unacceptable komi\s*$/.test(reply))
      throw new Error(`the practice bot gives ${reply.trim()} for komi ${value}, not KataGo's refusal of a komi past ` +
                      `its cap ("? unacceptable komi"), so the check cannot tell the cap.`);
  }
}

/** An evaluator that refuses any use: the threaded module's start and kata-get-params evaluate no position. It gives
 *  only the network's sizes (the manifest's, none for Enclosure's), which Blueprints' library reads when the bot starts
 *  (gpu_engine.mjs, createBatchRunner), as a real evaluator gives them (library.ts, sizesOption). */
export const noEvaluator = (sizes?: NetworkSizes) => new Proxy({}, {
  get(_, key) {
    if (key === "sizes") return sizes;
    throw new Error(`the practice check evaluates no position, but the bot asked for its evaluator's ${String(key)}`);
  },
});

/** The game's start command, from a practice bot's own list (list_commands' reply): enclosure-start, blueprints-start.
 *  An error when the list names none. */
function startCommand(reply: string): string {
  const start = answer("list_commands", reply).split(/\s+/).find(c => c.endsWith("-start"));
  if (!start) throw new Error("list_commands names no start command");
  return start;
}

/** The practice library and the smallest network of a site's static/engine, with `read`, which reads a file of it, and
 *  `url`, its file URL. */
async function practiceFiles(root: string, manifest: Manifest) {
  const ofKind = (kind: ArtifactKind) => manifest.artifacts.filter(a => a.kind === kind);
  const read = (a: Artifact) => readFileSync(join(root, "static", a.url));
  const url = (a: Artifact) => pathToFileURL(join(root, "static", a.url));
  const [library] = ofKind("practice-library"), [model] = ofKind("model").sort((a, b) => a.bytes - b.bytes);
  if (!library || !model) throw new Error("static/engine has practice modules but no practice library or network");
  const lib = await import(url(library).href) as PracticeLibrary;
  return { ofKind, read, url, lib, model, network: read(model) };
}

/** Checks each practice module of a site's static/engine (the one-thread and the threaded bot) with
 *  checkMinPlayoutsPerThread, and with checkKomiCap against `maxKomi` (the site's MAX_RECORD_KOMI), from the site's
 *  folder (`root`) and its manifest, and logs a line for each. With no practice module, it logs that it checked
 *  neither. An error names the module. The threaded module needs JSPI (Node 24.21 has it with no flag). */
export async function checkPracticeModules(root: string, manifest: Manifest, maxKomi: number): Promise<void> {
  const modules = manifest.artifacts.filter(a => a.kind === "practice-module" || a.kind === "practice-threaded-module");
  if (modules.length === 0) {
    console.log("static/engine has no practice modules: the step checked no komi cap and no minPlayoutsPerThread");
    return;
  }
  // The smallest network, since the setting does not depend on the network.
  const { read, lib, network } = await practiceFiles(root, manifest);
  for (const m of modules) {
    try {
      const module = await WebAssembly.compile(read(m));
      // The threaded bot with two threads, the fewest of its form. The setting does not depend on them.
      const threads = m.kind === "practice-threaded-module" ? 2 : 1;
      const bot = threads > 1 ? await lib.createBatchedPracticeBot(module, noEvaluator(manifest.sizes), { maxBatch: threads })
        : await lib.createPracticeBot(module);
      const start = startCommand(await bot.command("list_commands"));
      await bot.setModel(network);
      answer(start, await bot.command(`${start} 1 ${threads}`)); // SEED THREADS
      checkMinPlayoutsPerThread(await bot.command("kata-get-params"));
      await checkKomiCap(maxKomi, value => bot.command(`komi ${value}`));
    } catch (e) {
      throw new Error(`${m.id}: ${errorText(e)}`, { cause: e });
    }
    console.log(`${m.id}: minPlayoutsPerThread ${MIN_PLAYOUTS_PER_THREAD}, as design 24, item 14 needs, and the komi ` +
                `cap ${maxKomi}, the site's MAX_RECORD_KOMI`);
  }
}

/** A position as the rules give it (the CPU module's describe): the mover, the legal moves, the game's end, and the
 *  position in the engine's one-line form. An error when the rules refuse the query. */
export interface Described { mover?: string; legal?: string[]; outcome?: unknown; position?: string; error?: string }

/** The two bots of one check, each new: GTP lines in, replies out. `one` is the one-thread bot, `threaded` the threaded
 *  bot with THREADS search threads on the CPU evaluator. `release` stops the evaluator's workers. */
export interface BotPair {
  one(line: string): string | Promise<string>;
  threaded(line: string): string | Promise<string>;
  release(): unknown;
}

/** The threaded bot's search threads: Practice's CPU form with one worker, two threads for each (botForms.ts). */
export const THREADS = 2;
const SEED = 1, VISITS = 1, MOVES = 6;

/** Checks that the threaded bot plays the one-thread bot's moves at 1 visit with the same seed: MOVES moves from the
 *  standard start, then MOVES from a set-up start, the position after the first moves. Each start has a new pair of
 *  bots (`makePair`), since a session keeps its seed. The one-thread bot's list_commands gives the game's start
 *  command (enclosure-start, blueprints-start). `describe` gives the rules' position after `moves` from `start` (null:
 *  the standard start). Each move must be legal. An error names the start, the move's number and both bots' moves. */
export async function checkBotsAgree(makePair: () => Promise<BotPair>,
                                     describe: (start: string | null, moves: string[]) => Described): Promise<void> {
  const rules = (start: string | null, moves: string[]) => {
    const d = describe(start, moves);
    if (d.error) throw new Error(`the rules refuse the position after ${moves.length} moves: ${d.error}`);
    return d;
  };
  const play = async (start: string | null) => {
    const where = start ? `the set-up start ${start}` : "the standard start";
    const pair = await makePair();
    try {
      const gameStart = startCommand(await pair.one("list_commands")), game = gameStart.replace(/-start$/, "");
      answer(gameStart, await pair.one(`${gameStart} ${SEED}`));
      answer(gameStart, await pair.threaded(`${gameStart} ${SEED} ${THREADS}`));
      for (const send of [pair.one, pair.threaded]) {
        answer("kata-set-param", await send(`kata-set-param maxVisits ${VISITS}`));
        if (start) answer(`${game}-set-position`, await send(`${game}-set-position ${start}`));
      }
      const moves: string[] = [];
      for (let d = rules(start, moves); moves.length < MOVES && !d.outcome; d = rules(start, moves)) {
        const genmove = `genmove ${d.mover === "b" ? "b" : "w"}`;
        const one = answer(genmove, await pair.one(genmove)), threaded = answer(genmove, await pair.threaded(genmove));
        if (!d.legal?.includes(one))
          throw new Error(`the one-thread bot played ${one}, which the rules do not allow, at move ` +
                          `${moves.length + 1} from ${where}`);
        if (threaded !== one)
          throw new Error(`at move ${moves.length + 1} from ${where}, at ${VISITS} visit with the seed ${SEED}, the ` +
                          `threaded bot on the CPU evaluator played ${threaded}, and the one-thread bot ${one}. The ` +
                          `one-thread bot runs the network in its own module, so the evaluator does not compute the ` +
                          `bot's network: take the threaded bot, the practice evaluator and its two libraries from ` +
                          `one release, with that release's sizes.`);
        moves.push(one);
      }
      return moves;
    } finally {
      await pair.release();
    }
  };
  const moves = await play(null);
  const start = rules(null, moves).position;
  if (!start)
    throw new Error(`the rules give no position after ${moves.length} moves, so the check has no set-up start`);
  await play(start);
}

/** A batch of positions for an evaluator, as the threaded bot's batch runner gives it (gpu_engine.mjs,
 *  createBatchRunner): `rows` positions, each row's inputs after the last, and the network's shapes. */
export interface Batch { rows: number; C: number; G: number; P: number; spatial: Float32Array; global: Float32Array }
/** An evaluator's outputs for a batch: each output's values, row after row. */
export type Outputs = Record<string, Float32Array>;
/** The CPU evaluator (cpu_evaluator.mjs), as the threaded bot uses it. library.ts's CpuEvaluatorLibrary gives only its
 *  release. */
interface CpuEvaluator {
  sizes?: NetworkSizes;
  evaluate(batch: Batch): Promise<Outputs>;
  release(): Promise<unknown>;
}

/** The most that a value of a row and of its copy in one batch may differ. With the right files, they differed by at
 *  most 2e-6 on both sites. With a wrong size, the policy differed by 15 to 29. */
const ROW_TOLERANCE = 1e-3;

/** Compares an evaluator's outputs for a batch (`once`) with its outputs for the same batch with each row twice
 *  (`twice`): each copy of each row must give the row's values, within ROW_TOLERANCE. Gives the first difference, or
 *  null. */
export function rowsDiffer(once: Outputs, twice: Outputs): string | null {
  for (const [name, values] of Object.entries(once)) {
    const copies = twice[name];
    if (copies?.length !== 2 * values.length)
      return `the batch with each row twice gives ${copies?.length ?? 0} values of ${name}, not ${2 * values.length}`;
    for (let i = 0; i < copies.length; i++) {
      const k = i % values.length;
      if (!(Math.abs(copies[i] - values[k]) <= ROW_TOLERANCE))
        return `value ${k} of ${name} is ${values[k]}, and ${copies[i]} in the copy ${i < values.length ? 1 : 2}`;
    }
  }
  return null;
}

/** `evaluator` for the threaded bot, with a check of its first batch: it evaluates the batch again with each row twice,
 *  and compares the outputs (rowsDiffer). `difference` gives the difference, null when there is none, and undefined
 *  before the first batch. The bot and the evaluator place each row by the evaluator's sizes, so a wrong size moves
 *  each row after the first. At 1 visit the bot sends one row at a time, so its moves alone never show it. A batch's
 *  inputs must hold its rows and nothing after them, as the bot's batch runner gives them (createBatchRunner). */
export function checkingRows(evaluator: Pick<CpuEvaluator, "sizes" | "evaluate">) {
  let difference: string | null | undefined;
  const twice = (a: Float32Array) => {
    const both = new Float32Array(2 * a.length);
    both.set(a);
    both.set(a, a.length);
    return both;
  };
  return {
    evaluator: {
      sizes: evaluator.sizes,
      async evaluate(batch: Batch) {
        const once = await evaluator.evaluate(batch);
        if (difference === undefined)
          difference = rowsDiffer(once, await evaluator.evaluate({ ...batch, rows: 2 * batch.rows,
                                                               spatial: twice(batch.spatial),
                                                               global: twice(batch.global) }));
        return once;
      },
    },
    difference: () => difference,
  };
}

/** Checks Practice's CPU form in a site's static/engine with checkBotsAgree: the threaded bot on the CPU evaluator
 *  (the practice evaluator, cpu_evaluator.mjs and cpu_eval_worker.mjs) with the manifest's sizes, against the
 *  one-thread bot, on the smallest network. The evaluator also checks the bot's first batch with each row twice
 *  (checkingRows). `call` sends a request to the CPU module (node-engine.mjs), for the rules. Logs a line. Without a
 *  threaded bot, it logs that it checked no CPU form. An error names the files. */
export async function checkThreadedBot(root: string, manifest: Manifest, call: (request: object) => Described):
    Promise<void> {
  const [threaded] = manifest.artifacts.filter(a => a.kind === "practice-threaded-module");
  if (!threaded) {
    console.log("static/engine has no threaded practice bot: the step checked no CPU form of the bot");
    return;
  }
  const { ofKind, read, url, lib, model, network } = await practiceFiles(root, manifest);
  const library = (name: string) => ofKind("cpu-evaluator-library").find(a => a.url.endsWith(`/${name}`));
  const [one] = ofKind("practice-module"), [evaluator] = ofKind("practice-evaluator");
  const pool = library("cpu_evaluator.mjs"), worker = library("cpu_eval_worker.mjs");
  if (!one || !evaluator || !pool || !worker)
    throw new Error(`${threaded.id}: static/engine lacks the one-thread bot or a file of the CPU evaluator ` +
                    `(practice-evaluator, cpu_evaluator.mjs, cpu_eval_worker.mjs), which the check of the CPU form ` +
                    `needs`);
  const files = [threaded, evaluator, pool, worker, one].map(a => a.id).join(", ");
  const sizes = manifest.sizes ? JSON.stringify(manifest.sizes) : "the library's default";
  try {
    const cpu = await import(url(pool).href) as CpuEvaluatorLibrary;
    const [oneModule, threadedModule, evaluatorModule] =
      await Promise.all([one, threaded, evaluator].map(a => WebAssembly.compile(read(a))));
    const rowChecks: (() => string | null | undefined)[] = [];
    const makePair = async (): Promise<BotPair> => {
      const single = await lib.createPracticeBot(oneModule);
      single.setModel(network);
      // The CPU form with one worker, as the page starts it (botFormsWorker.ts). The page gives maxRows the form's
      // threads. The check gives twice that, for the first batch with each row twice (checkingRows).
      const cpuEvaluator = await cpu.createCpuEvaluator(evaluatorModule, network, {
        workers: 1, maxRows: 2 * THREADS, makeWorker: () => new Worker(url(worker)) as unknown as globalThis.Worker,
        ...sizesOption(manifest) }) as unknown as CpuEvaluator;
      try {
        const checked = checkingRows(cpuEvaluator);
        const bot = await lib.createBatchedPracticeBot(threadedModule, checked.evaluator, { maxBatch: THREADS });
        await bot.setModel(network);
        rowChecks.push(checked.difference);
        return { one: line => single.command(line), threaded: line => bot.command(line),
                 release: () => cpuEvaluator.release() };
      } catch (e) {
        await cpuEvaluator.release();
        throw e;
      }
    };
    await checkBotsAgree(makePair, (start, moves) =>
      call({ id: "practice-check", action: "describe", ...positionQuery(start, moves) }));
    for (const difference of rowChecks.map(check => check())) {
      if (difference === undefined)
        throw new Error("the threaded bot evaluated no position, so the check of a batch's rows did not run");
      if (difference !== null)
        throw new Error(`the CPU evaluator gave another row's outputs when the bot's batch had each row twice: ` +
                        `${difference}. The bot and the evaluator place each row by the evaluator's sizes ` +
                        `(${sizes}), so these are not the network's sizes: take the lock's sizes from the release's ` +
                        `manifest (engine.sizes), and the threaded bot, the evaluator and its libraries from one ` +
                        `release.`);
    }
    console.log(`${threaded.id} on the CPU evaluator (${evaluator.id}, ${THREADS} threads, sizes: ${sizes}): the ` +
                `one-thread bot's moves at ${VISITS} visit with ${model.id}, ${MOVES} from the standard start and ` +
                `${MOVES} from a set-up start, and the same outputs for each row of a batch with each row twice`);
  } catch (e) {
    throw new Error(`${files}: ${errorText(e)}`, { cause: e });
  }
}
