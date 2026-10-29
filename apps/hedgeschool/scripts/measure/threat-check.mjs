// The threat on real games (design 31, beads abscls-mnqe): whether the engine reads the position after a pass well,
// though self-play has no timeouts, so that its network has seldom seen one. On the meaf.us archive's human games, as
// ownership-maps.mjs takes them (the engine repository's runs/archive_analysis/part1-1000.jsonl, request 07): the first
// `perBand` games of each rating band from 1 to 5 that the rules ended, with 120 edges. At two positions of every
// `step`, a turn's middle and the next turn's start (an even count of edges, then an odd one), it searches the position
// and the position after a pass as the Lite review searches (HedgeFund 0.2 Lite, 512 visits), on `threads` engines
// (@abstractclass/engine/node-engine.mjs: `npm run engine` first), and counts:
// - the threat's size, as the review shows it: the mover's win chance and points now less after the pass;
// - the network's own value (a search of 1 visit) against the search's, at the positions and after the passes: a
//   network that misreads a position after a pass differs from its search there more than elsewhere;
// - what the threat's turn does on the board (the rules play it): it closes area, cuts an edge, or neither;
// - whether the enemy played the threat's first edge in the game's next turn, by the size of the threat and of the
//   mover's loss there.
// For internal measurement only: the archive's games are their players' (CLAUDE.md, "How to work"), so the script
// prints counts alone. `--show` prints the threats themselves for the reader's own look, which stays out of the logs.
//
//   node scripts/measure/threat-check.mjs <part1-1000.jsonl> [perBand] [step] [threads] [--show]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

const NETWORK = "b10c128-s89066368-d17827487", VISITS = 512;
const root = fileURLToPath(new URL("../..", import.meta.url));

if (!isMainThread) {
  const { nodeEngine } = await import("@abstractclass/engine/node-engine.mjs");
  const { call } = await nodeEngine(root, { network: NETWORK });
  for (const moves of workerData.jobs) {
    const search = call({ id: "a", moves, maxVisits: VISITS, includePVVisits: true });
    const net = call({ id: "n", moves, maxVisits: 1 });
    if (search.error || net.error) throw new Error(`${moves.join(" ")}: ${search.error ?? net.error}`);
    parentPort.postMessage({ key: moves.join(" "), search, net });
  }
} else {
  const { nodeEngine } = await import("@abstractclass/engine/node-engine.mjs");
  const { toAnalysis } = await import("@abstractclass/analysis/reply.ts");
  const { enclosure, edgeName, moverScore, moverWin, threatTurn, turnFromCount } = await import("../../src/lib/review/enclosure.ts");
  const { boardPosition } = await import("../../src/lib/engine/position.ts");
  const { median } = await import("./speed.mjs");
  const args = process.argv.slice(2), show = args.includes("--show");
  const [file, perBand = "1", stepArg = "8", threadsArg = "2"] = args.filter(a => a !== "--show");
  const step = Number(stepArg), threads = Number(threadsArg);
  const { call } = await nodeEngine(root);
  const play = (moves, from = 0) => {
    const r = call({ id: "g", action: "describe_game", moves, from });
    if (r.error) throw new Error(`describe_game: ${r.error}`);
    return r.positions;
  };

  const all = new Map();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line) continue;
    const p = JSON.parse(line);
    if (!all.has(p.game)) all.set(p.game, []);
    all.get(p.game)[p.index] = p.played;
  }
  const meta = new Map(JSON.parse(readFileSync(`${file}.games.json`, "utf8")).map(g => [g.game, g]));
  const games = [];
  for (let band = 1; band <= 5; band++)
    for (const [, moves] of [...all].filter(([id, m]) => meta.get(id).band === band && meta.get(id).end === "score" && m.length === 120)
      .slice(0, Number(perBand))) games.push(moves);
  // The positions: two of every step from edge 4 to edge 112, a turn's middle and a turn's start, where the game goes
  // on for a turn of each player after the pass. Each with its position after a pass, and the position at the
  // enemy's next turn in the game, for the mover's loss there.
  const spots = games.flatMap((moves, g) => moves.map((_, i) => i).filter(i => i >= 4 && i <= 112 && i % step < 2).map(i => ({ g, i })));
  const oppTurn = i => i + (turnFromCount(i).first ? 2 : 1);
  const jobs = [...new Map(spots.flatMap(({ g, i }) => [games[g].slice(0, i), [...games[g].slice(0, i), "pass"], games[g].slice(0, oppTurn(i))])
    .map(m => [m.join(" "), m])).values()];
  const t0 = Date.now(), per = Math.ceil(jobs.length / threads), replies = new Map();
  await Promise.all(Array.from({ length: threads }, (_, k) => new Promise((resolve, reject) => {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: { jobs: jobs.slice(k * per, (k + 1) * per) } });
    w.on("message", m => replies.set(m.key, m));
    w.on("error", reject);
    w.on("exit", code => (code === 0 ? resolve() : reject(new Error(`worker exit ${code}`))));
  })));
  console.log(`${games.length} games, ${spots.length} positions and their passes at ${VISITS} visits in ${Math.round((Date.now() - t0) / 1000)} s on ${threads} threads\n`);

  const rows = [];
  for (const { g, i } of spots) {
    const moves = games[g], before = moves.slice(0, i), passed = [...before, "pass"];
    const now = replies.get(before.join(" ")), after = replies.get(passed.join(" "));
    const a = toAnalysis(enclosure, now.search), t = toAnalysis(enclosure, after.search);
    const fields = play(passed, i), from = boardPosition(fields[fields.length - 1]), p = boardPosition(play(before, i)[0]).player;
    const first = t.candidates[0];
    if (!first) continue;
    // The threat's turn, as the review draws it, played by the rules
    const threat = threatTurn(first, from), drawn = play([...passed, ...threat.map(edgeName)], i + 1);
    const steps = drawn.map(boardPosition), opp = from.player, gain = steps.at(-1).areas[opp] - steps[0].areas[opp];
    const cut = drawn.slice(1).some(f => f.cuts !== null);
    // The game's next turn of the enemy, after the mover's own edges
    const start = turnFromCount(i).first, oppFrom = oppTurn(i), played = moves.slice(oppFrom, oppFrom + 2);
    const played1 = moves[i + (start ? 1 : 0)];
    // The mover's loss in the game, over the mover's edges left in this turn: from this position to the enemy's turn
    const atOpp = replies.get(moves.slice(0, oppFrom).join(" "));
    const lost = atOpp ? moverWin(a.blueWin, p) - moverWin(toAnalysis(enclosure, atOpp.search).blueWin, p) : undefined;
    rows.push({
      start, stage: i < 40 ? "opening" : i < 80 ? "middle" : "end",
      cost: moverWin(a.blueWin, p) - moverWin(t.blueWin, p),
      pts: a.lead !== undefined && t.lead !== undefined ? moverScore(a.lead, p) - moverScore(t.lead, p) : undefined,
      netHere: Math.abs(now.net.rootInfo.winrate - now.search.rootInfo.winrate),
      netPass: Math.abs(after.net.rootInfo.winrate - after.search.rootInfo.winrate),
      kind: gain > 0 ? "closes" : cut ? "cuts" : "neither",
      realized: played.includes(edgeName(threat[0])), lost, edges: threat.length,
      // Only with --show, and never in a log
      text: show ? `${i}${start ? "" : "..."} ${played1} | threat ${threat.map(edgeName).join(" ")} cost ${(100 * (moverWin(a.blueWin, p) - moverWin(t.blueWin, p))).toFixed(1)}% gain ${gain} | played ${played.join(" ")}` : "",
    });
  }

  const pc = x => `${(100 * x).toFixed(1)}%`, n = (r, f) => r.filter(f).length;
  const groups = [["All", () => true], ["Turn start", r => r.start], ["Turn middle", r => !r.start],
                  ["Opening (0-39)", r => r.stage === "opening"], ["Middle (40-79)", r => r.stage === "middle"], ["End (80-112)", r => r.stage === "end"]];
  console.log("| Positions | Count | Median cost | Median pts | Cost under 0 | Cost 0.10 or more | Closes | Cuts | Neither | Net error here | Net error after the pass |");
  console.log("|---|---|---|---|---|---|---|---|---|---|---|");
  for (const [name, f] of groups) {
    const r = rows.filter(f);
    if (!r.length) continue;
    const pts = r.map(x => x.pts).filter(x => x !== undefined);
    console.log(`| ${name} | ${r.length} | ${pc(median(r.map(x => x.cost)))} | ${median(pts).toFixed(1)} | ${n(r, x => x.cost < 0)} | ${n(r, x => x.cost >= 0.1)} | ${n(r, x => x.kind === "closes")} | ${n(r, x => x.kind === "cuts")} | ${n(r, x => x.kind === "neither")} | ${median(r.map(x => x.netHere)).toFixed(3)} | ${median(r.map(x => x.netPass)).toFixed(3)} |`);
  }
  console.log("\nThe threat's first edge played by the enemy in the game's next turn");
  console.log("| Positions | Count | Played |");
  console.log("|---|---|---|");
  for (const [name, f] of [["All", () => true], ["Threat 0.10 or more", r => r.cost >= 0.1], ["Threat under 0.02", r => r.cost < 0.02],
                           ["Mover lost 0.10 or more", r => (r.lost ?? 0) >= 0.1], ["Threat 0.10 or more, mover lost 0.10 or more", r => r.cost >= 0.1 && (r.lost ?? 0) >= 0.1]]) {
    const r = rows.filter(f);
    if (r.length) console.log(`| ${name} | ${r.length} | ${n(r, x => x.realized)} (${pc(n(r, x => x.realized) / r.length)}) |`);
  }
  if (show) for (const r of rows) console.log(r.text);
}
