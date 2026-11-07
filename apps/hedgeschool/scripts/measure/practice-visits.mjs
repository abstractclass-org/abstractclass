// What a move of the practice bot searches at a visit setting (docs/decisions/product.md, "Practice: the threaded
// bot's visits at each setting", gives the method): the network's rows that a move evaluates, for the threaded bot at
// a number of search threads. The bot reports no root visits, so its rows stand for them. Each move is searched from a
// new tree (`clear_board`, then the game's moves), with a new bot for each setting. The threaded bot runs on its CPU
// evaluator (cpu_evaluator.mjs, in worker_threads), set up as the site's worker sets it up
// (packages/practice/src/botWorker.ts and botFormsWorker.ts). Node runs it with no flag when it has
// JSPI (Node 25 and later).
//
//   node scripts/measure/practice-visits.mjs positions OUT.json [--games 3] [--network ID]
//       The positions: every 8th edge count of the stored reviews' games (tests/fixtures/*-review.json) and of games
//       that the one-thread bot plays itself, one after the other in one session (seed 1, 32 visits, Medium variety).
//       Each holds its moves with their GTP colours, and the GTP colour of its mover.
//   node scripts/measure/practice-visits.mjs measure POSITIONS.json [--threads 1,4,8,16]
//       [--visits 1,2,4,8,16,32,64,128] [--workers 2] [--network ID]
//       One JSON line a setting: the bot's minPlayoutsPerThread, its rows a move (mean, standard deviation, least,
//       most), the moves over the bound visits + min(threads, visits / minPlayoutsPerThread) - 1 (rounded down, at
//       least one thread), its positions a batch, its milliseconds a move, and the rows of each move.
//
// It reads the engine from static/engine (`npm run engine` first). The network is HedgeFund 0.2 Lite unless --network.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import { modelOf } from "@abstractclass/engine/client.ts";
import { nodeEngine } from "@abstractclass/engine/node-engine.mjs";
import { positionQuery } from "@abstractclass/engine/protocol.ts";
import { parseRecord } from "../../src/lib/game/record.ts";
import { botCommands, gtpAnswer } from "../../src/lib/practice/hedgefund.ts";

/** The edge counts between two positions of a game. */
const POSITION_STEP = 8;
/** The settings of the one-thread bot's own games, and the seed of every bot. */
const SELF_PLAY = { visits: 32, variety: "medium" };
const SEED = 1;

const [command, file] = process.argv.slice(2);
const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : def; };
const list = s => s.split(",").map(Number);
if (!["positions", "measure"].includes(command) || !file)
  throw new Error("usage: node scripts/measure/practice-visits.mjs positions OUT.json [--games N] | "
                  + "measure POSITIONS.json [--threads T,..] [--visits V,..] [--workers W] [--network ID]");

const { manifest, call } = await nodeEngine(".");
const kind = (k, name) => manifest.artifacts.find(a => a.kind === k && (!name || a.url.endsWith(`/${name}`)));
const network = modelOf(manifest, arg("network", "b10c128-s89066368-d17827487"));
if (!network) throw new Error("static/engine has no such network");
const staticPath = a => join("static", a.url);
const model = readFileSync(staticPath(network));
const compileKind = k => WebAssembly.compile(readFileSync(staticPath(kind(k))));
const importKind = (k, name) => import(pathToFileURL(staticPath(kind(k, name))).href);
const gtp = side => (side === "b" ? "b" : "w");
const lib = await importKind("practice-library");

if (command === "positions") {
  const games = [];
  const fixtures = "tests/fixtures";
  for (const f of readdirSync(fixtures).filter(f => f.endsWith("-review.json"))) {
    const j = JSON.parse(readFileSync(join(fixtures, f), "utf8"));
    if (j.format === "hedge-school-review") games.push({ source: f, moves: parseRecord(j.record).moves });
  }
  const one = await lib.createPracticeBot(await compileKind("practice-module"));
  one.setModel(model);
  gtpAnswer(one.command(`enclosure-start ${SEED}`));
  for (const line of botCommands({ network: network.id, ...SELF_PLAY })) gtpAnswer(one.command(line));
  for (let game = 1; game <= Number(arg("games", "3")); game++) {
    gtpAnswer(one.command("clear_board"));
    const moves = [];
    for (let p; (p = call({ id: "d", action: "describe", ...positionQuery(null, moves) })).outcome === null;)
      moves.push(gtpAnswer(one.command(`genmove ${gtp(p.mover)}`)));
    games.push({ source: `self-play ${game}`, moves });
    console.log(`self-play ${game}: ${moves.length} edges`);
  }
  // Every POSITION_STEP-th edge count before the game's end, each position once.
  const seen = new Set(), positions = [];
  for (const g of games) {
    const colors = call({ id: "g", action: "describe_game", moves: g.moves }).positions.map(p => gtp(p.mover));
    for (let k = 0; k < g.moves.length; k += POSITION_STEP) {
      const key = g.moves.slice(0, k).join(" ");
      if (seen.has(key)) continue;
      seen.add(key);
      const moves = g.moves.slice(0, k).map((m, i) => [colors[i], m]);
      positions.push({ source: g.source, edges: k, moves, mover: colors[k] });
    }
  }
  writeFileSync(file, JSON.stringify(positions));
  console.log(`${positions.length} positions from ${games.length} games`);
  process.exit(0);
}

const positions = JSON.parse(readFileSync(file, "utf8"));
const workers = Number(arg("workers", "2"));
const threadedModule = await compileKind("practice-threaded-module");
const evaluatorModule = await compileKind("practice-evaluator");
const evaluatorLib = await importKind("cpu-evaluator-library", "cpu_evaluator.mjs");
const workerUrl = pathToFileURL(staticPath(kind("cpu-evaluator-library", "cpu_eval_worker.mjs")));
const sum = xs => xs.reduce((a, b) => a + b, 0);
const mean = xs => sum(xs) / xs.length;
const stats = xs => {
  const m = mean(xs);
  return { mean: +m.toFixed(3), sd: +Math.sqrt(sum(xs.map(x => (x - m) ** 2)) / (xs.length - 1)).toFixed(3),
           min: Math.min(...xs), max: Math.max(...xs) };
};

for (const threads of list(arg("threads", "1,4,8,16"))) {
  // The evaluator keeps no evaluations between batches: each setting's new bot starts with an empty cache.
  const evaluator = await evaluatorLib.createCpuEvaluator(evaluatorModule, model,
    { workers, maxRows: threads, makeWorker: () => new Worker(workerUrl) });
  for (const visits of list(arg("visits", "1,2,4,8,16,32,64,128"))) {
    const bot = await lib.createBatchedPracticeBot(threadedModule, evaluator, { maxBatch: threads });
    await bot.setModel(model);
    gtpAnswer(await bot.command(`enclosure-start ${SEED} ${threads}`));
    for (const line of botCommands({ network: network.id, visits, variety: "low" })) gtpAnswer(await bot.command(line));
    const minPlayouts = JSON.parse(gtpAnswer(await bot.command("kata-get-params"))).minPlayoutsPerThread;
    const bound = visits + Math.min(threads, Math.max(1, Math.floor(visits / minPlayouts))) - 1;
    const rows = [], batches = [], ms = [];
    for (const p of positions) {
      gtpAnswer(await bot.command("clear_board"));
      for (const [c, m] of p.moves) gtpAnswer(await bot.command(`play ${c} ${m}`));
      const s0 = bot.stats(), t0 = performance.now();
      gtpAnswer(await bot.command(`genmove ${p.mover}`));
      const s1 = bot.stats();
      rows.push(s1.positions - s0.positions);
      batches.push(s1.batches - s0.batches);
      ms.push(performance.now() - t0);
    }
    console.log(JSON.stringify({ threads, visits, minPlayoutsPerThread: minPlayouts, rows: stats(rows), bound,
                                 overBound: rows.filter(r => r > bound).length,
                                 perBatch: +(sum(rows) / sum(batches)).toFixed(3), ms: +mean(ms).toFixed(1),
                                 byMove: rows }));
  }
  evaluator.release();
}
process.exit(0);
