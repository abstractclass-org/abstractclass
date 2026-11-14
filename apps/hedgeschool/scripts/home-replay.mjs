// The home page's board (src/routes/+page.svelte, HomeReplay.svelte): scenes from reviewed games, played on the board
// with the review's candidates and labels. Each review file (the Review tab's Export → Review file) gives a game and
// the engine's stored results. The engine's rules (static/engine, after `npm run engine`) give its positions, and the
// review's own rules give its labels (model.ts review, by edge, as the review shows them when it judges each edge), from
// the results at the file's review depth, as the Review tab reads them (GameAnalysis.fromStore and data). A scene is
// the 9 turns before the game's latest edge with a bad label, and that edge. Nothing names the players. Cyanotype's
// script shares the review and the scene's choice (@abstractclass/analysis/homeScene.ts): this one draws the frames.
//
//   node scripts/home-replay.mjs REVIEW.json [REVIEW.json ...]
// writes src/lib/home/replay.json (the scenes, loaded after the page shows) and src/lib/home/still.json (the first
// frame, in the page itself).
import { readFileSync, writeFileSync } from "node:fs";
import { nodeEngine } from "@abstractclass/engine/node-engine.mjs";
import { boardPosition } from "../src/lib/engine/position.ts";
import { parseEdge } from "../src/lib/engine/notation.ts";
import { parseRecord } from "../src/lib/game/record.ts";
import { LABEL_VISITS } from "@abstractclass/analysis/cache.ts";
import { SCENE_CANDIDATES, sceneHold, sceneOf, storedGameReview, storedResults, turnSoFar }
  from "@abstractclass/analysis/homeScene.ts";
import { LABEL_TEXT, enclosure, shownCandidates } from "../src/lib/review/enclosure.ts";

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
  // The results of the file's network, each position's at the review's depth or deeper
  const resultOf = storedResults(f.analyses, f.review.model, f.review.visits);
  const described = call({ id: "g", action: "describe_game", moves, from: 0 }).positions;
  const positions = described.map(boardPosition);
  const played = moves.map((m, i) => ({ player: positions[i].player, edge: m === "pass" ? null : parseEdge(m),
                                        cut: described[i + 1].cuts === null ? null : parseEdge(described[i + 1].cuts) }));
  const analysis = positions.map((_, i) => resultOf(moves.slice(0, i)));
  const R = storedGameReview(enclosure, { moves, positions, played, analysis, resultOf }, LABEL_VISITS);

  const scene = sceneOf(R, moves.length);
  if (!scene) throw new Error(`${file}: no labelled edge to end a scene on`);
  const { key, first, last } = scene;
  // The badges by edge, as the review shows them (ReviewView's marksHere): the edges of the turn so far, each with its
  // own label.
  const marksAt = i => turnSoFar(R, i).map(j => R.edges[j]).filter(e => e.edge && e.label)
    .map(e => ({ edge: e.edge, label: e.label, note: LABEL_TEXT[e.label] }));
  const frames = [];
  for (let i = first.start; i <= last; i++) {
    const mover = positions[i].player;
    frames.push({
      p: slim(positions[i]),
      // The engine's candidates for the next edge, as the review shows them (shownCandidates), the first ranks
      c: i < last ? shownCandidates(analysis[i], mover).filter(({ rank }) => rank <= SCENE_CANDIDATES)
        .map(({ c, rank }) => ({ edge: c.edge, rank, note: "" })) : [],
      m: marksAt(i),
      ...sceneHold(scene, i),
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
