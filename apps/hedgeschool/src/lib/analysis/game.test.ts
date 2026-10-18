// Checks the analysis's batch (BATCH_MS in game.svelte.ts): a search's results so far and its final result are applied
// together, at most once a batch, the deepest for each position, with what follows a search's end (the passes'
// progress, its mark). Run: npm test.
import { afterEach, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import "#lib/testing/svelteModules.ts";
import type { AnalysisReply, GamePosition, PositionQuery } from "#lib/engine/protocol.ts";
import type { EnginePool, Work } from "./pool.ts";

const { BATCH_MS, GameAnalysis, SWEEP_VISITS } = await import("./game.svelte.ts");
const { BOARD_ID } = await import("#lib/game/store.ts");

const MOVES = ["A10-D9", "D10-G9", "G10-J9"];

const position = (k: number): GamePosition => ({
  position: `p${k}`, edges: { b: [], r: [] }, protected: [], placed: [], regions: { b: [], r: [] }, areas: [0, 0],
  scores: [0, 0], mover: k % 2 ? "r" : "b", movesLeft: 1, moveCount: k, outcome: null, cuts: null,
});
const reply = (visits: number) => ({
  rootInfo: { visits, winrate: 0.5, scoreLead: 0, scoreSelfplay: 0, scoreStdev: 0 }, moveInfos: [],
}) as unknown as AnalysisReply;

let models = 0;
/** A pool that runs each task at once, on an engine whose searches end when the test says: `partial` posts a result so
 *  far, `end` the final result. */
function fakePool() {
  const searches: { partial(visits: number): void; end(visits: number): void }[] = [];
  const engine = {
    analyse(_query: unknown, onPartial: (r: AnalysisReply) => void) {
      let end!: (t: { reply: AnalysisReply }) => void;
      const done = new Promise(resolve => (end = resolve));
      searches.push({ partial: v => onPartial(reply(v)), end: v => end({ reply: reply(v) }) });
      return { done, stop() {} };
    },
  };
  const pool = {
    search: "test", model: { sha256: `m${++models}` }, // a network of its own: the cache's memory outlives a test
    rules: { describeGame: async (q: PositionQuery) => ({ reply: { positions: Array.from({ length: q.moves.length + 1 }, (_, k) => position(k)) } }) },
    run: (_priority: number, _tag: string, work: Work<unknown>) => work(engine as never, () => {}),
    cancel() {}, halt() {},
  };
  return { pool: pool as unknown as EnginePool, searches };
}

/** Lets the promises in flight settle: the reads of the cache, which finds no store in Node. */
const settle = () => new Promise(resolve => setImmediate(resolve));

/** A game whose sweep has started: a search of each position, which waits for the test. */
async function sweeping() {
  const { pool, searches } = fakePool();
  const game = new GameAnalysis(pool, MOVES, "g");
  await game.start();
  void game.sweep();
  await settle();
  return { game, searches };
}

beforeEach(() => mock.timers.enable({ apis: ["setTimeout"] }));
afterEach(() => mock.timers.reset());

test("a search's final results wait for the batch, and the sweep's progress comes with them", async () => {
  const { game, searches } = await sweeping();
  assert.equal(searches.length, game.passCount);
  searches[0].end(SWEEP_VISITS);
  searches[1].end(SWEEP_VISITS);
  await settle();
  assert.equal(game.analysis[0], undefined);
  assert.equal(game.swept, 0);
  mock.timers.tick(BATCH_MS);
  assert.deepEqual(game.analysis.slice(0, 2).map(a => a?.visits), [SWEEP_VISITS, SWEEP_VISITS]);
  assert.equal(game.swept, 2);
});

test("a final result is not replaced by a shallower result of the same batch", async () => {
  const { game, searches } = await sweeping();
  game.focus([]); // the start, on screen: searched in slices, beside the sweep's search of it
  await settle();
  const focus = searches.at(-1)!;
  searches[0].end(SWEEP_VISITS);
  await settle();
  focus.partial(SWEEP_VISITS / 2); // the focus's first slice, after the sweep's final result
  mock.timers.tick(BATCH_MS);
  assert.equal(game.analysis[0]?.visits, SWEEP_VISITS);
});

test("a search of the previous network adds nothing to the analysis or the progress", async () => {
  const { game, searches } = await sweeping();
  searches[0].end(SWEEP_VISITS); // before the change: its result waits for the batch
  await settle();
  game.dropAnalysis();
  searches[1].end(SWEEP_VISITS); // after it
  await settle();
  mock.timers.tick(BATCH_MS);
  assert.deepEqual(game.analysis.slice(0, 2), [undefined, undefined]);
  assert.equal(game.swept, 0);
});

test("a position stays pending until the batch shows its search's final result", async () => {
  const { pool, searches } = fakePool();
  const game = new GameAnalysis(pool, MOVES, BOARD_ID); // the board: only its searches make a position pending
  await game.start();
  await game.sweep();
  game.focus([]);
  await settle();
  searches[0].end(game.focusVisits);
  await settle();
  const visits = () => game.analysis[0]?.visits;
  assert.equal(game.pending([]), true);
  assert.equal(visits(), undefined);
  mock.timers.tick(BATCH_MS);
  assert.equal(game.pending([]), false);
  assert.equal(visits(), game.focusVisits);
});
