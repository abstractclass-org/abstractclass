// The layout sweep's game (tests/layout.spec.ts): a game of HedgeFund against itself, reviewed as the Review tab reviews
// a game by default (HedgeFund 0.1 Lite, 512 visits a position: the Lite review), as a review file (game/reviewFile.ts's
// format) in tests/fixtures/hedgefund-review.json. The site's own game: the repository holds no one else's games (the
// meaf.us games are their players'). The practice bot plays both sides (seed 7): Blue at 1 visit a move, Red at 128, so that
// Blue's mistakes cost tens of points, as real players' do. The move list's cells are then as wide as a real game's
// (a mistake's label, and two digits of points lost): an even game's cells, with losses of 0 or 1, were narrower, and
// the sweep missed a move list cut by 6 pixels. The analysis module analyzes each position, and the positions that
// confirm a Great (GameAnalysis.data), on several threads. It reads the engine from static/engine (`npm run engine`
// first).
//
//   node scripts/test-fixture.mjs [threads]
import { availableParallelism } from "node:os";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

const NETWORK = "b10c128-s66625408-d13350730", VISITS = 512, BOT_VISITS = { b: 1, r: 128 }, SEED = 7, EDGES = 120;
const root = fileURLToPath(new URL("..", import.meta.url));

if (!isMainThread) {
  // A worker: an engine of its own, which analyzes the positions it is given, one by one.
  const { nodeEngine } = await import("./node-engine.mjs");
  const { call } = await nodeEngine(root, { network: NETWORK });
  for (const moves of workerData.jobs) {
    const reply = call({ id: "a", moves, maxVisits: VISITS, includePVVisits: true, includeOwnership: true, includeMovesOwnership: true });
    if (reply.error) throw new Error(`${moves.join(" ")}: ${reply.error}`);
    parentPort.postMessage({ moves, reply });
  }
} else {
  const { nodeEngine } = await import("./node-engine.mjs");
  const { edgeName } = await import("../src/lib/engine/notation.ts");
  const { toAnalysis: analysisOf } = await import("@abstractclass/analysis/reply.ts");
  const { analysisKey } = await import("@abstractclass/analysis/cache.ts");
  const { writeRecord } = await import("../src/lib/game/record.ts");
  const { enclosure, otherCandidate, secondChoice } = await import("../src/lib/review/enclosure.ts");
  const { shownMaps } = await import("@abstractclass/analysis/model.ts");
  // As the site keeps a result: the candidates' maps of those on the board alone, for the player to move
  const toAnalysis = reply => shownMaps(enclosure, analysisOf(enclosure, reply), reply.rootInfo.currentPlayer === "b" ? 0 : 1);
  const { parseEdge } = await import("../src/lib/engine/notation.ts");
  const threads = Number(process.argv[2] ?? Math.max(1, Math.min(12, availableParallelism() - 2)));
  const { manifest, module, call } = await nodeEngine(root);
  const version = call({ id: "v", action: "query_version" });
  const model = manifest.artifacts.find(a => a.kind === "model" && a.id === NETWORK);

  // The game: the practice bot on both sides, as scripts/home-replay.mjs's games were played by bots.
  const lib = await import(pathToFileURL(join(root, "static", manifest.artifacts.find(a => a.kind === "practice-library").url)).href);
  const bot = await lib.createPracticeBot(await WebAssembly.compile(readFileSync(join(root, "static", manifest.artifacts.find(a => a.kind === "practice-module").url))));
  bot.setModel(readFileSync(join(root, "static", model.url)));
  const gtp = line => { const r = bot.command(line); if (!r.startsWith("=")) throw new Error(`${line}: ${r}`); return r.slice(1).trim(); };
  gtp(`enclosure-start ${SEED}`);
  const moves = [];
  const describe = () => call({ id: "d", action: "describe", moves });
  for (let d = describe(); moves.length < EDGES && d.outcome === null; d = describe()) {
    gtp(`kata-set-param maxVisits ${BOT_VISITS[d.mover]}`);
    moves.push(gtp(`genmove ${d.mover === "b" ? "b" : "w"}`));
  }
  const positions = call({ id: "g", action: "describe_game", moves, from: 0 }).positions;
  console.log(`game: ${moves.length} edges, scores ${positions.at(-1).scores.map(Math.round).join(" to ")}`);

  /** Analyzes the positions (each as its moves) on `threads` engines. */
  async function analyze(jobs) {
    const out = new Map(), per = Math.ceil(jobs.length / threads), t0 = Date.now();
    await Promise.all(Array.from({ length: Math.min(threads, jobs.length) }, (_, k) => new Promise((resolve, reject) => {
      const w = new Worker(fileURLToPath(import.meta.url), { workerData: { jobs: jobs.slice(k * per, (k + 1) * per) } });
      w.on("message", ({ moves: m, reply }) => out.set(m.join(" "), reply));
      w.on("error", reject);
      w.on("exit", code => (code === 0 ? resolve() : reject(new Error(`worker exit ${code}`))));
    })));
    console.log(`${jobs.length} positions in ${Math.round((Date.now() - t0) / 1000)} s on ${threads} threads`);
    return out;
  }

  // The game's positions, but its end when the rules ended it: the review takes the result there.
  const over = positions.at(-1).outcome !== null;
  const main = await analyze(positions.slice(0, over ? -1 : undefined).map((_, i) => moves.slice(0, i)));
  const analysisAt = i => { const r = main.get(moves.slice(0, i).join(" ")); return r && toAnalysis(r); };
  // The positions that confirm a Great (GameAnalysis.data): after the second choice, and after the turn's other
  // candidate.
  const player = i => (positions[i].mover === "b" ? 0 : 1);
  const turnAt = i => {
    if (i > 0 && player(i - 1) === player(i)) return undefined;
    const e = parseEdge(moves[i]);
    return i + 1 < moves.length && player(i + 1) === player(i) ? [e, parseEdge(moves[i + 1])] : [e];
  };
  const extra = new Set();
  for (let i = 0; i < moves.length; i++) {
    const a = analysisAt(i), second = i + 1 < moves.length ? secondChoice(a) : undefined, t = turnAt(i);
    const other = t && i + t.length < moves.length ? otherCandidate(a, t) : undefined;
    for (const c of [second, other]) if (c) extra.add([...moves.slice(0, i), edgeName(c.edge)].join(" "));
  }
  for (const k of main.keys()) extra.delete(k);
  const confirms = await analyze([...extra].map(k => k.split(" ")));

  // The review file, as the Review tab's Export writes it (buildReviewFile).
  const turns = [];
  moves.forEach((_, i) => (i > 0 && player(i) === player(i - 1) ? turns.at(-1).moves++ : turns.push({ number: turns.length + 1, moves: 1 })));
  const [b, r] = positions.at(-1).scores, margin = String(Math.round(Math.abs(b - r) * 1e6) / 1e6);
  const result = over ? (b === r ? "0" : `${b > r ? "b" : "r"}+${margin}`) : "*";
  const record = writeRecord({ Event: "Hedge School test game", Site: "Hedge School", Blue: `HedgeFund, ${BOT_VISITS.b} visit`,
                                Red: `HedgeFund, ${BOT_VISITS.r} visits` }, moves, turns, result);
  const analyses = [...main, ...confirms].map(([k, reply]) => [analysisKey(version.search, model.sha256, k ? k.split(" ") : [], VISITS), toAnalysis(reply)]);
  const file = {
    format: "hedge-school-review", version: 1, exported: new Date().toISOString(), site: "test-fixture",
    review: { module: module.sha256, model: model.sha256, network: NETWORK, visits: VISITS, at: new Date().toISOString(), networkName: model.displayName },
    record, branches: null, analyses,
  };
  mkdirSync(join(root, "tests", "fixtures"), { recursive: true });
  const out = join(root, "tests", "fixtures", "hedgefund-review.json");
  writeFileSync(out, JSON.stringify(file) + "\n");
  console.log(`tests/fixtures/hedgefund-review.json: ${analyses.length} results, ${Math.round(readFileSync(out).length / 1024)} KB`);
}
