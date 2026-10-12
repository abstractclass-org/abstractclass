// The label rules tested on bot games of known strength (requests 09 and 10): for each rule, how often a player's
// turns are flagged as its strength rises, where the flags fall (the stage, decided positions), and whether accuracy
// tells the stronger player. The rules judge a turn as the site does (design 10): the mover's chance at the turn's
// start against the chance after its last edge, both from the root of a search of 512 visits.
//
//   node scripts/measure/label-bench.mjs ../enclosure/runs/archive_analysis/ladder-384.jsonl [more files]
//
// The rules:
// - engine: the engine's own win chance, chess.com's bands (Excellent to 0.02, Good to 0.05, Inaccuracy to 0.10,
//   Mistake to 0.20, then Blunder). The labels before 2026-10-12 without their point bands.
// - engine+points: the same, and the worse with KaTrain's point bands times 12 (18, 36, 72, 144 points lost): the
//   labels before 2026-10-12.
// - practical: σ(0.99 · lead / scoreStdev), the same bands: the labels since 2026-10-12.
// A turn played as the engine's first line (top3[0].pv) is Best, whatever its loss. The first four edges of the bot
// games were drawn at random, so their turns 1 to 3 are left out, and so is every game's last turn, which has no
// position after it. The archive's human games (request 07's part 1) have no player names: their players are grouped
// by rating (under 1600, 1600 to 1800, 1800 and above), and abandoned games are left out.
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

const BUDGET = "512";
const BANDS = [["excellent", 0.02], ["good", 0.05], ["inaccuracy", 0.10], ["mistake", 0.20]];
const POINT_BANDS = [["excellent", 18], ["good", 36], ["inaccuracy", 72], ["mistake", 144]];
const ORDER = ["best", "excellent", "good", "inaccuracy", "mistake", "blunder"];
const band = (bands, loss) => { for (const [l, upTo] of bands) if (loss <= upTo) return l; return "blunder"; };
const worse = (a, b) => (ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b);
const sigmoid = x => 1 / (1 + Math.exp(-x));
const RULES = ["engine", "engine+points", "practical"];
const BAD = new Set(["inaccuracy", "mistake", "blunder"]), SERIOUS = new Set(["mistake", "blunder"]);
// Lichess's accuracy of a move from its loss in win percent (lila: AccuracyPercent.fromWinPercents)
const accuracy = lossPct => Math.min(100, Math.max(0, 103.1668 * Math.exp(-0.04354 * Math.max(0, lossPct)) - 3.1669));

async function readGames(file) {
  const games = new Map();
  for await (const line of createInterface({ input: createReadStream(file) })) {
    if (!line) continue;
    const p = JSON.parse(line);
    if (!p.budgets || p.budgets.error || !p.budgets[BUDGET]) continue;
    if (p.facts?.end === "abandonment") continue;
    if (!games.has(p.game)) games.set(p.game, { facts: p.facts, positions: [] });
    games.get(p.game).positions[p.index] = p;
  }
  return games;
}

/** The mover's values at a position, from the 512-visit reading. */
function view(p, mover) {
  const b = p.budgets[BUDGET];
  const sign = mover === "b" ? 1 : -1;
  const win = mover === "b" ? b.winrate : 1 - b.winrate;
  const lead = sign * b.scoreLead;
  return { win, lead, practical: sigmoid(0.99 * lead / Math.max(1, b.scoreStdev)) };
}

function turns(game) {
  const ps = game.positions;
  const starts = ps.map((p, i) => (p?.turnStart ? i : -1)).filter(i => i >= 0);
  const out = [];
  for (let k = 0; k < starts.length; k++) {
    const s = starts[k], e = k + 1 < starts.length ? starts[k + 1] : ps.length;
    if ((game.facts.openingPlies && s <= 3) || e >= ps.length || !ps[e] || !ps[s]) continue; // the random opening, the last turn
    const mover = ps[s].mover;
    const before = view(ps[s], mover), after = view(ps[e], mover);
    const played = ps.slice(s, e).map(p => p.played);
    const pv = ps[s].budgets[BUDGET].top3?.[0]?.pv?.slice(0, played.length) ?? [];
    const playedBest = pv.length === played.length && [...pv].sort().join() === [...played].sort().join();
    const winLoss = before.win - after.win, practicalLoss = before.practical - after.practical;
    const pointsLost = before.lead - after.lead;
    const label = {
      engine: playedBest ? "best" : band(BANDS, winLoss),
      "engine+points": playedBest ? "best" : worse(band(BANDS, winLoss), band(POINT_BANDS, pointsLost)),
      practical: playedBest ? "best" : band(BANDS, practicalLoss),
    };
    const lossPct = { engine: winLoss * 100, "engine+points": winLoss * 100, practical: practicalLoss * 100 };
    out.push({ s, mover, label, lossPct, decided: before.win > 0.95 || before.win < 0.05 });
  }
  return out;
}

const pct = (n, d) => (d ? (100 * n / d).toFixed(1) : "-");
const pearson = (xs, ys) => {
  const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
};

for (const file of process.argv.slice(2)) {
  const games = await readGames(file);
  console.log(`\n## ${file.split(/[\\/]/).pop()}: ${games.size} games`);
  const byPlayer = new Map(); // name -> { rating, visits, turns, counts per rule }
  const where = Object.fromEntries(RULES.map(r => [r, { opening: 0, middle: 0, end: 0, decided: 0, serious: 0 }]));
  const allTurns = { opening: 0, middle: 0, end: 0, decided: 0, n: 0 };
  const gameRows = [];
  for (const [, g] of games) {
    const ts = turns(g);
    const acc = Object.fromEntries(RULES.map(r => [r, { b: [], r: [] }]));
    for (const t of ts) {
      const r0 = g.facts.ratings?.[t.mover];
      const name = g.facts[t.mover === "b" ? "blue" : "red"] ?? (r0 < 1600 ? "people under 1600" : r0 < 1800 ? "people 1600 to 1800" : "people 1800 and above");
      const rating = g.facts.blue ? r0 : r0 < 1600 ? 1500 : r0 < 1800 ? 1700 : 1900, visits = g.facts.visits?.[t.mover];
      if (!byPlayer.has(name)) byPlayer.set(name, { rating, visits, turns: 0, counts: Object.fromEntries(RULES.map(r => [r, { bad: 0, serious: 0, blunder: 0 }])) });
      const pl = byPlayer.get(name);
      pl.turns++;
      const stage = t.s < 40 ? "opening" : t.s < 80 ? "middle" : "end";
      allTurns[stage]++; allTurns.n++; if (t.decided) allTurns.decided++;
      for (const r of RULES) {
        const l = t.label[r];
        if (BAD.has(l)) pl.counts[r].bad++;
        if (SERIOUS.has(l)) { pl.counts[r].serious++; where[r].serious++; where[r][stage]++; if (t.decided) where[r].decided++; }
        if (l === "blunder") pl.counts[r].blunder++;
        acc[r][t.mover].push(accuracy(t.lossPct[r]));
      }
    }
    const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
    gameRows.push({
      ratingGap: g.facts.ratings.b - g.facts.ratings.r,
      winner: g.facts.winner,
      acc: Object.fromEntries(RULES.map(r => [r, mean(acc[r].b) - mean(acc[r].r)])),
    });
  }

  console.log("\n### Flags by player (per 100 of the player's turns: inaccuracy or worse / mistake or worse / blunder)");
  const players = [...byPlayer.entries()].sort((a, b) => a[1].rating - b[1].rating);
  console.log(`| player | rating | turns | ${RULES.join(" | ")} |`);
  for (const [name, p] of players) {
    const short = name.replace(/^kg:v2a:b10c128-s46923648-d9407005:/, "site net @").replace(/-d\d+/, "");
    console.log(`| ${short} | ${p.rating.toFixed(0)} | ${p.turns} | ` +
      RULES.map(r => `${pct(p.counts[r].bad, p.turns)} / ${pct(p.counts[r].serious, p.turns)} / ${pct(p.counts[r].blunder, p.turns)}`).join(" | ") + " |");
  }
  console.log("\nRating against flags (Pearson, players weighted alike; negative: stronger players are flagged less):");
  for (const r of RULES) {
    const rs = players.map(([, p]) => p.rating);
    console.log(`- ${r}: inaccuracy or worse ${pearson(rs, players.map(([, p]) => p.counts[r].bad / p.turns)).toFixed(2)}, ` +
      `mistake or worse ${pearson(rs, players.map(([, p]) => p.counts[r].serious / p.turns)).toFixed(2)}`);
  }

  console.log("\n### Where the mistakes and blunders fall (share of all; the turns' own shares for comparison)");
  console.log(`| rule | opening (edges to 39) | middle (40-79) | end (80-119) | decided (engine's chance over 0.95 or under 0.05) |`);
  console.log(`| all turns | ${pct(allTurns.opening, allTurns.n)} | ${pct(allTurns.middle, allTurns.n)} | ${pct(allTurns.end, allTurns.n)} | ${pct(allTurns.decided, allTurns.n)} |`);
  for (const r of RULES) {
    const w = where[r];
    console.log(`| ${r} (${w.serious}) | ${pct(w.opening, w.serious)} | ${pct(w.middle, w.serious)} | ${pct(w.end, w.serious)} | ${pct(w.decided, w.serious)} |`);
  }

  console.log("\n### Accuracy against strength (Lichess's accuracy of a move from its loss in win percent; a game's player's mean)");
  for (const r of RULES) {
    const decided = gameRows.filter(g => g.winner);
    const agrees = decided.filter(g => (g.acc[r] > 0) === (g.winner === "b")).length;
    const ratingAgrees = decided.filter(g => (g.ratingGap > 0) === (g.winner === "b")).length;
    console.log(`- ${r}: accuracy gap against rating gap r = ${pearson(gameRows.map(g => g.ratingGap), gameRows.map(g => g.acc[r])).toFixed(2)}; ` +
      `the more accurate player won ${pct(agrees, decided.length)}% of games (the higher rated: ${pct(ratingAgrees, decided.length)}%)`);
  }
}
