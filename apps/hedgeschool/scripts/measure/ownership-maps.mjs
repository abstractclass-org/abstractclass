// The area maps on real games (design 30): from which edge the area that a Mistake or a Blunder lost is clear enough to
// show, and whether it agrees in side and rough size with the points lost. The meaf.us archive's human games, as the
// engine repository analysed them for the labels (its runs/archive_analysis/part1-1000.jsonl, request 07): the first
// `perBand` games of each rating band from 1 to 5 that the rules ended, with 120 edges. Each position before a move is
// searched again here as the Lite review searches it (HedgeFund 0.2 Lite, 512 visits), with the ownership of the root
// and of each candidate, on `threads` engines (scripts/node-engine.mjs: `npm run engine` first). For internal
// measurement only: the games are their players' (CLAUDE.md, "How to work").
//
// By turn, the labels' default unit (design 10): a turn is flagged when the mover's win chance fell by 0.10 or more (a
// Mistake or a Blunder, labels.ts) and it was not the engine's best turn. For each flagged turn: its first edge, its
// loss, its points lost (the lead), and its area lost (ownership.ts, lostArea) from the root's ownership at the turn's
// start to the root's ownership after it. The map is read by:
//   - side: the mover's ownership in all fell (the sum of the change over the points is below 0);
//   - size: the points lost against the fall in all times the turn ends left (ownership is a mean over them);
//   - focus: the share of the fall in the points that fall by 0.30 or more, the points that the map shades clearly
//     (ownership.ts, focusOf), and how many turns show their area lost (shownLost: a focus of 0.2 or more).
// Also, at each flagged turn's start: how far the root's ownership is from the ownership of the engine's first choice
// (the mean of the difference over the points), the choice of the root's map as "the ownership after the best move".
//
//   node scripts/measure/ownership-maps.mjs <part1-1000.jsonl> [perBand] [threads]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

const NETWORK = "b10c128-s89066368-d17827487", VISITS = 512;
const root = fileURLToPath(new URL("../..", import.meta.url));

if (!isMainThread) {
  const { nodeEngine } = await import("../node-engine.mjs");
  const { hundredths } = await import("@abstractclass/analysis/reply.ts");
  const { call } = await nodeEngine(root, { network: NETWORK });
  for (const moves of workerData.jobs) {
    const r = call({ id: "a", moves, maxVisits: VISITS, includeOwnership: true, includeMovesOwnership: true });
    if (r.error) throw new Error(`${moves.join(" ")}: ${r.error}`);
    const best = [...r.moveInfos].sort((a, b) => a.order - b.order)[0];
    parentPort.postMessage({ key: moves.join(" "), a: {
      blueWin: r.rootInfo.winrate, lead: r.rootInfo.scoreLead, mover: r.rootInfo.currentPlayer,
      ownership: r.ownership.map(hundredths), best: best.move, line: best.pv, bestOwnership: best.ownership.map(hundredths),
    } });
  }
} else {
  const { focusOf, lostArea, shownLost } = await import("../../src/lib/review/ownership.ts");
  const { moverScore, moverWin } = await import("@abstractclass/analysis/model.ts");
  const { corr, median } = await import("./speed.mjs");
  const [file, perBand = "2", threadsArg = "2"] = process.argv.slice(2);
  const threads = Number(threadsArg);
  const games = new Map();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line) continue;
    const p = JSON.parse(line);
    if (!games.has(p.game)) games.set(p.game, { facts: p.facts, played: [] });
    games.get(p.game).played[p.index] = p.played;
  }
  const meta = new Map(JSON.parse(readFileSync(`${file}.games.json`, "utf8")).map(g => [g.game, g]));
  const chosen = [];
  for (let band = 1; band <= 5; band++)
    chosen.push(...[...games].filter(([id, g]) => meta.get(id).band === band && meta.get(id).end === "score" && g.played.length === 120)
      .slice(0, Number(perBand)));
  const jobs = chosen.flatMap(([, g]) => g.played.map((_, i) => g.played.slice(0, i)));
  const t0 = Date.now(), results = new Map(), per = Math.ceil(jobs.length / threads);
  await Promise.all(Array.from({ length: threads }, (_, k) => new Promise((resolve, reject) => {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: { jobs: jobs.slice(k * per, (k + 1) * per) } });
    w.on("message", m => results.set(m.key, m.a));
    w.on("error", reject);
    w.on("exit", code => (code === 0 ? resolve() : reject(new Error(`worker exit ${code}`))));
  })));
  console.log(`${chosen.length} games, ${jobs.length} positions at ${VISITS} visits in ${Math.round((Date.now() - t0) / 1000)} s on ${threads} threads\n`);

  const rows = [];
  for (const [id, g] of chosen) {
    const at = i => results.get(g.played.slice(0, i).join(" "));
    // The turns: runs of one mover, from the positions' movers. The last turn has no search after it: left out.
    for (let s = 0; s < g.played.length;) {
      const mover = at(s).mover;
      let e = s + 1;
      while (e < g.played.length && at(e).mover === mover) e++;
      if (e >= g.played.length) break;
      const before = at(s), after = at(e), p = mover === "b" ? 0 : 1;
      const loss = moverWin(before.blueWin, p) - moverWin(after.blueWin, p), points = moverScore(before.lead - after.lead, p);
      const played = g.played.slice(s, e), best = [before.best, before.line[1]].slice(0, played.length);
      const isBest = played.every(m => best.includes(m)) && played.length === best.length;
      if (loss >= 0.10 && !isBest) {
        const lost = lostArea(before.ownership, after.ownership, p);
        const net = moverScore(before.ownership.reduce((sum, b, i) => sum + after.ownership[i] - b, 0), p) / 100;
        const turnEnds = Math.ceil((120 - e) / 2); // the turn ends left after the turn: each turn of two edges ends once
        const clear = focusOf(lost), shown = shownLost(lost);
        const gap = before.ownership.reduce((sum, v, i) => sum + Math.abs(v - before.bestOwnership[i]), 0) / 361 / 100;
        rows.push({ id, edge: s + 1, loss, points, size: lost.size, net, turnEnds, clear, shown, gap, held: [lost.before, lost.after] });
      }
      s = e;
    }
  }

  const f = (x, d = 2) => x.toFixed(d);
  const inEdges = (from, to) => rows.filter(x => x.edge >= from && x.edge <= to);
  console.log(`${rows.length} flagged turns (a loss of 0.10 or more, not the engine's best turn)\n`);
  console.log("| Edges | Turns | Side right | Focus (median) | Area lost, points of the board (median) | Points lost ÷ (net fall × turn ends left), median | Root against best choice, mean per point |");
  console.log("|---|---|---|---|---|---|---|");
  for (let from = 1; from <= 120; from += 20) {
    const r = inEdges(from, from + 19);
    if (!r.length) continue;
    const right = r.filter(x => x.net < 0), ratio = right.map(x => x.points / (-x.net * x.turnEnds));
    console.log(`| ${from}-${from + 19} | ${r.length} | ${right.length} | ${f(median(r.map(x => x.clear)))} | ` +
                `${f(median(r.map(x => x.size)), 1)} | ${f(median(ratio))} | ${f(r.reduce((s, x) => s + x.gap, 0) / r.length, 3)} |`);
  }
  // The turns that show their area lost (shownLost), by stage: the first 8 turns, the middle game, and after
  console.log("\n| Edges | Turns | Shown | Of those, side right |\n|---|---|---|---|");
  for (const [name, r] of [["1-16", inEdges(1, 16)], ["17-40", inEdges(17, 40)], ["41-60", inEdges(41, 60)], ["61-120", inEdges(61, 120)], ["All", rows]]) {
    const shown = r.filter(x => x.shown);
    console.log(`| ${name} | ${r.length} | ${shown.length} | ${shown.filter(x => x.net < 0).length} |`);
  }
  // The points lost against the fall times the turn ends, over every flagged turn whose side is right.
  const ok = rows.filter(x => x.net < 0), c = corr(ok.map(x => -x.net * x.turnEnds), ok.map(x => x.points));
  console.log(`\nPoints lost against the net fall × turn ends left: correlation ${f(c)} over ${ok.length} turns`);
  console.log("\nEach flagged turn: game, first edge, loss, points lost, area lost, net fall, focus, held before and after");
  for (const x of rows) console.log(`${x.id} ${x.edge} ${f(x.loss)} ${f(x.points, 0)} ${f(x.size, 1)} ${f(x.net, 1)} ${f(x.clear)} ${x.held.map(Math.round).join(" ")}`);
}
