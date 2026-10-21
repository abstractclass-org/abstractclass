// What the key moments from the first turn on (design 10, item 7) rest on, measured on the engine repository's archive
// analysis (runs/archive_analysis/, read only; its README.md gives the fields; protocol 0.3, network s46923648). It
// prints, in this order, the numbers of decisions/product.md, "The key moments from the first turn on":
//   1. The share of turns flagged (not the engine's line, and a loss of more than 0.05 of the mover's win chance:
//      Inaccuracy or worse) by turn number, for the site's network against itself (ladder-384, 512 visits), bots rated
//      2,000 to 3,000 (gauntlet-620, 512) and people (part2-100, 4,096), and the mean loss of the network's own turns.
//   2. How often a flag at 512 visits is right (the 4,096 reading also flags it), in the first 8 turns and later, and
//      how many of the people's key moments are in the first 8 turns when nothing is cut.
//   3. What the key moments' deeper search (the review's second step) changes, on part2-100, with the key moments
//      after the first 8 turns (as the review took them until the cut went) and from the first turn on. The page's
//      step is emulated as +page.svelte momentPositions does it: the key moments by edge and by turn, deepened
//      together, again until they stay. "Right": the moment is one of the 4,096 reading's key moments, or has its label
//      there. The visits are the search's own (the sweep 32 a position, the label pass at the base depth, the step at
//      the deeper depth for each position it deepens), and a deepened search counts in full.
//   4. What the Greats' confirmations change, on part1-1000's follow-ups: of the one-search gaps (the played edge or
//      turn is the engine's first choice and its second looks 0.10 of win chance worse), how many the equal search of the
//      position after the second choice confirms (model.ts confirmedOnly, judgeTurn), and what the searches cost.
//
//   node scripts/measure/key-moments-opening.mjs [../../../engines/runs/archive_analysis] [--only opening|reliable|step|great]
//
// The labels are the site's (@abstractclass/analysis/labels.ts classify, model.ts review): an edge's or a turn's loss
// is the mover's win chance at its start less the one after it, from the readings at the budget given. About 1 s a
// part (about 5 s for all).
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";

const dir = process.argv[2]?.startsWith("--") ? undefined : process.argv[2];
const ARCHIVE = dir ?? "../../../engines/runs/archive_analysis";
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
const BANDS = [["excellent", 0.02], ["good", 0.05], ["inaccuracy", 0.10], ["mistake", 0.20]];
const LABELS = ["great", "best", "excellent", "good", "inaccuracy", "mistake", "blunder"];
const BAD = new Set(["inaccuracy", "mistake", "blunder"]);
const FLAG_LOSS = 0.05, GREAT_GAP = 0.10, OPENING_TURNS = 8, MOMENTS = 8;
const classify = (loss, best) => { if (best) return "best"; for (const [l, u] of BANDS) if (loss <= u) return l; return "blunder"; };
const moverWin = (w, m) => (m === "b" ? w : 1 - w);
const pct = (x, d = 0) => `${(100 * x).toFixed(d)}%`;
const share = (a, b, d = 1) => pct(a / b, d);
const median = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const range = (xs, d = 0) => { const lo = Math.min(...xs), hi = Math.max(...xs); return pct(lo, d) === pct(hi, d) ? pct(lo, d) : `${pct(lo, d)} to ${pct(hi, d)}`; };

async function* lines(file) { for await (const l of createInterface({ input: createReadStream(file) })) if (l) yield JSON.parse(l); }
/** A file of the archive's positions as games: `ps[index]` is the position after that many edges. */
async function readGames(file) {
  const games = new Map();
  for await (const p of lines(join(ARCHIVE, file))) {
    if (!p.budgets || p.budgets.error) continue;
    if (!games.has(p.game)) games.set(p.game, { facts: p.facts, ps: [] });
    games.get(p.game).ps[p.index] = p;
  }
  return games;
}
/** The turn starts of a game (the positions where a turn begins). */
const turnStarts = ps => ps.map((p, i) => (p?.turnStart ? i : -1)).filter(i => i >= 0);
/** Whether the turn played from `s` to `e` is the engine's line at the turn's start: the same edges as the first
 *  candidate's line, in either order (the review's Best). */
function engineLine(ps, s, e, budget) {
  const played = ps.slice(s, e).map(q => q?.played), pv = ps[s].budgets[budget].top3?.[0]?.pv?.slice(0, played.length) ?? [];
  return pv.length === played.length && [...pv].sort().join() === [...played].sort().join();
}

// --- 1. The flags by turn number ------------------------------------------------------------------------------------
/** For each turn number, the turns' count, mean loss and share flagged. Bot games leave out their drawn opening. */
function flagsByTurn(games, budget) {
  const rows = new Map();
  for (const [, g] of games) {
    const ps = g.ps, starts = turnStarts(ps);
    for (let k = 0; k + 1 < starts.length; k++) {
      const s = starts[k], e = starts[k + 1], p = ps[s], q = ps[e];
      if (!p || !q || (g.facts.openingPlies && s < g.facts.openingPlies)) continue;
      const loss = moverWin(p.budgets[budget].winrate, p.mover) - moverWin(q.budgets[budget].winrate, p.mover);
      const r = rows.get(k + 1) ?? { n: 0, loss: 0, flagged: 0 };
      r.n++; r.loss += loss; if (!engineLine(ps, s, e, budget) && loss > FLAG_LOSS) r.flagged++;
      rows.set(k + 1, r);
    }
  }
  return rows;
}
/** The rows of the turns from `lo` to `hi`, as one value per turn (`per`) or the group's (`group`). */
const cells = (rows, lo, hi, f, d = 0, group = false) => {
  const rs = [...rows].filter(([t]) => t >= lo && t <= hi).map(([, r]) => r);
  if (!rs.length) return "drawn at random";
  if (!group) return range(rs.map(f), d);
  const n = rs.reduce((a, r) => a + r.n, 0);
  return pct(rs.reduce((a, r) => a + f(r) * r.n, 0) / n, d);
};
async function opening() {
  const sets = [["The site's network against itself (ladder-384, 512)", "ladder-384.jsonl", "512"],
                ["Bots rated 2,000 to 3,000 (gauntlet-620, 512)", "gauntlet-620.jsonl", "512"],
                ["People (part2-100, 4,096)", "part2-100.jsonl", "4096"]];
  const rows = [];
  for (const [name, file, budget] of sets) { const games = await readGames(file); rows.push([name, flagsByTurn(games, budget), games.size]); }
  console.log("## 1. Turns flagged by turn number (a range is the lowest and the highest turn of the group)\n");
  console.log(`| Turns | ${rows.map(r => `${r[0]}, ${r[2]} games`).join(" | ")} |\n|---|---|---|---|`);
  for (const [name, lo, hi, group] of [["1 to 3", 1, 3], ["4 to 8", 4, 8], ["9 to 12", 9, 12, true], ["13 to 20", 13, 20, true], ["21 on", 21, 1e9, true]])
    console.log(`| ${name} | ${rows.map(([, r]) => cells(r, lo, hi, x => x.flagged / x.n, 0, group)).join(" | ")} |`);
  const self = rows[0][1];
  console.log("\nThe mean loss of win chance of the network's own turns (ladder-384, 512):");
  console.log(`- turns 4 to 8: ${cells(self, 4, 8, x => x.loss / x.n, 1)}; turns 9 to 12: ${cells(self, 9, 12, x => x.loss / x.n, 1, true)}; turns 13 to 20: ${cells(self, 13, 20, x => x.loss / x.n, 1, true)}; turns 21 on: ${cells(self, 21, 1e9, x => x.loss / x.n, 1, true)}`);
  console.log(`- turns 1 to 3 of the people (part2-100, 4,096): ${cells(rows[2][1], 1, 3, x => x.loss / x.n, 1)}; turns 4 to 8: ${cells(rows[2][1], 4, 8, x => x.loss / x.n, 1)}; turns 21 on: ${cells(rows[2][1], 21, 1e9, x => x.loss / x.n, 1, true)}`);
  console.log();
}

// --- 2 and 3. The review's labels and key moments from a game's readings -----------------------------------------------
/** The game's edges and turns judged with each position read at `budgetOf(i)`. */
function judge(g, budgetOf) {
  const ps = g.ps, n = ps.length, final = g.facts.winner === "b" ? 1 : g.facts.winner === "r" ? 0 : 0.5;
  const blue = i => (i >= n ? final : ps[i]?.budgets[budgetOf(i)]?.winrate);
  const edges = ps.map((p, i) => {
    const before = blue(i), after = blue(i + 1);
    if (!p || before === undefined || after === undefined) return null;
    const loss = Math.max(0, moverWin(before, p.mover) - moverWin(after, p.mover));
    return { index: i, loss, label: classify(loss, p.budgets[budgetOf(i)].first?.move === p.played) };
  });
  const starts = turnStarts(ps), turns = [];
  for (let k = 0; k < starts.length; k++) {
    const s = starts[k], e = k + 1 < starts.length ? starts[k + 1] : n, p = ps[s], before = blue(s), after = blue(e);
    if (!p || before === undefined || after === undefined) { turns.push(null); continue; }
    const firstChoices = ps.slice(s, e).every((q, j) => q?.budgets[budgetOf(s + j)]?.first?.move === q.played);
    const loss = Math.max(0, moverWin(before, p.mover) - moverWin(after, p.mover));
    turns.push({ start: s, end: e, loss, label: classify(loss, firstChoices || engineLine(ps, s, e, budgetOf(s))) });
  }
  return { edges, turns, openingEnd: starts[Math.min(OPENING_TURNS, starts.length - 1)] ?? 0 }; // the position where turn 9 starts
}
const severity = x => LABELS.indexOf(x.label) * 1e6 + x.loss;
/** The key moments: the worst `MOMENTS` turns or edges at Inaccuracy or worse, from the position `from` on, in game order. */
function moments(J, unit, from) {
  const at = x => (unit === "edge" ? x.index : x.start);
  return (unit === "edge" ? J.edges : J.turns).filter(x => x && BAD.has(x.label) && at(x) >= from)
    .sort((a, b) => severity(b) - severity(a)).slice(0, MOMENTS).sort((a, b) => at(a) - at(b))
    .map(x => (unit === "edge" ? { first: x.index, last: x.index, label: x.label } : { first: x.start, last: x.end - 1, label: x.label }));
}
const positionsOf = ms => ms.flatMap(m => Array.from({ length: m.last - m.first + 2 }, (_, k) => m.first + k));
const judged = (J, unit, m) => (unit === "edge" ? J.edges[m.first] : J.turns.find(t => t && t.start === m.first));

async function reliable() {
  const games = await readGames("part2-100.jsonl"), T = {};
  const add = (k, v = 1) => { T[k] = (T[k] ?? 0) + v; };
  for (const [, g] of games) {
    const base = judge(g, () => "512"), ref = judge(g, () => "4096");
    for (const unit of ["turn", "edge"]) {
      const xs = unit === "edge" ? base.edges : base.turns, rs = unit === "edge" ? ref.edges : ref.turns;
      xs.forEach((x, k) => {
        if (!x || !BAD.has(x.label)) return;
        const where = (unit === "edge" ? x.index : x.start) < base.openingEnd ? "first 8 turns" : "later";
        add(`${unit} ${where} flagged at 512`);
        if (rs[k] && BAD.has(rs[k].label)) add(`${unit} ${where} flagged at 512 and at 4096`);
      });
      const ms = moments(base, unit, 0);
      for (const m of ms) {
        const where = m.first < base.openingEnd ? "first 8 turns" : "later", r = judged(ref, unit, m);
        add(`${unit} key moments ${where}`); if (r && BAD.has(r.label)) add(`${unit} key moments ${where} bad at 4096`);
      }
    }
  }
  console.log(`## 2. Opening flags and key moments without the cut (part2-100, ${games.size} games, flags and moments at 512)\n`);
  for (const unit of ["turn", "edge"]) {
    const f = w => `${share(T[`${unit} ${w} flagged at 512 and at 4096`], T[`${unit} ${w} flagged at 512`], 0)} (${T[`${unit} ${w} flagged at 512 and at 4096`]} of ${T[`${unit} ${w} flagged at 512`]})`;
    const k = w => `${T[`${unit} key moments ${w}`]}, ${share(T[`${unit} key moments ${w} bad at 4096`], T[`${unit} key moments ${w}`], 0)} Inaccuracy or worse at 4,096`;
    const all = T[`${unit} key moments first 8 turns`] + T[`${unit} key moments later`];
    console.log(`- By ${unit}: of the flags at 512, the 4,096 reading also flags ${f("first 8 turns")} in the first 8 turns and ${f("later")} later.`);
    console.log(`  Key moments at 512 with no cut: ${all}; in the first 8 turns ${k("first 8 turns")}; later ${k("later")}.`);
  }
  console.log();
}

async function step() {
  const games = await readGames("part2-100.jsonl"), positions = [...games.values()].reduce((a, g) => a + g.ps.filter(Boolean).length, 0);
  console.log(`## 3. The key moments' deeper search (part2-100: ${games.size} games, ${positions} positions; the reference reads every position at 4,096)\n`);
  for (const [cut, title] of [[true, "After the first 8 turns (the review until the cut went; the figures of the issue's comment)"], [false, "From the first turn on (the review now)"]]) {
    const T = {};
    const add = (k, v = 1) => { T[k] = (T[k] ?? 0) + v; };
    const from = J => (cut ? J.openingEnd : 0);
    const changed = { edge: 0, turn: 0 }, deepAlone = { edge: 0, turn: 0 };
    const runs = [["512", "1024"], ["1024", "2048"]];
    for (const [, g] of games) {
      const ref = judge(g, () => "4096");
      for (const [b0, b1] of runs) {
        const base = judge(g, () => b0), all = judge(g, () => b1);
        /** The page's step for the given units: their key moments' positions at `b1`, again until the moments stay. */
        const stepFor = units => {
          const deep = new Set(units.flatMap(u => positionsOf(moments(base, u, from(base))).filter(i => i < g.ps.length)));
          let J;
          for (let r = 0; r < 20; r++) {
            J = judge(g, i => (deep.has(i) ? b1 : b0));
            const before = deep.size;
            for (const i of units.flatMap(u => positionsOf(moments(J, u, from(J))))) if (i < g.ps.length) deep.add(i);
            if (deep.size === before) break;
          }
          return { J, deep };
        };
        const { J: stepJ, deep } = stepFor(["edge", "turn"]);
        add(`${b0} deepened`, deep.size);
        for (const unit of ["edge", "turn"]) {
          const refM = moments(ref, unit, from(ref)), refK = new Set(refM.map(m => m.first));
          for (const [name, J] of [[`${b0}`, base], [`${b0} step`, stepJ], [`${b1} all`, all]]) {
            const M = moments(J, unit, from(J));
            add(`${unit} ${name} | n`, M.length);
            add(`${unit} ${name} | ref moment`, M.filter(m => refK.has(m.first)).length);
            add(`${unit} ${name} | ref label`, M.filter(m => judged(ref, unit, m)?.label === m.label).length);
          }
          // One unit's step alone: does it change a key moment or its label?
          if (b0 === "512") {
            const alone = stepFor([unit]).J, a = moments(base, unit, from(base)), b = moments(alone, unit, from(alone));
            if (a.length !== b.length || a.some((m, k) => m.first !== b[k].first || m.label !== b[k].label)) changed[unit]++;
          }
        }
      }
    }
    console.log(`### ${title}\n`);
    console.log("| Depth | Key moments by edge right | Labels right | Key moments by turn right | Labels right |\n|---|---|---|---|---|");
    const row = (name, b, tag) => console.log(`| ${name} | ${["edge", "turn"].map(u => `${share(T[`${u} ${tag} | ref moment`], T[`${u} ${tag} | n`])} | ${share(T[`${u} ${tag} | ref label`], T[`${u} ${tag} | n`])}`).join(" | ")} |`);
    row("512 (Lite)", "512", "512"); row("512, then the step to 1,024", "512", "512 step"); row("1,024 everywhere (Standard)", "1024", "1024 all");
    row("1,024, then the step to 2,048", "1024", "1024 step"); row("2,048 everywhere", "2048", "2048 all");
    // The visits: the sweep at 32 a position, the label pass, the step at the deeper depth for each position it deepens
    const sweep = 32 * positions;
    for (const [b0, b1] of runs) {
      const label = +b0 * positions, stepVisits = +b1 * T[`${b0} deepened`];
      console.log(`- From ${b0} to ${b1}: the step deepens ${T[`${b0} deepened`]} positions (${(T[`${b0} deepened`] / games.size).toFixed(1)} a game, ${share(T[`${b0} deepened`], positions)} of all). `
        + `Its ${stepVisits} visits, each deepened search counted in full, are ${share(stepVisits, sweep + label + stepVisits)} of the sweep, the label pass and the step together `
        + `and ${share(stepVisits, label)} of the label pass. A review with every position at ${b1} adds ${share(+b1 - +b0, +b0, 0)} to the label pass.`);
    }
    console.log(`- The step of the 512 depth, by one unit alone, changes a key moment or its label in ${changed.edge} of ${games.size} games by edge and ${changed.turn} by turn (the key moments compared as sets, with their labels).\n`);
  }
}

// --- 4. The Greats' confirmations ---------------------------------------------------------------------------------------
async function great() {
  const [edgeFile, turnFile] = ["part1-1000.jsonl.great-edge.jsonl", "part1-1000.jsonl.great-turn.jsonl"].map(f => join(ARCHIVE, f));
  let positions = 0; const gameSet = new Set();
  for await (const p of lines(join(ARCHIVE, "part1-1000.jsonl"))) { positions++; gameSet.add(p.game); }
  const e = { gaps: 0, last: 0, confirmed: 0, refuted: 0, ofRefuted: [], ofConfirmed: [] }, edgeSearches = new Set();
  for await (const x of lines(edgeFile)) {
    e.gaps++;
    const f = x.followups[0];
    edgeSearches.add(`${x.game} ${x.index} ${f.move}`);
    if (!x.after) { e.last++; continue; } // the game's last edge: no Great (nothing confirms it)
    if (moverWin(x.after.winrate, x.mover) - moverWin(f.root.winrate, x.mover) >= GREAT_GAP) { e.confirmed++; e.ofConfirmed.push(f.gap); }
    else { e.refuted++; e.ofRefuted.push(f.gap); }
  }
  const t = { best: 0, asked: 0, searches: 0, oneSearch: 0, confirmed: 0, shared: 0 };
  for await (const x of lines(turnFile)) {
    t.best++; t.searches += x.followups.length;
    for (const f of x.followups) // a turn's search from its start is the edge search at its first position, from its middle the one after
      if (edgeSearches.has(`${x.game} ${x.turnStart + (f.from === "middle" ? 1 : 0)} ${f.move}`)) t.shared++;
    if (!x.followups.length) continue;
    t.asked++;
    const start = x.followups.find(f => f.from === "start"), middle = x.followups.find(f => f.from === "middle");
    if (!start || (x.edges.length > 1 && !middle)) continue; // a Great in one search needs each gap in its own search
    t.oneSearch++;
    const after = moverWin(x.after.winrate, x.mover);
    if (x.followups.every(f => after - moverWin(f.root.winrate, x.mover) >= GREAT_GAP)) t.confirmed++;
  }
  const rest = e.gaps - e.last, searches = e.gaps + t.searches - t.shared;
  console.log(`## 4. The Greats' confirmations (part1-1000: ${gameSet.size} games, ${positions} positions, 512 visits)\n`);
  console.log(`- By edge: ${e.gaps} gaps in one search (${e.last} more at a game's last edge, which nothing confirms). The equal search keeps ${e.confirmed} (${share(e.confirmed, rest, 0)}) and refutes ${e.refuted} (${share(e.refuted, rest, 0)}).`);
  console.log(`  Refuted, by the one search's gap: ${[[0.10, 0.15], [0.15, 0.25], [0.25, 0.5], [0.5, 1.01]].map(([lo, hi]) => {
    const c = e.ofConfirmed.filter(g => g >= lo && g < hi).length, r = e.ofRefuted.filter(g => g >= lo && g < hi).length;
    return `${lo.toFixed(2)} to ${hi > 1 ? "over 0.5" : hi.toFixed(2)}: ${share(r, c + r, 0)}`.replace("0.50 to over 0.5", "over 0.5");
  }).join("; ")}.`);
  console.log(`  The median one-search gap: ${median(e.ofRefuted).toFixed(3)} of the refuted, ${median(e.ofConfirmed).toFixed(3)} of the kept.`);
  console.log(`- By turn: ${t.oneSearch} Greats in one search (of ${t.best} best turns, ${t.asked} with a follow-up), ${t.confirmed} confirmed (${share(t.confirmed, t.oneSearch, 0)}).`);
  console.log(`- Cost: ${searches} searches (${e.gaps} by edge, ${t.searches} by turn, ${t.shared} shared) of 512 visits for ${positions} positions, ${share(searches, positions)} of the label pass at 512.\n`);
}

for (const [name, run] of [["opening", opening], ["reliable", reliable], ["step", step], ["great", great]]) if (!only || only === name) await run();
