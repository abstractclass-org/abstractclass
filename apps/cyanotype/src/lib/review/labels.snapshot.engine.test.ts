// The label snapshot of Cyanotype: its quality labels on its stored reviews (apps/hedgeschool/tests/fixtures/
// cyanotype-review.json and the others of OTHER_STORED in apps/hedgeschool/tests/cyanotype-review.ts, which
// apps/hedgeschool/scripts/cyanotype-review-fixture.mjs writes), by move and by turn, in a committed text file for each
// (apps/hedgeschool/tests/snapshots/review-labels/<file's name less "-review.json">.txt), as Hedge School's label
// snapshot (apps/hedgeschool/src/lib/review/labels.snapshot.test.ts). The labels come from the code that the review page
// runs (routes/review/+page.svelte), with no engine search: GameAnalysis with Blueprints' game and the engine's rules
// (describe_game, the CPU module with no network), the steps of storedReview.ts (openStored: the page takes its first
// steps, then reads the stored results as it does), then data() and review(). So a change of @abstractclass/analysis,
// @abstractclass/review or Blueprints' game that moves a quality label of a stored review fails here. The failure
// names the move and its quality labels, old and new.
//
// The stored reviews, all at Lite (512 visits a position), on games of Stamp Duty against itself, Blue at 4 visits a
// move and Red at 64 (scripts/selfplay.mjs):
// - cyanotype-review.json: the game that Cyanotype's browser tests review (testRecord), the review's test game to the
//   end of turn 20. Its first note is a Mistake at turn 12. It reaches Best, Excellent, Good, Inaccuracy and Mistake.
// - cyanotype-whole-review.json: the whole test game. It reaches a Blunder by move and by turn (move 60, turn 31), 3
//   turns that play the engine's best turn in the other order (turns 25, 26 and 33), and twins (two moves that give
//   one position, design 33, item 9) at the positions after 85 and 93 moves (before turns 44 and 48).
// - cyanotype-seed12-review.json: the game of seed 12 (fixtures/stamp-duty-seed12.txt) to the end of turn 23. It
//   reaches a Great by move (move 39, turn 20, Red's capture 2@-27,-17).
// The test for each stored review fails when it stops reaching what it reaches now (REVIEWS). The snapshot's header
// counts the labels by kind, the turns in the other order and the twins (reaches), so a change shows in its diff. No
// stored review reaches a Great by turn. Cyanotype's page takes it from the shared review's code
// (@abstractclass/analysis), and Hedge School's label snapshot covers it on Enclosure.
//
// After a change that moves labels on purpose, update the label snapshots: run
//   node --test --test-update-snapshots src/lib/review/labels.snapshot.engine.test.ts
// in apps/cyanotype, read the diff of the snapshot files, and commit them with the change. The commit message says why
// each label moved. Without that flag, a missing snapshot file fails the test. The test reads the engine from
// static/engine (`npm run engine` first). Without it, the test skips, and in CI (the variable CI set) it fails: there
// the step `cyanotype-engine` of check:all fetches it before the step `cyanotype-test`, so a missing engine is a fault,
// not a skip. When Cyanotype's engine.lock.json takes a new release, write the stored reviews again (their script's
// header says how), then update the snapshots.
import { test } from "node:test";
import assert from "node:assert/strict";
import { basename, join } from "node:path";
import "@abstractclass/analysis/testing/svelteModules.ts";
import type { PositionQuery } from "@abstractclass/engine/protocol.ts";
import type { EnginePool } from "@abstractclass/engine/pool.ts";
import { hasEngine, nodeEngine } from "@abstractclass/engine/node-engine.mjs";
import { LABEL_VISITS, analysisKey, readAnalysisKey } from "@abstractclass/analysis/cache.ts";
import { review, type Review, type Unit } from "@abstractclass/analysis/model.ts";
import { LABELS, type Label } from "@abstractclass/analysis/labels.ts";
import { PLAYER_NAME } from "@abstractclass/review/game.ts";
import { STORES, dbPutMany } from "@abstractclass/storage/db.ts";
import { memoryDb } from "@abstractclass/storage/memoryDb.ts";
import { parseRecord, playerNames } from "../game/record.ts";
import { blueprints, playedText, type Blueprints } from "./blueprints.ts";
import { OTHER_STORED, STORED, TEST_GAME, readStored, testRecord } from "../../../../hedgeschool/tests/cyanotype-review.ts";

memoryDb(queueMicrotask); // the store that fromStore reads
const { GameAnalysis } = await import("@abstractclass/analysis/analysis.svelte.ts");
const { openStored } = await import("./storedReview.ts");

const app = join(import.meta.dirname, "..", "..", "..");
const snapshots = join(app, "..", "hedgeschool", "tests", "snapshots", "review-labels");
/** A stored review: its file in apps/hedgeschool, its game and the turns that it reviews (cyanotype-review.ts), the
 *  first lines of its snapshot's header, and what it reaches now: the kinds of label by move and by turn (`reached`),
 *  the kinds by move alone (`byMove`), and whether it has turns in the other order than the engine's best turn and
 *  positions with a twin. Its snapshot file has its file's name, less "-review.json". */
interface Stored {
  file: string; game: string; turns: number | undefined; title: string[];
  reached: Label[]; byMove: Label[]; swapped: boolean; twins: boolean;
}
/** The other stored review whose file is `file` (cyanotype-review.ts, OTHER_STORED). */
function other(file: string) {
  const s = OTHER_STORED.find(o => o.file === file);
  if (!s) throw new Error(`OTHER_STORED has no ${file}`);
  return { ...s, title: [`# Cyanotype's quality labels on apps/hedgeschool/${file}, the game`,
                         `# apps/cyanotype/src/lib/review/fixtures/${s.game} to the end of turn ${s.turns}`,
                         "# (apps/cyanotype/src/lib/review/labels.snapshot.engine.test.ts)."] };
}
const REVIEWS: Stored[] = [
  { file: STORED, game: TEST_GAME, turns: undefined, reached: ["best", "excellent", "good", "inaccuracy", "mistake"],
    byMove: [], swapped: false, twins: false,
    title: [`# Cyanotype's quality labels on apps/hedgeschool/tests/fixtures/cyanotype-review.json, the test game to the end of`,
            "# turn 20 (apps/cyanotype/src/lib/review/labels.snapshot.engine.test.ts)."] },
  { ...other("tests/fixtures/cyanotype-whole-review.json"),
    title: ["# Cyanotype's quality labels on apps/hedgeschool/tests/fixtures/cyanotype-whole-review.json, the whole test game",
            "# (apps/cyanotype/src/lib/review/labels.snapshot.engine.test.ts)."],
    reached: ["best", "excellent", "good", "inaccuracy", "mistake", "blunder"], byMove: [], swapped: true, twins: true },
  { ...other("tests/fixtures/cyanotype-seed12-review.json"), reached: [], byMove: ["great"], swapped: false, twins: false },
];
const nameOf = (file: string) => basename(file, "-review.json");

const missing = hasEngine(app) ? null : "no engine in static/engine: run `npm run engine` first";
const skip = missing && !process.env.CI ? missing : false;
const engine = missing ? null : await nodeEngine(app);
/** The engine's rules, as the pool's rules worker answers them (@abstractclass/engine/client.ts, describeGame). */
const rules = {
  describeGame: async (q: PositionQuery, from = 0) =>
    ({ reply: engine!.call({ id: "g", action: "describe_game", ...q, from }) }),
};

/** A stored review as the review page labels it from the store alone. */
async function labelled({ file, game, turns }: Stored): Promise<Review<Blueprints>> {
  if (missing) throw new Error(`${missing}. In CI, the label snapshot needs the engine and does not skip`);
  const stored = readStored(file), record = parseRecord(testRecord(turns, game));
  // The results go to the store under a search of this review's own, as in Hedge School's label snapshot: the reviews
  // share positions, and the other review's result after this review's last move would answer there.
  const search = `labels-${nameOf(file)}`;
  const entries = stored.analyses.map(([key, value]): [string, unknown] => {
    const k = readAnalysisKey(key);
    return [analysisKey(search, k.model, k.moves.split(" ").filter(Boolean), k.visits, k.shape), value];
  });
  assert.equal(await dbPutMany(STORES.analysis, entries), entries.length);
  // How the record says the game ended, as the page gives it
  const ending = { result: record.result ?? record.tags.Result ?? null, termination: record.tags.Termination };
  const pool = { rules, cancel() {} } as unknown as EnginePool;
  const g = new GameAnalysis(blueprints, pool, record.moves, search);
  const problem = await openStored(g, record, stored.visits, search, stored.model);
  assert.equal(problem, null, "the record's capture marks are the engine's");
  const d = g.data(playerNames(record.tags), ending); // none when the rules refuse the game
  assert.ok(d, `the rules refused the game: ${g.error}`);
  // fromStore passes over a position whose result the store lacks: each position before a move has its stored result
  const unread = record.moves.flatMap((_, i) => ((d.analysis[i]?.visits ?? 0) >= stored.visits ? [] : [i]));
  assert.deepEqual(unread, [], "the positions with no stored result at the review's depth");
  return review(blueprints, d, "lead", LABEL_VISITS);
}
const reviews = new Map<string, Promise<Review<Blueprints>>>();
const labelledOnce = (s: Stored) => reviews.get(s.file) ?? reviews.set(s.file, labelled(s)).get(s.file)!;

/** How many labels of each kind the review has, by move (`edge`) or by turn (`turn`): its summary, which the page
 *  shows, for both players. */
const counts = (R: Review<Blueprints>, unit: Unit) =>
  Object.fromEntries(LABELS.map(l => [l, R.summary[unit][0].counts[l] + R.summary[unit][1].counts[l]])) as
    Record<Label, number>;

/** What a stored review reaches of the rules that Hedge School's label snapshot reports too: the turns that play the
 *  engine's best turn in the other order (model.ts, sameTurn), and the twins (a candidate's `twinOf`: two moves that
 *  give one position, design 33, item 9). A stored review that stops reaching one shows in the snapshot's diff. */
function reaches(R: Review<Blueprints>) {
  const twins = (i: number) => R.data.analysis[i]?.candidates.filter(c => c.twinOf) ?? [];
  return {
    swapped: R.turns.filter(({ label, edges: [a, b], best }) => label !== null && b && best?.length === 2
      && blueprints.equal(a.edge!, best[1]) && blueprints.equal(b.edge!, best[0])).length,
    twinPositions: R.data.analysis.flatMap((_, i) => (twins(i).length ? [i] : [])).join(" ") || "none",
    playedTwins: R.edges.filter(e => e.edge && twins(e.index).some(c => blueprints.equal(c.edge, e.edge!))).length,
  };
}

/** The text of the label snapshot: a header, then one line for each move with its label by move, and one for each
 *  turn with its label by turn. */
function snapshotOf(R: Review<Blueprints>, title: string[]): string {
  const reached = reaches(R);
  const tally = (unit: Unit) => {
    const n = counts(R, unit);
    return LABELS.filter(l => n[l]).map(l => `${l} ${n[l]}`).join(", ") || "none";
  };
  const side = (player: number) => PLAYER_NAME[player].padEnd(4);
  const byEdge = R.edges.map(e => `${String(e.index + 1).padStart(3)}`
    + `  turn ${String(R.turnOf[e.index].number).padStart(2)}  ${side(e.player)}  ${playedText(e).padEnd(16)}`
    + `  ${e.label ?? "-"}`);
  const byTurn = R.turns.map(t => `turn ${String(t.number).padStart(2)}  ${side(t.player)}`
    + `  ${t.edges.map(e => playedText(e)).join(" ").padEnd(33)}  ${t.label ?? "-"}`);
  return [
    ...title,
    "# Update this file only as the test's header says. The commit message says why each label moved.",
    `# "-": no label.`,
    `# Labels by move: ${tally("edge")}`,
    `# Labels by turn: ${tally("turn")}`,
    `# Turns of two moves in the other order than the engine's best turn: ${reached.swapped}`,
    `# Positions with a twin: ${reached.twinPositions}. Played moves that are a twin: ${reached.playedTwins}`,
    "", "[by move]", ...byEdge, "", "[by turn]", ...byTurn, "",
  ].join("\n");
}

for (const s of REVIEWS) {
  test(`every quality label of ${s.file}, by move and by turn, is the label snapshot's`, { skip }, async t => {
    t.assert.fileSnapshot(snapshotOf(await labelledOnce(s), s.title), join(snapshots, `${nameOf(s.file)}.txt`),
                          { serializers: [text => text] });
  });

  test(`${s.file} reaches each kind of label and each rule that the label snapshot is for`, { skip }, async () => {
    const R = await labelledOnce(s), byEdge = counts(R, "edge"), byTurn = counts(R, "turn"), reached = reaches(R);
    for (const l of s.reached) {
      assert.ok(byEdge[l], `no ${l} by move: the stored review no longer reaches it`);
      assert.ok(byTurn[l], `no ${l} by turn: the stored review no longer reaches it`);
    }
    for (const l of s.byMove) assert.ok(byEdge[l], `no ${l} by move: the stored review no longer reaches it`);
    if (s.swapped) assert.ok(reached.swapped, "no turn in the other order: the stored review no longer reaches one");
    if (s.twins) assert.notEqual(reached.twinPositions, "none", "no twin: the stored review no longer reaches one");
  });
}
