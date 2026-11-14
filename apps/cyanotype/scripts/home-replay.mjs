// The home page's board (src/routes/+page.svelte, src/lib/home/HomeReplay.svelte), as Hedge School's
// (apps/hedgeschool/scripts/home-replay.mjs): scenes from reviewed games, played on the board with the review's
// candidates and labels. Each game is a game of Stamp Duty against itself (src/lib/review/fixtures, from
// scripts/selfplay.mjs), and a stored review of it gives the engine's results: Hedge School's
// tests/fixtures/cyanotype-review.json (STORED, a review file) or another of its stored reviews (OTHER_STORED in
// tests/cyanotype-fixture.ts), which its scripts/cyanotype-review-fixture.mjs writes from real reviews. All of them
// must come from one engine and one network. The engine's rules (static/engine, after `npm run engine`) give the
// positions and what each move did, and the review's own rules give its labels by move
// (@abstractclass/analysis/model.ts, review), from the stored results at the label stage's depth, as the review reads
// them (GameAnalysis.fromStore, with the twins of withTwins). Each game stops at its last position with a stored
// result. A scene is the 9 turns before the game's latest move with a bad label, and that move: one scene a game. The
// review and the scene's choice are Hedge School's too (@abstractclass/analysis/homeScene.ts): this script draws the
// frames on Blueprints' board. Nothing names the players.
//
//   node scripts/home-replay.mjs STORED.json RECORD.txt [STORED.json RECORD.txt ...]
// writes src/lib/home/replay.json (the scenes, loaded after the page shows) and src/lib/home/still.json (the first
// frame, in the page itself). Run it again when a stored review is made again.
import { readFileSync, writeFileSync } from "node:fs";
import { nodeEngine } from "@abstractclass/engine/node-engine.mjs";
import { LABEL_VISITS } from "@abstractclass/analysis/cache.ts";
import { sceneOf, storedGameReview, storedResults, turnSoFar } from "@abstractclass/analysis/homeScene.ts";
import { LABEL_TEXT, shownCandidates, withTwins } from "@abstractclass/analysis/model.ts";
import { sitePosition } from "../src/lib/board/described.ts";
import { moveName } from "../src/lib/game/notation.ts";
import { parseRecord } from "../src/lib/game/record.ts";
import { blueprints, moveBefore } from "../src/lib/review/blueprints.ts";

const CANDIDATES = 3; // the candidates' ranks shown
const args = process.argv.slice(2);
if (!args.length || args.length % 2) throw new Error("usage: node scripts/home-replay.mjs STORED.json RECORD.txt [STORED.json RECORD.txt ...]");
const { call } = await nodeEngine(".");

const scenes = [], games = [];
let engine;
for (let a = 0; a < args.length; a += 2) {
  const [storedFile, recordFile] = args.slice(a, a + 2);
  const stored = JSON.parse(readFileSync(storedFile, "utf8"));
  // The engine that made the results: a review file's mark (src/lib/game/reviewFile.ts), or the top of another stored
  // review's file
  const { search, network, model } = stored.review ?? stored;
  engine ??= { search, network, model };
  if (search !== engine.search || model !== engine.model)
    throw new Error(`${storedFile}: the results of another engine than ${args[0]}'s (${search}, ${network})`);
  // The results of the stored review's network, each position's at the label stage's depth or deeper
  const resultOf = storedResults(stored.analyses, model, LABEL_VISITS);

  // The game, to its last position with a stored result.
  const all = parseRecord(readFileSync(recordFile, "utf8")).moves;
  let n = all.length;
  while (n > 0 && !resultOf(all.slice(0, n))) n--;
  const moves = all.slice(0, n);
  const fields = call({ id: "g", action: "describe_game", moves }).positions;
  const positions = fields.map(blueprints.position);
  const played = moves.map((m, i) => blueprints.played(m, fields[i], fields[i + 1]));
  const analysis = positions.map((_, i) => { const r = resultOf(moves.slice(0, i)); return r && withTwins(blueprints, r, positions[i]); });
  const R = storedGameReview(blueprints, { moves, positions, played, analysis, resultOf }, LABEL_VISITS);

  const game = recordFile.split(/[\\/]/).pop();
  const labels = R.edges.map(e => e.label ?? "-").join(" ");
  console.log(`${game}: ${moves.length} moves, ${analysis.filter(Boolean).length} positions with a result; labels by move: ${labels}`);
  const scene = sceneOf(R, moves.length);
  if (!scene) throw new Error(`${recordFile}: no move with a bad label to end a scene on`);
  const { key, first, last } = scene;
  const frames = [];
  for (let i = first.start; i <= last; i++) {
    const mover = positions[i].player, so = i > 0 ? turnSoFar(R, i) : [];
    frames.push({
      p: sitePosition(fields[i]), // the position as the board draws it
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
  console.log(`${game}: scene from turn ${first.number} to move ${key.index + 1}, in turn ${R.turnOf[key.index].number} ` +
              `(${key.label}, a loss of ${Math.round(key.loss * 100)}%), ${frames.length} frames`);
  scenes.push({ frames });
  games.push({ review: storedFile.split(/[\\/]/).pop(), record: game, from: first.start });
}

// Where each scene comes from, by scene: the stored review's file, the record's file and the scene's first position in
// the game, for the test that compares the scenes' labels with the Review tab's (Hedge School's
// tests/cyanotype-home.spec.ts).
const made = { by: "scripts/home-replay.mjs", labelVisits: LABEL_VISITS, search: engine.search, network: engine.network, games };
writeFileSync("src/lib/home/replay.json", JSON.stringify({ made, scenes }) + "\n");
writeFileSync("src/lib/home/still.json", JSON.stringify(scenes[0].frames[0]) + "\n");
const size = n => `${Math.round(n / 1024)} KB`;
console.log(`replay.json ${size(readFileSync("src/lib/home/replay.json").length)}, still.json ${size(readFileSync("src/lib/home/still.json").length)}`);
