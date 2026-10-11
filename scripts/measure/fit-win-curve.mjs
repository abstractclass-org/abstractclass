// Fits the curve that turns the engine's values into the win chance of human games (design 01, principle 2), on the
// archive's analysis (requests/07-archive-analysis.md: part 1, out of Git), and compares the candidate formulas.
//
//   node scripts/measure/fit-win-curve.mjs <part1.jsonl> [--budget 1024] [--fit all|1800]
//
// Each position of a game with a winner, from the side of the player to move: the engine's lead for them (L, its
// scoreLead), the edges left (E, of the game's 120), and whether they won. Abandoned games are left out, as Lichess
// leaves out abandoned games and time forfeits (lila pull request 11148). Each game counts as much as any other: a
// position weighs 1 / the game's positions. The games split by their id into 4 to fit and 1 to test.
//
// The formulas, each P(win) = σ(z), σ the logistic curve (Lichess's):
// - engine: the engine's win chance as it is (nothing fitted);
// - engine refitted: z = a · logit(engine's win chance) + b;
// - lead: z = k · L (Lichess's form, the lead for centipawns);
// - lead and edges left: z = k · L / √(E + c) (Stern's model of a lead and the time left, 1994);
// - lead and spread: z = k · L / the engine's scoreStdev;
// - lead by stage: z = k_s · L, one k for each block of 10 edges left (the data's own shape, to compare).
// Printed: aggregates only, no game.
import { createInterface } from "node:readline";
import { createReadStream } from "node:fs";

const inPath = process.argv[2];
const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : def; };
const budget = arg("budget", "1024");
const fitOn = arg("fit", "all");
const GAME_EDGES = 120;

const sigma = z => 1 / (1 + Math.exp(-z));
const logit = p => Math.log(p / (1 - p));
const clampP = p => Math.min(1 - 1e-6, Math.max(1e-6, p));
const bandOf = m => (m < 1600 ? "below 1600" : m < 1800 ? "1600 to 1800" : "1800 and above");
const testGame = id => [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % 5 === 0;

// The positions, and each game's turns (for the labels).
const games = new Map();
for await (const line of createInterface({ input: createReadStream(inPath) })) {
  const r = JSON.parse(line);
  if (r.budgets?.error || !r.facts.winner || r.facts.end === "abandonment" || !r.budgets[budget]) continue;
  if (!games.has(r.game)) games.set(r.game, { facts: r.facts, positions: new Map() });
  games.get(r.game).positions.set(r.index, r);
}
const rows = [];
for (const [id, { facts, positions }] of games) {
  const w = 1 / positions.size, rating = (facts.ratings.b + facts.ratings.r) / 2;
  for (const [i, r] of positions) {
    const v = r.budgets[budget], sign = v.mover === "b" ? 1 : -1;
    rows.push({ id, test: testGame(id), w, band: bandOf(rating), rating, y: facts.winner === v.mover ? 1 : 0,
                L: sign * v.scoreLead, E: GAME_EDGES - i, W: clampP(v.mover === "b" ? v.winrate : 1 - v.winrate),
                S: Math.max(1, v.scoreStdev) });
  }
}
const inFit = r => !r.test && (fitOn === "all" || r.rating >= Number(fitOn));
const fitRows = rows.filter(inFit), testRows = rows.filter(r => r.test);

// The weighted log-likelihood of z = a · x + b.
const likelihood = (data, x, a, b) => {
  let s = 0;
  for (const r of data) { const p = clampP(sigma(a * x(r) + b)); s += r.w * (r.y * Math.log(p) + (1 - r.y) * Math.log(1 - p)); }
  return s;
};
// Newton's method on the weighted log-likelihood, a step halved until the likelihood does not fall.
function fitAB(data, x, withB = true) {
  let a = 0, b = 0, now = likelihood(data, x, a, b);
  for (let it = 0; it < 100; it++) {
    let ga = 0, gb = 0, haa = 0, hab = 0, hbb = 0;
    for (const r of data) {
      const xi = x(r), p = sigma(a * xi + b), q = r.w * p * (1 - p);
      ga += r.w * (r.y - p) * xi; gb += r.w * (r.y - p); haa += q * xi * xi; hab += q * xi; hbb += q;
    }
    let da, db;
    if (withB) { const det = haa * hbb - hab * hab; da = (hbb * ga - hab * gb) / det; db = (haa * gb - hab * ga) / det; }
    else { da = ga / haa; db = 0; }
    let t = 1, next;
    while ((next = likelihood(data, x, a + t * da, b + t * db)) < now - 1e-12 && t > 1e-6) t /= 2;
    a += t * da; b += t * db;
    const done = Math.abs(next - now) < 1e-10;
    now = next;
    if (done) break;
  }
  return [a, b];
}
const fitK = (data, x) => fitAB(data, x, false)[0];
const logLoss = (data, f) => {
  let s = 0, w = 0;
  for (const r of data) { const p = clampP(f(r)); s -= r.w * (r.y * Math.log(p) + (1 - r.y) * Math.log(1 - p)); w += r.w; }
  return s / w;
};
const brier = (data, f) => { let s = 0, w = 0; for (const r of data) { s += r.w * (f(r) - r.y) ** 2; w += r.w; } return s / w; };

// The formulas.
const models = [];
models.push({ name: "engine", params: "", f: r => r.W });
{ const [a, b] = fitAB(fitRows, r => logit(r.W)); models.push({ name: "engine refitted", params: `a ${a.toFixed(3)}, b ${b.toFixed(3)}`, f: r => sigma(a * logit(r.W) + b) }); }
{ const k = fitK(fitRows, r => r.L); models.push({ name: "lead", params: `k ${k.toExponential(3)}`, f: r => sigma(k * r.L) }); }
{
  let best = null;
  for (const c of [0, 1, 2, 5, 10, 20, 40, 80, 160]) {
    const k = fitK(fitRows, r => r.L / Math.sqrt(r.E + c)), ll = logLoss(fitRows, r => sigma(k * r.L / Math.sqrt(r.E + c)));
    if (!best || ll < best.ll) best = { c, k, ll };
  }
  const { c, k } = best;
  models.push({ name: "lead and edges left", params: `k ${k.toFixed(4)}, c ${c}`, f: r => sigma(k * r.L / Math.sqrt(r.E + c)), k, c,
               x: r => r.L / Math.sqrt(r.E + c) });
}
{ const k = fitK(fitRows, r => r.L / r.S); models.push({ name: "lead and spread", params: `k ${k.toFixed(3)}`, f: r => sigma(k * r.L / r.S), k, x: r => r.L / r.S }); }
{
  // The same with a power on the ratio, below 1 for a steeper middle and gentler ends.
  const pow = p => r => { const u = r.L / r.S; return Math.sign(u) * Math.abs(u) ** p; };
  let best = null;
  for (const p of [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]) {
    const k = fitK(fitRows, pow(p)), ll = logLoss(fitRows, r => sigma(k * pow(p)(r)));
    if (!best || ll < best.ll) best = { p, k, ll };
  }
  const { p, k } = best, x = pow(p);
  models.push({ name: "lead and spread, power", params: `k ${k.toFixed(3)}, power ${p}`, f: r => sigma(k * x(r)), k, x });
}
{
  // The same ratio with the normal curve in place of the logistic (Stern's model is a probit). k by a fine grid.
  const erf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  const phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
  let best = null;
  for (let k = 0.2; k <= 2; k += 0.005) { const ll = logLoss(fitRows, r => phi(k * r.L / r.S)); if (!best || ll < best.ll) best = { k, ll }; }
  const { k } = best;
  models.push({ name: "lead and spread, normal", params: `k ${k.toFixed(3)}`, f: r => phi(k * r.L / r.S), k });
}
const stage = r => Math.min(11, Math.floor((r.E - 1) / 10)); // 0: 1 to 10 edges left … 11: 111 to 120
const ks = Array.from({ length: 12 }, (_, s) => fitK(fitRows.filter(r => stage(r) === s), r => r.L));
models.push({ name: "lead by stage", params: "12 k", f: r => sigma(ks[stage(r)] * r.L) });

console.log(`budget ${budget}, fitted on ${fitOn === "all" ? "every rating" : `mean rating ${fitOn} and above`}: ` +
            `${new Set(fitRows.map(r => r.id)).size} games, ${fitRows.length} positions; tested on ` +
            `${new Set(testRows.map(r => r.id)).size} games, ${testRows.length} positions (every rating)\n`);
console.log("| Formula | Fitted | Test log loss | Test Brier |\n|---|---|---|---|");
for (const m of models) console.log(`| ${m.name} | ${m.params} | ${logLoss(testRows, m.f).toFixed(4)} | ${brier(testRows, m.f).toFixed(4)} |`);

// The data's own shape: the k of each stage, against Stern's √(E + c).
const stern = models.find(m => m.name === "lead and edges left");
console.log("\n| Edges left | k by stage | Stern's k / √(E + c), at the block's middle |\n|---|---|---|");
ks.forEach((k, s) => { const mid = s * 10 + 5.5; console.log(`| ${s * 10 + 1} to ${s * 10 + 10} | ${k.toExponential(2)} | ${(stern.k / Math.sqrt(mid + stern.c)).toExponential(2)} |`); });

// Calibration on the test games, by rating band, for each formula named in --show (names apart by ";").
const shown = arg("show", "engine;engine refitted;lead and edges left;lead and spread").split(";").map(n => models.find(m => m.name === n));
const cuts = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.01];
const bands = ["every rating", "below 1600", "1600 to 1800", "1800 and above"];
for (const band of bands) {
  const data = testRows.filter(r => band === "every rating" || r.band === band);
  console.log(`\n${band}, test games: the share won where each formula gives a chance in the row's range (mean chance, won)`);
  console.log(`| Chance | ${shown.map(m => m.name).join(" | ")} |\n|---|${shown.map(() => "---").join("|")}|`);
  const cols = shown.map(m => {
    const t = cuts.map(() => ({ w: 0, p: 0, y: 0, n: 0 }));
    for (const r of data) { const p = m.f(r), c = t[cuts.findIndex(x => p < x)]; c.w += r.w; c.p += r.w * p; c.y += r.w * r.y; c.n++; }
    return t;
  });
  cuts.forEach((_, k) => console.log(`| ${k * 10} to ${k * 10 + 10}% | ${cols.map(t => t[k].n ? `${(100 * t[k].p / t[k].w).toFixed(0)}%, ${(100 * t[k].y / t[k].w).toFixed(0)}% (${t[k].n})` : "-").join(" | ")} |`));
}

// Each formula's k fitted on each rating band alone (Lichess's author found the constant falling with the rating).
console.log("\n| Rating band | " + shown.filter(m => m.x).map(m => `${m.name}: k on the band alone`).join(" | ") + " |\n|---|" +
            shown.filter(m => m.x).map(() => "---").join("|") + "|");
for (const band of bands.slice(1))
  console.log(`| ${band} | ${shown.filter(m => m.x).map(m => fitK(rows.filter(r => !r.test && r.band === band), m.x).toFixed(4)).join(" | ")} |`);

// The labels by turn with the fixed bands on each formula's chance: the turns that lose 0.05, 0.10 and 0.20 or more
// (Inaccuracy from 0.05, Mistake from 0.10, Blunder from 0.20). Every game, every band.
const tally = new Map();
for (const { facts, positions } of games.values()) {
  const band = bandOf((facts.ratings.b + facts.ratings.r) / 2);
  const idx = [...positions.keys()].sort((a, b) => a - b);
  for (const i of idx) {
    const r = positions.get(i), v = r.budgets[budget], m = v.mover;
    if (positions.get(i - 1)?.budgets[budget]?.mover === m) continue; // a turn's start
    let j = i; while (positions.get(j)?.budgets[budget]?.mover === m) j++;
    const e = positions.get(j)?.budgets[budget]; if (!e) continue; // the game's last turn: no searched end
    const sign = m === "b" ? 1 : -1;
    const at = (val, k) => ({ L: sign * val.scoreLead, E: GAME_EDGES - k, S: Math.max(1, val.scoreStdev),
                              W: clampP(m === "b" ? val.winrate : 1 - val.winrate) });
    const s0 = at(v, i), s1 = at(e, j);
    for (const key of ["every rating", band]) {
      if (!tally.has(key)) tally.set(key, { n: 0, by: shown.map(() => [0, 0, 0]) });
      const c = tally.get(key); c.n++;
      shown.forEach((m, k) => { const loss = m.f(s0) - m.f(s1); c.by[k][0] += loss >= 0.05; c.by[k][1] += loss >= 0.1; c.by[k][2] += loss >= 0.2; });
    }
  }
}
console.log("\nTurns that lose 0.05+ / 0.10+ / 0.20+ of each formula's chance (Inaccuracy or worse / Mistake or worse / Blunder)");
console.log(`| Rating band | Turns | ${shown.map(m => m.name).join(" | ")} |\n|---|---|${shown.map(() => "---").join("|")}|`);
for (const key of bands) {
  const c = tally.get(key), p = x => `${(100 * x / c.n).toFixed(0)}%`;
  console.log(`| ${key} | ${c.n} | ${c.by.map(([a, b, d]) => `${p(a)} / ${p(b)} / ${p(d)}`).join(" | ")} |`);
}
