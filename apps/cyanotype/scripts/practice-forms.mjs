// Whether Stamp Duty's threaded practice bot plays the one-thread bot's moves below 16 visits (design 33, "Practice
// against Stamp Duty"). Hedge School's measurement found that Enclosure's threaded bot searches with one thread there
// (its decisions/product.md, "Practice: the threaded bot's visits at each setting"). The forms: the one-thread bot
// (`practice-module`), and the threaded bot (`practice-threaded-module`) at each number of search threads, on its CPU
// evaluator with the manifest's sizes, as the site's worker sets it up (packages/practice/src/botFormsWorker.ts). The
// threaded bot with one search thread is the control for the threaded forms: it runs the same module and evaluator.
// At each visit setting and variety, with one seed:
//   - The games: each form plays GAMES games against itself from the standard start, one after the other in one
//     session. The script prints where each threaded form's games first leave the one-thread bot's.
//   - The positions: every 8th move count of the one-thread bot's games, each searched from a new tree (`clear_board`,
//     then the moves) by a new bot of each form, in one order. The script prints, for each threaded form, the
//     positions where it chose the one-thread bot's move and the control's move, the positions where it evaluated as
//     many of the network's rows as the control, its rows a move, and the positions (by their move count) where its
//     move was not the one-thread bot's. The threaded bot counts its rows (`stats()`), and the one-thread bot cannot.
// A threaded form `T` has T search threads, and the evaluator's rows and the bot's largest batch T, as the site gives
// them. A form `T:R` has T search threads with R rows, to tell the threads' part from the evaluator's.
// The rules engine gives each position's mover, its legal moves and the game's end. Each bot's move must be legal.
//
//   npm run engine && node scripts/practice-forms.mjs [--visits 1,4,8] [--threads 1,4,16 | 1:16,16:1] [--variety low]
//       [--games 3] [--seed 1] [--workers 2]
//
// The CPU only: the bots and the rules run in Node from the site's static/engine. The threaded bot needs JSPI, which
// Node has with no flag from Node 25.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import { hasEngine, nodeEngine } from "@abstractclass/engine/node-engine.mjs";
import { sizesOption } from "@abstractclass/engine/library.ts";
import { gtpAnswer, gtpColor, settingsCommands } from "@abstractclass/practice/practice.ts";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** The value of the option `--name VALUE`, or `fallback`. @param {string} name @param {string} fallback */
const option = (name, fallback) => { const k = process.argv.indexOf(`--${name}`); return k < 0 ? fallback : process.argv[k + 1]; };
const list = (/** @type {string} */ s) => s.split(",");
const VISITS = list(option("visits", "1,4,8")).map(Number), THREADS = list(option("threads", "1,4,16"));
const VARIETIES = list(option("variety", "low")), GAMES = Number(option("games", "3")), SEED = Number(option("seed", "1"));
const WORKERS = Number(option("workers", "2"));
const HALFLIFE = 19; // the practice's (src/lib/practice/stampduty.ts)
const POSITION_STEP = 8; // the move counts between two positions, as Hedge School's measurement took them

if (!hasEngine(app)) throw new Error("no engine in static/engine: run `npm run engine` first");
const wasm = /** @type {{ Suspending?: unknown }} */ (WebAssembly);
if (typeof wasm.Suspending !== "function") throw new Error("this Node has no JSPI, which the threaded bot needs (Node 25 and later)");
const manifest = JSON.parse(readFileSync(join(app, "static", "engine", "manifest.json"), "utf8"));
/** @param {string} kind @param {string} [name] the file's name, where the kind has several */
const artifact = (kind, name) => {
  const a = manifest.artifacts.find((/** @type {{ kind: string, url: string }} */ x) => x.kind === kind && (!name || x.url.endsWith(`/${name}`)));
  if (!a) throw new Error(`static/engine/manifest.json has no ${kind} ${name ?? ""}`);
  return a;
};
const path = (/** @type {string} */ kind, /** @type {string} */ name = "") => join(app, "static", artifact(kind, name).url);
const network = artifact("model");
const model = readFileSync(path("model"));
const library = await import(pathToFileURL(path("practice-library")).href);
const compile = (/** @type {string} */ kind) => WebAssembly.compile(readFileSync(path(kind)));
const { call } = await nodeEngine(app);
/** A form's search threads and rows: `0` is the one-thread bot, `T` T threads and T rows, `T:R` T threads and R rows. */
const formOf = (/** @type {number | string} */ form) => {
  const [threads, rows = threads] = String(form).split(":").map(Number);
  return { threads, rows };
};
const formName = (/** @type {number | string} */ form) => {
  const { threads, rows } = formOf(form);
  return threads === 0 ? "the one-thread bot" : `${threads} thread${threads === 1 ? "" : "s"}${rows === threads ? "" : ` with ${rows} rows`}`;
};

/** A form's bot, started with the seed and the settings: `threads` 0 is the one-thread bot. `rows()`: the network's
 *  rows that the threaded bot has evaluated so far (null for the one-thread bot). */
async function startBot(/** @type {number | string} */ form, /** @type {import("@abstractclass/practice/practice.ts").BotSettings} */ bot) {
  const { threads, rows } = formOf(form);
  /** @type {{ command(line: string): string | Promise<string>, stats?(): { positions: number } }} */
  let made;
  /** @type {{ release(): void } | null} */
  let evaluator = null;
  if (threads === 0) {
    const one = await library.createPracticeBot(await compile("practice-module"));
    one.setModel(model);
    made = one;
  } else {
    const pool = await import(pathToFileURL(path("cpu-evaluator-library", "cpu_evaluator.mjs")).href);
    const workerUrl = pathToFileURL(path("cpu-evaluator-library", "cpu_eval_worker.mjs"));
    const max = artifact("practice-evaluator").maxThreads ?? Infinity;
    if (threads > max) throw new Error(`${threads} threads: the evaluator takes at most ${max}`);
    evaluator = await pool.createCpuEvaluator(await compile("practice-evaluator"), model,
      { workers: WORKERS, maxRows: rows, makeWorker: () => new Worker(workerUrl), ...sizesOption(manifest) });
    const threaded = await library.createBatchedPracticeBot(await compile("practice-threaded-module"), evaluator, { maxBatch: rows });
    await threaded.setModel(model);
    made = threaded;
  }
  const command = async (/** @type {string} */ line) => {
    try { return gtpAnswer(await made.command(line)); }
    catch (e) { throw new Error(`${line}: ${e instanceof Error ? e.message : e}`); }
  };
  await command(threads === 0 ? `blueprints-start ${SEED}` : `blueprints-start ${SEED} ${threads}`);
  for (const line of settingsCommands(bot, HALFLIFE)) await command(line);
  return { command, rows: () => made.stats?.().positions ?? null, release: () => evaluator?.release() };
}

/** A move of the bot on the position after `moves`, which must be legal there. */
async function genmove(/** @type {Awaited<ReturnType<typeof startBot>>} */ b, /** @type {string[]} */ moves, /** @type {string} */ where) {
  const now = call({ id: "d", action: "describe", moves });
  if (now.error) throw new Error(`describe: ${now.error}`);
  const move = await b.command(`genmove ${gtpColor(now.mover === "b" ? 0 : 1)}`);
  if (!now.legal.includes(move)) throw new Error(`${where}: ${move} is not legal`);
  return move;
}

/** GAMES games of the bot against itself, in one session: each game's moves. */
async function games(/** @type {number | string} */ threads, /** @type {import("@abstractclass/practice/practice.ts").BotSettings} */ bot) {
  const b = await startBot(threads, bot);
  /** @type {string[][]} */
  const all = [];
  for (let g = 0; g < GAMES; g++) {
    await b.command("clear_board");
    /** @type {string[]} */
    const moves = [];
    while (!call({ id: "d", action: "describe", moves }).outcome)
      moves.push(await genmove(b, moves, `${formName(threads)}, game ${g + 1}, move ${moves.length + 1}`));
    all.push(moves);
  }
  b.release();
  return all;
}

/** Each position searched from a new tree by a new bot of the form: its move and, for the threaded bot, its rows. */
async function atPositions(/** @type {number | string} */ threads, /** @type {import("@abstractclass/practice/practice.ts").BotSettings} */ bot,
                           /** @type {string[][]} */ positions) {
  const b = await startBot(threads, bot);
  /** @type {{ move: string, rows: number | null }[]} */
  const out = [];
  for (const [k, moves] of positions.entries()) {
    await b.command("clear_board");
    const colors = call({ id: "g", action: "describe_game", moves }).positions.map((/** @type {{ mover: string }} */ p) => p.mover);
    for (const [i, m] of moves.entries()) await b.command(`play ${colors[i] === "b" ? "b" : "w"} ${m}`);
    const before = b.rows();
    const move = await genmove(b, moves, `${formName(threads)}, position ${k + 1}`);
    const after = b.rows();
    out.push({ move, rows: before === null || after === null ? null : after - before });
  }
  b.release();
  return out;
}

const seconds = (/** @type {number} */ t0) => `${((performance.now() - t0) / 1000).toFixed(0)} s`;
console.log(`${network.displayName ?? network.id} (${network.id}), seed ${SEED}, ${GAMES} games a setting, ` +
            `the CPU evaluator on ${WORKERS} workers with the sizes ${JSON.stringify(manifest.sizes ?? "of Enclosure")}`);
for (const variety of VARIETIES) {
  for (const visits of VISITS) {
    const bot = { network: network.id, visits, variety: /** @type {"low"} */ (variety) };
    let t0 = performance.now();
    const one = await games(0, bot);
    console.log(`${visits} visits, ${variety} variety: the one-thread bot played ${one.reduce((n, g) => n + g.length, 0)} ` +
                `moves in ${GAMES} games (${seconds(t0)})`);
    for (const threads of THREADS) {
      t0 = performance.now();
      const other = await games(threads, bot);
      const diff = other.flatMap((g, k) => {
        const i = g.findIndex((m, j) => m !== one[k][j]);
        return i >= 0 || g.length !== one[k].length ? [`game ${k + 1}, move ${i >= 0 ? i + 1 : Math.min(g.length, one[k].length) + 1}`] : [];
      });
      console.log(`  games, ${formName(threads)}: ${diff.length ? `${diff.length} of ${GAMES} games differ, first at ${diff.join(", ")}`
                                                                   : "the same moves in every game"} (${seconds(t0)})`);
    }
    // The positions: every POSITION_STEP-th move count of the one-thread bot's games, each once
    const seen = new Set(), positions = /** @type {string[][]} */ ([]);
    for (const g of one)
      for (let k = 0; k < g.length; k += POSITION_STEP) {
        const key = g.slice(0, k).join(" ");
        if (!seen.has(key)) { seen.add(key); positions.push(g.slice(0, k)); }
      }
    t0 = performance.now();
    const base = await atPositions(0, bot, positions);
    const forms = [];
    for (const threads of THREADS) forms.push({ threads, at: await atPositions(threads, bot, positions) });
    const control = forms.find(f => f.threads === "1");
    for (const f of forms) {
      const same = (/** @type {{ move: string }[]} */ xs) => f.at.filter((r, i) => r.move === xs[i].move).length;
      const rows = f.at.map(r => r.rows ?? 0), mean = rows.reduce((a, b) => a + b, 0) / rows.length;
      console.log(`  positions, ${formName(f.threads)}: the one-thread bot's move at ${same(base)} of ${positions.length}` +
                  (control && f !== control ? `, the control's move at ${same(control.at)}, the control's rows at ` +
                    `${f.at.filter((r, i) => r.rows === control.at[i].rows).length}` : "") +
                  `; rows a move ${mean.toFixed(2)} (${Math.min(...rows)} to ${Math.max(...rows)})` +
                  `; another move after ${JSON.stringify(f.at.flatMap((r, i) => (r.move === base[i].move ? [] : [positions[i].length])))} moves`);
    }
    console.log(`  (${positions.length} positions, ${seconds(t0)})`);
  }
}
process.exit(0);
