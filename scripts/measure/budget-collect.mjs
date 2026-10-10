// Collects the engine's values for every position of some bot games at several search budgets, for the measurement
// of how labels at a small budget differ from labels at a deep search (docs/decisions/engine.md).
//
//   node scripts/measure/budget-collect.mjs LADDER.jsonl OUT.jsonl [--games 4] [--workers 4] [--deep 1024]
//            [--budgets 32,64,128,256] [--min-visits 512]
//
// LADDER.jsonl is the engine repository's visit ladder (runs/wasm/v2/visits/ladder.jsonl): bot games with their site
// move IDs. Only bot games are used. The games: the first --games whose two bots both searched at least --min-visits,
// each from a different opening and colour.
//
// One search per position: the engine runs in slices, and the result after a slice equals a fresh search of that many
// visits (the engine repository's check), so one search of --deep visits gives every budget. Each output line is one
// position: the game, the index, the move played next, and for each budget the root's values, the first candidate,
// and the played move's candidate values when the search visited it.
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { edgeName } = await import(new URL("../../src/lib/engine/notation.ts", import.meta.url).href);

if (isMainThread) {
  const [ladderPath, outPath] = process.argv.slice(2);
  const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : def; };
  if (!ladderPath || !outPath) { console.error("usage: budget-collect.mjs LADDER.jsonl OUT.jsonl [options]"); process.exit(2); }
  const nGames = Number(arg("games", 4)), nWorkers = Number(arg("workers", 4)), deep = Number(arg("deep", 1024));
  const budgets = arg("budgets", "32,64,128,256").split(",").map(Number).concat(deep);
  const minVisits = Number(arg("min-visits", 512));

  const visitsOf = s => Number((s.match(/visits\/v(\d+)/) ?? [, 0])[1]);
  const seen = new Set(), games = [];
  for (const line of readFileSync(ladderPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const g = JSON.parse(line);
    const key = `${g.openingSeed}:${g.blue}`;
    if (g.siteMoves?.length !== 120 || visitsOf(g.a) < minVisits || visitsOf(g.b) < minVisits || seen.has(key)) continue;
    seen.add(key);
    games.push({ id: `${visitsOf(g.a)}v${visitsOf(g.b)}-${key}`, moves: g.siteMoves.map(siteEdge), scores: g.scores });
    if (games.length === nGames) break;
  }
  const done = new Set();
  if (existsSync(outPath))
    for (const line of readFileSync(outPath, "utf8").split("\n")) if (line.trim()) { const r = JSON.parse(line); done.add(`${r.game}:${r.index}`); }
  const tasks = games.flatMap(g => g.moves.map((_, i) => ({ game: g.id, index: i, moves: g.moves.slice(0, i), played: g.moves[i] })))
    .filter(t => !done.has(`${t.game}:${t.index}`));
  console.log(`${games.length} games (${games.map(g => g.id).join(", ")}), ${tasks.length} positions to search, ` +
              `budgets ${budgets.join("/")}, ${nWorkers} workers`);

  const model = join(root, "static", "engine", "b10c128-s46923648-d9407005", "model-float16.bin");
  const module = join(root, "static", "engine", "engine-8195171", "enclosure-engine.wasm");
  let next = 0, finished = 0;
  const t0 = performance.now();
  await Promise.all(Array.from({ length: nWorkers }, () => new Promise(resolveWorker => {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: { module, model, budgets } });
    const give = () => next < tasks.length ? w.postMessage(tasks[next++]) : (w.terminate(), resolveWorker());
    w.on("message", m => {
      if (m.result) {
        appendFileSync(outPath, JSON.stringify(m.result) + "\n");
        finished++;
        if (finished % 20 === 0) console.log(`${finished}/${tasks.length} positions, ${((performance.now() - t0) / 1000).toFixed(0)} s`);
      }
      give();
    });
    w.on("error", e => { console.error(e); resolveWorker(); });
  })));
  console.log(`done: ${finished} positions in ${((performance.now() - t0) / 1000).toFixed(0)} s`);
} else {
  const { loadEngine } = await import(new URL("../../src/lib/engine/module.ts", import.meta.url).href);
  const engine = await loadEngine(await WebAssembly.compile(readFileSync(workerData.module)));
  engine.setModel(new Uint8Array(readFileSync(workerData.model)));
  const loaded = JSON.parse(engine.call({ id: "load", action: "load_model", name: "b10c128" }));
  if (loaded.error) throw new Error(loaded.error);
  const { budgets } = workerData;
  const pick = (r, played) => {
    const first = r.moveInfos[0], p = r.moveInfos.find(c => c.move === played);
    const vals = c => c && { move: c.move, visits: c.visits, winrate: c.winrate, scoreSelfplay: c.scoreSelfplay, scoreLead: c.scoreLead };
    const ri = r.rootInfo;
    return { visits: ri.visits, mover: ri.currentPlayer, winrate: ri.winrate, scoreSelfplay: ri.scoreSelfplay, scoreLead: ri.scoreLead,
             scoreStdev: ri.scoreStdev, first: vals(first), played: vals(p) ?? null };
  };
  parentPort.on("message", task => {
    const out = {};
    const step = budgets[0];
    let reply = JSON.parse(engine.call({ id: "q", moves: task.moves, maxVisits: budgets.at(-1), slice: { visits: step } }));
    for (;;) {
      if (reply.error) { out.error = reply.error; break; }
      const v = reply.rootInfo.visits;
      for (const b of budgets) if (!out[b] && v >= b) out[b] = pick(reply, task.played);
      if (!reply.isDuringSearch) break;
      reply = JSON.parse(engine.call({ id: "q", action: "continue" }));
    }
    parentPort.postMessage({ result: { game: task.game, index: task.index, played: task.played, engine: reply.engine, budgets: out } });
  });
  parentPort.postMessage({});
}

// The site's move ID as an edge in the engine's notation: ID = direction * 361 + source, source = y * 19 + x, the 48
// directions ordered by dy, then dx (the ladder's records keep the site's IDs).
function siteEdge(id) {
  const steps = [];
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (dx || dy) steps.push([dx, dy]);
  const s = id % 361, [dx, dy] = steps[Math.floor(id / 361)], x = s % 19, y = Math.floor(s / 19);
  return edgeName([x, y, x + dx, y + dy]);
}
