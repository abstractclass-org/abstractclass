// KaTrain's complexity of a position, measured on the archive (request 08's first look, request 07's part 1 for the
// ratings): its spread, and whether the players err more in complex positions, at each rating.
//
//   node scripts/measure/complexity-check.mjs <part1.jsonl> <part1.jsonl.first-look.jsonl>
//
// KaTrain (katrain/core/ai.py, game_report): complexity = Σ prior · max(0, points lost) / Σ prior over the searched
// candidates, capped at 1 (Go point). A candidate's points lost: the root's lead less the candidate's, from the mover's
// side. Measured here in Enclosure's points, and also in win chance (the same mean with the candidate's loss of win
// chance), the unit of the site's labels. A played edge's loss: the mover's win chance at 512 visits before the edge
// less after it (the next position's search).
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { corr } from "./speed.mjs";

const [part1, firstLook] = process.argv.slice(2);
const lines = async function* (file) { for await (const l of createInterface({ input: createReadStream(file) })) if (l) yield JSON.parse(l); };

// The players' ratings by game
const ratings = new Map();
for await (const p of lines(part1)) if (!ratings.has(p.game)) ratings.set(p.game, p.facts.ratings);

// Each position's complexity and its root win chance, by game and index
const byGame = new Map();
for await (const p of lines(firstLook)) {
  const b = p.budgets?.["512"];
  if (!b?.candidates?.length) continue;
  const sign = p.mover === "b" ? 1 : -1, moverWin = w => (p.mover === "b" ? w : 1 - w);
  let sp = 0, pts = 0, win = 0;
  for (const c of b.candidates) {
    if (typeof c.prior !== "number") continue;
    sp += c.prior;
    pts += c.prior * Math.max(0, sign * (b.scoreLead - c.scoreLead));
    win += c.prior * Math.max(0, moverWin(b.winrate) - moverWin(c.winrate));
  }
  if (!sp) continue;
  if (!byGame.has(p.game)) byGame.set(p.game, []);
  byGame.get(p.game)[p.index] = { mover: p.mover, played: p.played, first: b.candidates[0].move, win: b.winrate, cPts: pts / sp, cWin: win / sp };
}

// Each played edge: its position's complexity and its loss
const rows = [];
for (const [game, ps] of byGame) {
  const r = ratings.get(game);
  for (let i = 0; i + 1 < ps.length; i++) {
    const a = ps[i], b = ps[i + 1];
    if (!a || !b || a.played === "pass") continue;
    const mw = w => (a.mover === "b" ? w : 1 - w);
    rows.push({ game, mover: a.mover, cPts: a.cPts, cWin: a.cWin, loss: Math.max(0, mw(a.win) - mw(b.win)), best: a.played === a.first,
                rating: r?.[a.mover] ?? NaN });
  }
}

const q = (xs, f) => { const s = [...xs].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; };
const fmt = x => (Math.abs(x) >= 10 ? x.toFixed(0) : x.toFixed(3));
console.log(`${rows.length} played edges of ${byGame.size} games`);
for (const [name, key] of [["points", "cPts"], ["win chance", "cWin"]]) {
  const xs = rows.map(r => r[key]);
  console.log(`\n## Complexity in ${name}: percentiles 10/25/50/75/90/99: ${[0.1, 0.25, 0.5, 0.75, 0.9, 0.99].map(f => fmt(q(xs, f))).join(" / ")}`);
  if (key === "cPts") console.log(`KaTrain's cap of 1 Go point, times 12 (12 points): ${(100 * xs.filter(x => x >= 12).length / xs.length).toFixed(1)}% of positions at the cap`);
  // Deciles of complexity: the players' error rates
  const sorted = [...rows].sort((x, y) => x[key] - y[key]);
  console.log("| decile | complexity up to | Mistake or worse (loss ≥ 0.10): all / under 1600 / 1600 to 1800 / 1800 and above | mean loss | engine's first choice played |");
  for (let d = 0; d < 10; d++) {
    const part = sorted.slice(Math.floor(d * sorted.length / 10), Math.floor((d + 1) * sorted.length / 10));
    const rate = (xs) => xs.length ? (100 * xs.filter(r => r.loss >= 0.10).length / xs.length).toFixed(0) + "%" : "-";
    const band = (lo, hi) => part.filter(r => r.rating >= lo && r.rating < hi);
    console.log(`| ${d + 1} | ${fmt(part.at(-1)[key])} | ${rate(part)} / ${rate(band(0, 1600))} / ${rate(band(1600, 1800))} / ${rate(band(1800, 9999))} | ` +
      `${(part.reduce((s, r) => s + r.loss, 0) / part.length).toFixed(3)} | ${(100 * part.filter(r => r.best).length / part.length).toFixed(0)}% |`);
  }
}

// A player's accuracy in a game: Lichess's accuracy of each edge (AccuracyPercent.scala, on the edge's loss in win%),
// averaged plainly, or weighed as KaTrain weighs a move: max(0.05, min(1, max(complexity / full, loss / 0.20))).
// How well each follows the players' ratings, over the games where both players have one.
const moveAccuracy = d => Math.min(100, Math.max(0, 103.1668 * Math.exp(-0.04354 * d) - 3.1669 + 1));
const byPlayer = new Map();
for (const r of rows) {
  if (!Number.isFinite(r.rating)) continue;
  const k = `${r.game}|${r.mover}`;
  if (!byPlayer.has(k)) byPlayer.set(k, { rating: r.rating, rows: [] });
  byPlayer.get(k).rows.push(r);
}
const players = [...byPlayer.values()].filter(p => p.rows.length >= 10);
const playerRatings = players.map(p => p.rating);
// `parts`: both of KaTrain's terms, or the complexity alone, or the loss alone
const accuracy = (p, full, parts = "both") => {
  let s = 0, w = 0;
  for (const r of p.rows) {
    const c = parts === "loss" ? 0 : r.cWin / full, l = parts === "complexity" ? 0 : r.loss / 0.20;
    const wt = full === null ? 1 : Math.max(0.05, Math.min(1, Math.max(c, l)));
    s += wt * moveAccuracy(100 * r.loss); w += wt;
  }
  return s / w;
};
console.log(`
## A player's accuracy in a game against the rating: ${players.length} players' games of 10 edges or more`);
console.log("| Weighing | correlation with the rating | mean accuracy: under 1600 / 1600 to 1800 / 1800 and above |");
for (const [full, parts] of [[null], [0.02], [0.05], [0.10], [0.20], [0.10, "complexity"], [1, "loss"]]) {
  const acc = players.map(p => accuracy(p, full, parts));
  const band = (lo, hi) => { const xs = acc.filter((_, i) => playerRatings[i] >= lo && playerRatings[i] < hi); return (xs.reduce((s, x) => s + x, 0) / xs.length).toFixed(1); };
  console.log(`| ${full === null ? "plain mean" : parts === "loss" ? "the loss's term alone" : `full weight at complexity ${full}${parts ? ", without the loss's term" : ""}`} | ${corr(acc, playerRatings).toFixed(3)} | ${band(0, 1600)} / ${band(1600, 1800)} / ${band(1800, 9999)} |`);
}
