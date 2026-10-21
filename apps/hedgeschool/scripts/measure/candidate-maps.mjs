// A candidate's map from a short search (design 30): the full search's map of a candidate (includeMovesOwnership: the
// ownership of the candidate's subtree) against a short search of the position after the candidate's move, at a few
// visit counts. A stored result of an older shape has no candidates' maps, and the site adds one from such a search.
// The positions: every `step`-th position of the test fixture's game (tests/fixtures/hedgefund-review.json, the site's
// own game), searched as the Lite review searches them (HedgeFund 0.2 Lite, 512 visits), and their candidates on the
// board (shownMaps). For each candidate and each count, in ownership's units (from −1 to 1):
//   - the mean of |short − full| over the 361 points;
//   - the share of the points where the two disagree on the change style's mark at 0.5 (ownership.ts, areaMap);
//   - the short search's time, in milliseconds.
// The same short search at the full search's 512 visits shows how far two deep searches of one position differ: a
// short search closer than that adds no error that matters. In Node, on one thread (scripts/node-engine.mjs: `npm run
// engine` first).
//
//   node scripts/measure/candidate-maps.mjs [step]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { nodeEngine } from "../node-engine.mjs";
import { toAnalysis } from "@abstractclass/analysis/reply.ts";
import { shownMaps } from "@abstractclass/analysis/model.ts";
import { enclosure, edgeName } from "../../src/lib/review/enclosure.ts";
import { boardPosition } from "../../src/lib/engine/position.ts";
import { areaMap } from "../../src/lib/review/ownership.ts";
import { parseRecord } from "../../src/lib/game/record.ts";
import { FIXTURE, median } from "./speed.mjs";

const NETWORK = "b10c128-s89066368-d17827487", VISITS = 512, SHORT = [8, 16, 32, 64, 128, VISITS];
const root = fileURLToPath(new URL("../..", import.meta.url));
const step = Number(process.argv[2] ?? 10);
const { call } = await nodeEngine(root, { network: NETWORK });
const record = JSON.parse(readFileSync(new URL(`../../${FIXTURE}`, import.meta.url), "utf8")).record;
const moves = parseRecord(record).moves;
const search = (m, visits, extra = {}) => {
  const t0 = performance.now(), r = call({ id: "a", moves: m, maxVisits: visits, includeOwnership: true, ...extra });
  if (r.error) throw new Error(`${m.join(" ")}: ${r.error}`);
  return { reply: r, ms: performance.now() - t0 };
};
const positions = call({ id: "g", action: "describe_game", moves, from: 0 }).positions;

const rows = []; // one per candidate and count
for (let i = step; i < moves.length - 1; i += step) {
  const at = moves.slice(0, i), { reply } = search(at, VISITS, { includeMovesOwnership: true, includePVVisits: true });
  const a = shownMaps(enclosure, toAnalysis(enclosure, reply), reply.rootInfo.currentPlayer === "b" ? 0 : 1);
  for (const c of a.candidates.filter(c => c.ownership)) {
    const child = [...at, edgeName(c.edge)];
    const after = call({ id: "g", action: "describe_game", moves: child, from: child.length }).positions[0];
    if (after.outcome !== null) continue; // the move ends the game: nothing to search
    const now = boardPosition(after), full = areaMap("change", c.ownership, now, 50);
    for (const visits of SHORT) {
      const s = search(child, visits), short = toAnalysis(enclosure, s.reply).ownership;
      const mark = areaMap("change", short, now, 50);
      const mean = short.reduce((sum, v, k) => sum + Math.abs(v - c.ownership[k]), 0) / 361 / 100;
      const differ = mark.filter((m, k) => (m?.kind ?? null) !== (full[k]?.kind ?? null) || (m?.side ?? null) !== (full[k]?.side ?? null)).length / 361;
      rows.push({ edge: i, visits, mean, differ, ms: s.ms, candidateVisits: c.visits });
    }
  }
}

const n = new Set(rows.map(r => `${r.edge} ${r.candidateVisits}`)).size;
console.log(`${n} candidates on the board at ${new Set(rows.map(r => r.edge)).size} positions (every ${step}th edge), ` +
            `their visits in the full search: median ${median(rows.filter(r => r.visits === VISITS).map(r => r.candidateVisits))}\n`);
console.log("| Short search, visits | Mean difference (median, p90) | Points whose mark differs (median, p90) | Time, ms (median) |");
console.log("|---|---|---|---|");
const p90 = xs => [...xs].sort((a, b) => a - b)[Math.floor(0.9 * (xs.length - 1))];
for (const visits of SHORT) {
  const r = rows.filter(x => x.visits === visits), f = x => x.toFixed(3), pc = x => `${(100 * x).toFixed(1)}%`;
  console.log(`| ${visits} | ${f(median(r.map(x => x.mean)))}, ${f(p90(r.map(x => x.mean)))} | ` +
              `${pc(median(r.map(x => x.differ)))}, ${pc(p90(r.map(x => x.differ)))} | ${median(r.map(x => x.ms)).toFixed(0)} |`);
}
console.log(`\n(${positions.length} positions in the game)`);
