// Summarises budget-collect.mjs's output: how the labels and losses at each small budget differ from those at the deep
// reference, with the site's own label rules (src/lib/review/labels.ts).
//
//   node scripts/measure/budget-summary.mjs IN.jsonl [--skip-opening 16] [--unit edge|turn]
//
// An edge's loss is measured as the review measures it (src/lib/review/model.ts): the mover's value before it less the
// mover's value after it, each from that position's root, in win chance and in points (the lead, and the margin).
// Great is counted as Best: the collector keeps no second candidate. The last edge of a game is left out (its next
// position is the end, which the collector does not analyse).
//
// With --unit turn, a turn's loss is the mover's value at the turn's start less the mover's value after its last edge:
// the sum of its edges' losses, with the value between them cancelled. A turn is Best when every edge is the first
// choice. The game's last turn is left out, as its last edge is. The tables say also how many of the reference's bad
// turns have both edges, one edge or no edge bad alone.
import { readFileSync } from "node:fs";

const { classify, BAD_LABELS } = await import(new URL("../../src/lib/review/labels.ts", import.meta.url).href);

const [inPath] = process.argv.slice(2);
const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : def; };
const skipOpening = Number(arg("skip-opening", 16));
const unit = arg("unit", "edge");

const rows = readFileSync(inPath, "utf8").split("\n").filter(Boolean).map(JSON.parse).filter(r => !r.budgets.error);
const byGame = new Map();
for (const r of rows) {
  if (!byGame.has(r.game)) byGame.set(r.game, new Map());
  byGame.get(r.game).set(r.index, r);
}
const budgets = Object.keys(rows[0].budgets).map(Number).sort((a, b) => a - b);
const deep = budgets.at(-1);

const moverWin = (v, mover) => (mover === "b" ? v.winrate : 1 - v.winrate);
const moverScore = (v, mover, kind) => (mover === "b" ? 1 : -1) * (kind === "lead" ? v.scoreLead : v.scoreSelfplay);

/** Every edge's loss and label at budget b, by score kind. */
function edgesAt(b, kind) {
  const out = [];
  for (const [game, positions] of byGame)
    for (const [i, r] of positions) {
      const next = positions.get(i + 1);
      if (!next || !r.budgets[b] || !next.budgets[b]) continue;
      const v = r.budgets[b], w = next.budgets[b], mover = v.mover;
      const winLoss = Math.max(0, moverWin(v, mover) - moverWin(w, mover));
      const pointsLost = Math.max(0, moverScore(v, mover, kind) - moverScore(w, mover, kind));
      const playedBest = v.first?.move === r.played;
      out.push({ key: `${game}:${i}`, index: i, winLoss, pointsLost, label: classify(winLoss, pointsLost, playedBest, false) });
    }
  return out;
}

/** Every turn's loss and label at budget b, by score kind, with the keys of its edges. */
function turnsAt(b, kind) {
  const out = [];
  for (const [game, positions] of byGame)
    for (const [i, r] of positions) {
      const v = r.budgets[b], mover = v?.mover;
      if (!v || positions.get(i - 1)?.budgets[b]?.mover === mover) continue;
      let j = i, playedBest = true;
      for (; positions.get(j)?.budgets[b]?.mover === mover; j++)
        playedBest &&= positions.get(j).budgets[b].first?.move === positions.get(j).played;
      const w = positions.get(j)?.budgets[b];
      if (!w) continue;
      const winLoss = Math.max(0, moverWin(v, mover) - moverWin(w, mover));
      const pointsLost = Math.max(0, moverScore(v, mover, kind) - moverScore(w, mover, kind));
      out.push({ key: `${game}:${i}`, index: i, edges: Array.from({ length: j - i }, (_, k) => `${game}:${i + k}`),
                 winLoss, pointsLost, label: classify(winLoss, pointsLost, playedBest, false) });
    }
  return out;
}

const unitsAt = unit === "turn" ? turnsAt : edgesAt;
const bad = l => BAD_LABELS.includes(l);
const pct = x => `${(100 * x).toFixed(0)}%`;
console.log(`${byGame.size} games, ${rows.length} positions, budgets ${budgets.join(", ")} (reference ${deep}), by ${unit}`);
for (const kind of ["lead", "margin"]) {
  for (const scope of ["all", "after"]) {
    const keep = e => scope === "all" || e.index >= skipOpening;
    const ref = new Map(unitsAt(deep, kind).filter(keep).map(e => [e.key, e]));
    console.log(`\n### Points from the ${kind}, ${scope === "all" ? `every ${unit}` : `${unit}s after the first ${skipOpening} edges`}` +
                ` (${ref.size} ${unit}s; at ${deep} visits: ${[...ref.values()].filter(e => bad(e.label)).length} inaccuracies or worse)\n`);
    if (unit === "turn") {
      const edgeRef = new Map(edgesAt(deep, kind).map(e => [e.key, e]));
      const badTurns = [...ref.values()].filter(t => bad(t.label));
      const split = n => badTurns.filter(t => t.edges.filter(k => bad(edgeRef.get(k)?.label)).length === n).length;
      console.log(`At ${deep} visits, of the ${badTurns.length} bad turns: ${split(2)} with both edges bad alone, ` +
                  `${split(1)} with one, ${split(0)} with neither.\n`);
    }
    console.log("| Visits | Same label | Mistake flag: found | Mistake flag: right | Points lost, mean error | Win chance lost, mean error |");
    console.log("|---|---|---|---|---|---|");
    for (const b of budgets.slice(0, -1)) {
      const es = unitsAt(b, kind).filter(e => keep(e) && ref.has(e.key));
      const same = es.filter(e => e.label === ref.get(e.key).label).length / es.length;
      const refBad = es.filter(e => bad(ref.get(e.key).label)), flagged = es.filter(e => bad(e.label));
      const recall = refBad.filter(e => bad(e.label)).length / (refBad.length || 1);
      const precision = flagged.filter(e => bad(ref.get(e.key).label)).length / (flagged.length || 1);
      const mae = es.reduce((s, e) => s + Math.abs(e.pointsLost - ref.get(e.key).pointsLost), 0) / es.length;
      const maeWin = es.reduce((s, e) => s + Math.abs(e.winLoss - ref.get(e.key).winLoss), 0) / es.length;
      console.log(`| ${b} | ${pct(same)} | ${pct(recall)} | ${pct(precision)} | ${mae.toFixed(1)} | ${(100 * maeWin).toFixed(1)} points of % |`);
    }
  }
}
