// The home page's board (src/routes/+page.svelte, src/lib/home/HomeReplay.svelte), as Hedge School's
// (apps/hedgeschool/scripts/home-replay.mjs): scenes from a reviewed game, played on the board with the review's
// candidates and labels. The stored review of the review's test game gives the engine's results (Hedge School's
// tests/fixtures/cyanotype-review.json, which its scripts/cyanotype-review-fixture.mjs writes from a real review), and
// the record gives the game: a game of Stamp Duty against itself (src/lib/review/fixtures/stamp-duty.txt). The
// engine's rules (static/engine, after `npm run engine`) give its positions and what each move did, and the review's own
// rules give its labels by move (@abstractclass/analysis/model.ts, review), from the stored results at the label
// stage's depth, as the review reads them (GameAnalysis.fromStore, with the twins of withTwins). The game stops at its
// last position with a stored result. A scene is the 9 turns before the game's latest move with a bad label, and that
// move. So one game gives one scene, and more scenes need more reviewed games. Nothing names the players.
//
//   node scripts/home-replay.mjs STORED.json RECORD.txt
// writes src/lib/home/replay.json (the scenes, loaded after the page shows) and src/lib/home/still.json (the first
// frame, in the page itself). Run it again when the stored review is made again.
import { readFileSync, writeFileSync } from "node:fs";
import { nodeEngine } from "@abstractclass/engine/node-engine.mjs";
import { LABEL_VISITS, readAnalysisKey } from "@abstractclass/analysis/cache.ts";
import { BAD_LABELS } from "@abstractclass/analysis/labels.ts";
import { LABEL_TEXT, otherCandidate, review, secondChoice, shownCandidates, withTwins } from "@abstractclass/analysis/model.ts";
import { moveName } from "../src/lib/game/notation.ts";
import { parseRecord } from "../src/lib/game/record.ts";
import { blueprints, moveBefore } from "../src/lib/review/blueprints.ts";

const BEFORE = 9; // the turns before the scene's labelled move
const CANDIDATES = 3; // the candidates' ranks shown
const [storedFile, recordFile] = process.argv.slice(2);
if (!storedFile || !recordFile) throw new Error("usage: node scripts/home-replay.mjs STORED.json RECORD.txt");
const { call } = await nodeEngine(".");

const stored = JSON.parse(readFileSync(storedFile, "utf8"));
// The results of the stored network, each position's at the label stage's depth or deeper (cacheGetAtLeast).
const byMoves = new Map();
for (const [key, value] of stored.analyses) {
  const k = readAnalysisKey(key);
  if (k.map || k.model !== stored.model || k.visits < LABEL_VISITS) continue;
  const kept = byMoves.get(k.moves);
  if (!kept || kept.visits < k.visits) byMoves.set(k.moves, { visits: k.visits, value });
}
const resultOf = ms => byMoves.get(ms.join(" "))?.value;

// The game, to its last position with a stored result.
const all = parseRecord(readFileSync(recordFile, "utf8")).moves;
let n = all.length;
while (n > 0 && !resultOf(all.slice(0, n))) n--;
const moves = all.slice(0, n);
const fields = call({ id: "g", action: "describe_game", moves }).positions;
const positions = fields.map(blueprints.position);
const played = moves.map((m, i) => blueprints.played(m, fields[i], fields[i + 1]));
const analysisAt = (i, ms) => { const a = resultOf(ms); return a && withTwins(blueprints, a, positions[i]); };
const analysis = positions.map((_, i) => analysisAt(i, moves.slice(0, i)));
// GameAnalysis.data: the positions after the second choice, and after the turn's other candidate.
const after = (i, c) => (c ? resultOf([...moves.slice(0, i), moveName(c.edge)]) : undefined);
const turnAt = i => {
  const m = played[i];
  if (!m || (i > 0 && played[i - 1].player === m.player)) return undefined;
  const next = played[i + 1];
  return next && next.player === m.player ? [m.edge, next.edge] : [m.edge];
};
const seconds = played.map((_, i) => (i + 1 < played.length ? after(i, secondChoice(analysis[i])) : undefined));
const others = played.map((_, i) => {
  const t = turnAt(i);
  return t && i + t.length < played.length ? after(i, otherCandidate(blueprints, analysis[i], t)) : undefined;
});
const end = positions.at(-1).scores;
const R = review(blueprints, { players: { blue: "", red: "" }, result: { blue: end[0], red: end[1] }, moves: played, positions,
                               analysis, seconds, others }, "lead", LABEL_VISITS);

/** A position as the board draws it, with only what the board reads (SitePosition). */
const slim = p => ({ ply: p.ply, cells: p.cells, blueprints: p.blueprints, scores: p.scores });
/** The moves of the turn so far before position i, the last first: the last move, and an earlier one of its turn. */
const turnSoFar = i => {
  const out = [];
  for (let j = i - 1; j >= 0 && j >= R.turnOf[i - 1].start; j--) out.push(j);
  return out;
};

// The game's latest move with a bad label, away from its start and end, as Hedge School's scenes.
const key = R.edges.filter(e => R.turns.indexOf(R.turnOf[e.index]) >= BEFORE && e.index < moves.length - 2 && e.label
                                 && BAD_LABELS.includes(e.label)).at(-1);
if (!key) throw new Error("no move with a bad label to end a scene on");
const first = R.turns[R.turns.indexOf(R.turnOf[key.index]) - BEFORE], last = key.index + 1; // the position after the key move
const frames = [];
for (let i = first.start; i <= last; i++) {
  const mover = positions[i].player, so = i > 0 ? turnSoFar(i) : [];
  frames.push({
    p: slim(positions[i]),
    // The last move, and an earlier one of its turn, as the review marks them (ReviewBoard)
    l: so.length ? played[so[0]].drawn : null,
    e: so.slice(1).map(j => played[j].drawn),
    // The engine's candidates for the next move, as the review shows them (shownCandidates), the first three ranks: a
    // small board with no table beside it.
    c: i < last ? shownCandidates(blueprints, analysis[i], mover).filter(({ rank }) => rank <= CANDIDATES)
      .map(({ c, rank }) => ({ name: moveName(c.edge), move: moveBefore(c.edge, mover, positions[i].blueprints), rank, note: "" })) : [],
    // The labels by move of the turn so far, each on its move as it was played (ReviewBoard)
    m: so.filter(j => R.edges[j].label).map(j => ({ move: played[j].drawn, label: R.edges[j].label, note: LABEL_TEXT[R.edges[j].label] })),
    ...(i === key.index ? { hold: "before" } : i === last ? { hold: "moment" } : {}),
  });
}
console.log(`scene from turn ${first.number} to move ${key.index + 1}, in turn ${R.turnOf[key.index].number} ` +
            `(${key.label}, a loss of ${Math.round(key.loss * 100)}%), ${frames.length} frames`);
const scenes = [{ frames }];
const labels = R.edges.map(e => e.label ?? "-").join(" ");
console.log(`${moves.length} moves, ${analysis.filter(Boolean).length} positions with a result; labels by move: ${labels}`);

const made = { by: "scripts/home-replay.mjs", labelVisits: LABEL_VISITS, search: stored.search, network: stored.network };
writeFileSync("src/lib/home/replay.json", JSON.stringify({ made, scenes }) + "\n");
writeFileSync("src/lib/home/still.json", JSON.stringify(scenes[0].frames[0]) + "\n");
const size = n => `${Math.round(n / 1024)} KB`;
console.log(`replay.json ${size(readFileSync("src/lib/home/replay.json").length)}, still.json ${size(readFileSync("src/lib/home/still.json").length)}`);
