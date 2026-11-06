// What a move of the practice bot searches at a visit setting (docs/decisions/product.md, "Practice: the threaded bot's
// visits at each setting"): the network's rows that a move evaluates, for the threaded bot at a number of search threads and for
// the same module with one search thread. The bot reports no root visits. Its rows are the playouts that reached a
// new position: a root visit each, less the playouts that ended at a game's end or took a cached evaluation. Each move
// is searched from a fresh tree (`clear_board`, then the game's moves), the case with the most new playouts. Each
// setting gets a new bot, so that no move takes a position from the network's cache of an earlier setting.
//
// The threaded bot runs on its CPU evaluator (cpu_evaluator.mjs, in worker_threads) with --workers workers. The rows
// depend on the search threads, not on the evaluator: 16 threads stand for the GPU form. Node runs the threaded bot
// with no flag when it has JSPI (WebAssembly.Suspending and WebAssembly.promising, Node 25 and later).
//
//   node scripts/measure/practice-visits.mjs positions OUT.json [--games 3]
//       The positions: every 8th edge count of the stored reviews' games (tests/fixtures/*-review.json) and of games
//       that the one-thread bot plays itself (32 visits, Medium variety, seeds 1 to N).
//   node scripts/measure/practice-visits.mjs measure POSITIONS.json --threads 1,16 --visits 1,2,4,8,16,64 [--workers 2]
//       One JSON line a setting: its rows a move (mean, standard deviation, least, most), its positions a batch, and
//       its milliseconds a move.
//
// It reads the engine from static/engine (`npm run engine` first) and the network HedgeFund 0.2 Lite unless --network.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import { nodeEngine } from "@abstractclass/engine/node-engine.mjs";
import { positionQuery } from "@abstractclass/engine/protocol.ts";
import { settingsCommands } from "@abstractclass/practice/practice.ts";
import { parseRecord } from "../../src/lib/game/record.ts";

const [command, file] = process.argv.slice(2);
const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : def; };
const list = s => s.split(",").map(Number);
if (!["positions", "measure"].includes(command) || !file)
  throw new Error("usage: node scripts/measure/practice-visits.mjs positions OUT.json | measure POSITIONS.json --threads T,.. --visits V,..");

const { manifest, call } = await nodeEngine(".");
const kind = (k, name) => manifest.artifacts.find(a => a.kind === k && (!name || a.url.endsWith(`/${name}`)));
const network = manifest.artifacts.find(a => a.kind === "model" && a.id === arg("network", "b10c128-s89066368-d17827487"));
if (!network) throw new Error("static/engine has no such network");
const staticFile = a => readFileSync(join("static", a.url));
const model = staticFile(network);
const lib = await import(pathToFileURL(join("static", kind("practice-library").url)).href);
const describe = moves => call({ id: "d", action: "describe", ...positionQuery(null, moves) });
const color = moves => (describe(moves).mover === "b" ? "b" : "w");
const ok = r => { if (!r.startsWith("=")) throw new Error(r); return r.slice(1).trim(); };

if (command === "positions") {
  const games = [];
  const fixtures = "tests/fixtures";
  for (const f of readdirSync(fixtures).filter(f => f.endsWith("-review.json"))) {
    const j = JSON.parse(readFileSync(join(fixtures, f), "utf8"));
    if (j.format === "hedge-school-review") games.push({ source: f, moves: parseRecord(j.record).moves.map(m => m.replace(/x$/, "")) });
  }
  const one = await lib.createPracticeBot(await WebAssembly.compile(staticFile(kind("practice-module"))));
  one.setModel(model);
  ok(one.command("enclosure-start 1"));
  for (const line of settingsCommands({ network: network.id, visits: 32, variety: "medium" }, 19)) ok(one.command(line));
  for (let seed = 1; seed <= Number(arg("games", "3")); seed++) {
    // One session (seed 1) plays the games one after the other: its random draws go on from game to game.
    ok(one.command("clear_board"));
    const moves = [];
    while (describe(moves).outcome === null) moves.push(ok(one.command(`genmove ${color(moves)}`)));
    games.push({ source: `self-play ${seed}`, moves });
    console.log(`self-play ${seed}: ${moves.length} edges`);
  }
  const seen = new Set(), positions = [];
  for (const g of games)
    for (let k = 0; k < g.moves.length; k += 8) {
      const moves = g.moves.slice(0, k), key = moves.join(" ");
      if (seen.has(key) || describe(moves).outcome !== null) continue;
      seen.add(key);
      positions.push({ source: g.source, edges: k, moves: moves.map((m, i) => [color(moves.slice(0, i)), m]), mover: color(moves) });
    }
  writeFileSync(file, JSON.stringify(positions));
  console.log(`${positions.length} positions from ${games.length} games`);
  process.exit(0);
}

const positions = JSON.parse(readFileSync(file, "utf8"));
const workers = Number(arg("workers", "2"));
const threadedModule = await WebAssembly.compile(staticFile(kind("practice-threaded-module")));
const evaluatorModule = await WebAssembly.compile(staticFile(kind("practice-evaluator")));
const evaluatorLib = await import(pathToFileURL(join("static", kind("cpu-evaluator-library", "cpu_evaluator.mjs").url)).href);
const workerUrl = pathToFileURL(join("static", kind("cpu-evaluator-library", "cpu_eval_worker.mjs").url));
const stats = xs => {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return { mean: +mean.toFixed(3), sd: +Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1)).toFixed(3),
           min: Math.min(...xs), max: Math.max(...xs) };
};

for (const threads of list(arg("threads", "1,16")))
  for (const visits of list(arg("visits", "1,2,4,8,16,64"))) {
    const evaluator = await evaluatorLib.createCpuEvaluator(evaluatorModule, model,
      { workers, maxRows: threads, makeWorker: () => new Worker(workerUrl) });
    const bot = await lib.createBatchedPracticeBot(threadedModule, evaluator, { maxBatch: threads });
    await bot.setModel(model);
    ok(await bot.command(`enclosure-start 1 ${threads}`));
    for (const line of settingsCommands({ network: network.id, visits, variety: "low" }, 19)) ok(await bot.command(line));
    const rows = [], batches = [], ms = [];
    for (const p of positions) {
      ok(await bot.command("clear_board"));
      for (const [c, m] of p.moves) ok(await bot.command(`play ${c} ${m}`));
      const s0 = bot.stats(), t0 = performance.now();
      ok(await bot.command(`genmove ${p.mover}`));
      const s1 = bot.stats();
      rows.push(s1.positions - s0.positions);
      batches.push(s1.batches - s0.batches);
      ms.push(performance.now() - t0);
    }
    evaluator.release();
    const batched = rows.reduce((a, b) => a + b, 0) / batches.reduce((a, b) => a + b, 0);
    console.log(JSON.stringify({ threads, visits, moves: rows.length, rows: stats(rows), over: rows.filter(r => r > visits).length,
                                 perBatch: +batched.toFixed(3), ms: +stats(ms).mean.toFixed(1), byMove: rows }));
  }
process.exit(0);
