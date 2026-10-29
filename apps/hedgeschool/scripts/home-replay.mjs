// The home page's board (src/routes/+page.svelte, HomeReplay.svelte): scenes from reviewed games, played on the board
// with the review's candidates and labels. Each review file (the Review tab's Export → Review file) gives a game and
// the engine's stored results. The engine's rules (static/engine, after `npm run engine`) give its positions, and the
// review's own rules give its labels (model.ts review, by edge, as the review shows them when it judges each edge), from
// the results at the file's review depth, as the Review tab reads them (GameAnalysis.fromStore and data). A scene is
// the 9 turns before the game's latest edge with a bad label, and that edge. Nothing names the players.
//
//   node scripts/home-replay.mjs REVIEW.json [REVIEW.json ...]
// writes src/lib/home/replay.json (the scenes, loaded after the page shows) and src/lib/home/still.json (the first
// frame, in the page itself).
import { readFileSync, writeFileSync } from "node:fs";
import { nodeEngine } from "@abstractclass/engine/node-engine.mjs";
import { boardPosition } from "../src/lib/engine/position.ts";
import { edgeName, parseEdge } from "../src/lib/engine/notation.ts";
import { parseRecord } from "../src/lib/game/record.ts";
import { LABEL_VISITS, readAnalysisKey } from "@abstractclass/analysis/cache.ts";
import { BAD_LABELS } from "@abstractclass/analysis/labels.ts";
import { LABEL_TEXT, otherCandidate, review, secondChoice, shownCandidates } from "../src/lib/review/enclosure.ts";

const BEFORE = 9; // the turns before the scene's labelled turn
const CANDIDATES = 3; // the candidates' ranks shown
const files = process.argv.slice(2);
if (!files.length) throw new Error("usage: node scripts/home-replay.mjs REVIEW.json [REVIEW.json ...]");
const { call } = await nodeEngine(".");

const round = x => Math.round(x * 1000) / 1000;
/** A position as the board draws it, with only what the board reads. */
const slim = p => ({
  edges: p.edges, protected: p.protected, placed: p.placed, scores: p.scores.map(round), player: p.player,
  movesLeft: p.movesLeft, over: p.over, count: p.count,
  regions: p.regions.map(rs => rs.map(r => ({ area: 0, rings: r.rings.map(g => g.map(([x, y]) => [round(x), round(y)])) }))),
});

const scenes = [];
for (const file of files) {
  const f = JSON.parse(readFileSync(file, "utf8"));
  const moves = parseRecord(f.record).moves;
  // The results of the file's network, each position's at the review's depth or deeper (cacheGetAtLeast).
  const byMoves = new Map();
  for (const [key, value] of f.analyses) {
    const k = readAnalysisKey(key);
    if (k.model !== f.review.model || k.visits < f.review.visits) continue;
    const kept = byMoves.get(k.moves);
    if (!kept || kept.visits < k.visits) byMoves.set(k.moves, { visits: k.visits, value });
  }
  const analysisOf = ms => byMoves.get(ms.join(" "))?.value;
  const described = call({ id: "g", action: "describe_game", moves, from: 0 }).positions;
  const positions = described.map(boardPosition);
  const played = moves.map((m, i) => ({ player: positions[i].player, edge: m === "pass" ? null : parseEdge(m),
                                        cut: described[i + 1].cuts === null ? null : parseEdge(described[i + 1].cuts) }));
  const analysis = positions.map((_, i) => analysisOf(moves.slice(0, i)));
  // GameAnalysis.data: the positions after the second choice, and after the turn's other candidate.
  const after = (i, c) => (c ? analysisOf([...moves.slice(0, i), edgeName(c.edge)]) : undefined);
  const turnAt = i => {
    const m = played[i];
    if (!m || (i > 0 && played[i - 1].player === m.player)) return undefined;
    const next = played[i + 1];
    return next && next.player === m.player ? [m.edge, next.edge] : [m.edge];
  };
  const seconds = played.map((_, i) => (i + 1 < played.length ? after(i, secondChoice(analysis[i])) : undefined));
  const others = played.map((_, i) => { const t = turnAt(i); return t && i + t.length < played.length ? after(i, otherCandidate(analysis[i], t)) : undefined; });
  const end = positions.at(-1).scores;
  const R = review({ players: { blue: "", red: "" }, result: { blue: end[0], red: end[1] }, moves: played, positions, analysis, seconds, others },
                   "lead", LABEL_VISITS);

  // The game's latest edge with a bad label, away from its start and end: the latest, so that the board is fuller (the
  // bots' bad edges come early in these games).
  const key = R.edges.filter(e => R.turns.indexOf(R.turnOf[e.index]) >= BEFORE && e.index < moves.length - 2 && e.label && BAD_LABELS.includes(e.label)).at(-1);
  if (!key) throw new Error(`${file}: no labelled edge to end a scene on`);
  const first = R.turns[R.turns.indexOf(R.turnOf[key.index]) - BEFORE], last = key.index + 1; // the position after the key edge
  // The badges by edge, as the review shows them (ReviewView's marksHere): the edges of the turn so far, each with its
  // own label.
  const marksAt = i => {
    const out = [];
    for (let j = i - 1; j >= 0 && j >= R.turnOf[i - 1].start; j--) {
      const e = R.edges[j];
      if (e.edge && e.label) out.push({ edge: e.edge, label: e.label, note: LABEL_TEXT[e.label] });
    }
    return out;
  };
  const frames = [];
  for (let i = first.start; i <= last; i++) {
    const mover = positions[i].player;
    frames.push({
      p: slim(positions[i]),
      // The engine's candidates for the next edge, as the review shows them (shownCandidates), the first three ranks: a
      // small board with no table beside it.
      c: i < last ? shownCandidates(analysis[i], mover).filter(({ rank }) => rank <= CANDIDATES).map(({ c, rank }) => ({ edge: c.edge, rank, note: "" })) : [],
      m: i > 0 ? marksAt(i) : [],
      ...(i === key.index ? { hold: "before" } : i === last ? { hold: "moment" } : {}),
    });
  }
  const missing = analysis.slice(0, moves.length).filter(a => !a).length;
  console.log(`${file.split(/[\\/]/).pop()}: ${moves.length} edges, review ${f.review.visits} visits (${missing} positions without), ` +
              `scene from turn ${first.number} to edge ${key.index + 1}, in turn ${R.turnOf[key.index].number} (${key.label}, a loss of ${Math.round(key.loss * 100)}%), ${frames.length} frames`);
  scenes.push({ frames });
}

writeFileSync("src/lib/home/replay.json", JSON.stringify({ made: { by: "scripts/home-replay.mjs", labelVisits: LABEL_VISITS }, scenes }) + "\n");
writeFileSync("src/lib/home/still.json", JSON.stringify(scenes[0].frames[0]) + "\n");
const size = n => `${Math.round(n / 1024)} KB`;
console.log(`replay.json ${size(readFileSync("src/lib/home/replay.json").length)}, still.json ${size(readFileSync("src/lib/home/still.json").length)}`);
