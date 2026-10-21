// Checks the analysis's batch (BATCH_MS in analysis.svelte.ts): a search's results so far and its final result are
// applied together, at most once a batch, the deepest for each position, with what follows a search's end (the passes'
// progress, its mark). And the order of a search's end: the engine takes its next search at once, and the result shows
// in the batch after its write to the store, or once it is stored when no search waits in the pool's queue or when it
// is the label pass's last. And another network: no pass searches on the old network's pool for the new network's
// analysis. And a focus's time limit, which the engine's worker keeps. And a search's budget and the review's steps, met
// only by a result that the store has: not by another search's results so far, and not by a search that ends with no
// result, which the engine on runs again. And results of shape 5, with no ownership: the review opens with them and
// searches nothing, and the board's ownership comes from a short search of its own. Run: npm test.
import { afterEach, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import "./testing/svelteModules.ts";
import type { AnalysisQuery, AnalysisReply } from "@abstractclass/engine/protocol.ts";
import { Cancelled, type EnginePool, type Work } from "@abstractclass/engine/pool.ts";
import { BOARD_ID } from "./kept.ts";
import { reply, wordFields, wordRules, words } from "./testing/game.ts";
import type { Player } from "./game.ts";
import { MAP_VISITS, READ_FROM, SWEEP_VISITS, analysisKey, cachePut, mapGet, readAnalysisKey } from "./cache.ts";
import { toAnalysis } from "./reply.ts";
import { STORES } from "@abstractclass/storage/db.ts";
import { memoryDb } from "@abstractclass/storage/memoryDb.ts";

const store = memoryDb(queueMicrotask); // its transactions complete in microtasks: the tests mock setTimeout

const { BATCH_MS, GameAnalysis, momentVisits } = await import("./analysis.svelte.ts");

const MOVES = ["a", "b", "c"]; // a game of the test game (testing/game.ts)

let models = 0;
/** A pool of `engines` engines (by default, as many as the tasks), whose searches end when the test says: `partial`
 *  posts a result so far, `end` the final result (`late`: its time limit ended it), `fail` an engine error. `stopped`
 *  once the page stops the search, `maxMs` its time limit. A task runs when an engine is free, the most urgent first,
 *  then first come first served, as the pool runs them (pool.ts). `waiting`: the tasks that wait for an engine. `halt`
 *  drops the waiting tasks and stops the running searches in slices, as the pool does. */
function fakePool(engines = Infinity) {
  const searches: { partial(visits: number): void; end(visits: number, late?: boolean, more?: Partial<AnalysisReply>): void;
                    fail(e: Error): void; stopped: boolean; maxMs?: number; query: AnalysisQuery }[] = [];
  const engine = {
    analyse(query: AnalysisQuery, onPartial: (r: AnalysisReply) => void, maxMs?: number) {
      let end!: (t: { reply: AnalysisReply; late?: boolean }) => void, fail!: (e: Error) => void;
      const done = new Promise((resolve, reject) => { end = resolve; fail = reject; });
      const search = {
        partial: (v: number) => onPartial(reply(v)), fail: (e: Error) => fail(e), stopped: false, maxMs, query,
        // A search that the page stopped, or that its time limit ended, ends as terminated (the protocol's terminate).
        // `more`: the reply's other fields, such as the ownership.
        end: (v: number, late = false, more = {}) =>
          end({ reply: { ...(late || search.stopped ? { ...reply(v), terminated: true } : reply(v)), ...more }, late }),
      };
      searches.push(search);
      return { done, stop() { search.stopped = true; } };
    },
  };
  let busy = 0;
  const queue: { priority: number; start: () => void; reject: (e: Error) => void }[] = [];
  const stops = new Set<() => void>(); // the running searches in slices
  const pool = {
    search: "test", model: { sha256: `m${++models}` }, // a network of its own: the cache's memory outlives a test
    rules: wordRules,
    run: (priority: number, _tag: string, work: Work<unknown>) => new Promise((resolve, reject) => {
      const start = () => {
        busy++;
        let stop = () => {};
        work(engine as never, s => { stop = s; stops.add(s); }).then(resolve, reject)
          .finally(() => { stops.delete(stop); busy--; queue.shift()?.start(); });
      };
      if (busy < engines) start();
      else {
        queue.push({ priority, start, reject });
        queue.sort((a, b) => b.priority - a.priority);
      }
    }),
    halt() {
      for (const t of queue.splice(0)) t.reject(new Cancelled());
      for (const stop of stops) stop();
    },
    cancel() {}, terminate() {},
    get waiting() { return queue.length; },
  };
  return { pool: pool as unknown as EnginePool, searches };
}

/** Lets the promises in flight settle: the reads of the store, and the writes that it does not hold. */
const settle = () => new Promise(resolve => setImmediate(resolve));
/** Lets the tasks in flight run too, such as a message on a channel. */
const turns = async () => { for (let k = 0; k < 20; k++) await settle(); };

/** A game whose sweep has started on `engines` engines: a search of each position, which waits for the test. */
async function sweeping(engines?: number) {
  const { pool, searches } = fakePool(engines);
  const game = new GameAnalysis(words, pool, MOVES, "g");
  await game.start();
  void game.sweep();
  await settle();
  return { game, pool, searches, written: () => store.puts(STORES.analysis).filter(k => readAnalysisKey(String(k)).model === pool.model!.sha256) };
}

beforeEach(() => mock.timers.enable({ apis: ["setTimeout"] }));
afterEach(() => { mock.timers.reset(); store.release(); });

test("a search's final results wait for the batch, and the sweep's progress comes with them", async () => {
  const { game, searches } = await sweeping(1); // the sweep's next searches wait for the engine
  searches[0].end(SWEEP_VISITS);
  await settle();
  searches[1].end(SWEEP_VISITS);
  await turns();
  assert.equal(game.analysis[0], undefined);
  assert.equal(game.swept, 0);
  mock.timers.tick(BATCH_MS);
  assert.deepEqual(game.analysis.slice(0, 2).map(a => a?.visits), [SWEEP_VISITS, SWEEP_VISITS]);
  assert.equal(game.swept, 2);
});

test("every search asks for the ownership of each point and of each candidate, for the area map", async () => {
  const { searches } = await sweeping();
  assert.ok(searches.length > 0);
  assert.ok(searches.every(s => s.query.includeOwnership && s.query.includeMovesOwnership));
});

test("results of shape 5 open the review with no search, and the board's ownership comes from a short search", async () => {
  const { pool, searches } = fakePool();
  const deep = 16384, model = pool.model!.sha256;
  // Every position at a deep budget, stored at shape 5 (READ_FROM): results with no ownership
  for (let i = 0; i <= MOVES.length; i++)
    await cachePut(analysisKey(pool.search!, model, MOVES.slice(0, i), deep, READ_FROM), toAnalysis(words, reply(deep)));
  const game = new GameAnalysis(words, pool, MOVES, "g5");
  await game.start();
  await game.fromStore(pool.search!, model);
  void game.sweep();
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.equal(searches.length, 0); // no review again
  assert.equal(game.labelled, game.passCount);
  assert.ok(game.analysis.slice(0, game.passCount).every(a => a?.visits === deep && !a.ownership));
  // The board shows the position after "a": one short search asks for its ownership alone
  const puts = store.puts(STORES.analysis).length;
  game.askOwnership([["a"]]);
  game.askOwnership([["a"]]); // asked again while it runs
  await turns();
  assert.deepEqual(searches.map(s => [s.query.moves, s.query.maxVisits, s.query.includeOwnership]), [[["a"], MAP_VISITS, true]]);
  searches[0].end(MAP_VISITS, false, { ownership: [0.5, -0.25] });
  await turns();
  assert.deepEqual(game.mapAt(["a"]), [50, -25]);
  assert.equal(game.analysis[1]?.visits, deep); // the result stays the position's
  // The store keeps the map beside the result, with its source
  assert.equal(store.puts(STORES.analysis).length, puts + 1);
  assert.deepEqual(await mapGet(pool.search!, model, ["a"]), { ownership: [50, -25], visits: MAP_VISITS, source: "short search" });
  game.askOwnership([["a"]]); // it has its ownership now
  await turns();
  assert.equal(searches.length, 1);
  // The position after a candidate of "a" that is not in the game: a short search too, as the candidate is pointed at
  game.askOwnership([["a"], ["a", "x"]]);
  await turns();
  assert.deepEqual(searches.at(-1)!.query.moves, ["a", "x"]);
  searches.at(-1)!.end(MAP_VISITS, false, { ownership: [-1, 1] });
  await turns();
  assert.deepEqual(game.mapAt(["a", "x"]), [-100, 100]);
  // The review opened again reads the maps from the store, with no search
  const again = new GameAnalysis(words, pool, MOVES, "g5");
  await again.start();
  await again.fromStore(pool.search!, model);
  void again.sweep();
  await turns();
  const before = searches.length;
  again.askOwnership([["a"], ["a", "x"]]);
  await turns();
  assert.equal(searches.length, before);
  assert.deepEqual([again.mapAt(["a"]), again.mapAt(["a", "x"])], [[50, -25], [-100, 100]]);
});

test("a final result is not replaced by a shallower result of the same batch", async () => {
  const { game, searches } = await sweeping(1);
  game.focus([]); // the start, on screen: it takes the engine after the sweep's search of it
  await settle();
  searches[0].end(SWEEP_VISITS);
  await turns();
  const focus = searches.at(-1)!;
  focus.partial(SWEEP_VISITS / 2); // the focus's first slice, after the sweep's final result
  mock.timers.tick(BATCH_MS);
  assert.equal(game.analysis[0]?.visits, SWEEP_VISITS);
});

test("a search of the previous network adds nothing to the analysis or the progress, and writes nothing", async () => {
  const { game, searches, written } = await sweeping();
  searches[0].end(SWEEP_VISITS); // before the change: its result waits for the batch
  await settle();
  game.dropAnalysis();
  searches[1].end(SWEEP_VISITS); // after it
  await settle();
  mock.timers.tick(BATCH_MS);
  assert.deepEqual(game.analysis.slice(0, 2), [undefined, undefined]);
  assert.equal(game.swept, 0);
  assert.equal(written().length, 1); // the first search's alone
});

test("the passes end with the old network: no label search starts on its pool or reads its results", async () => {
  const { game, pool, searches } = await sweeping();
  const n = game.passCount, visits = game.labelVisits;
  // The start's label result by the old network, in the store.
  await cachePut(analysisKey(pool.search!, pool.model!.sha256, [], visits), toAnalysis(words, reply(visits)));
  game.dropAnalysis();
  for (const s of searches) s.end(SWEEP_VISITS); // the sweep's searches finish their few visits, as a halt lets them
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.equal(searches.length, n);
  assert.deepEqual([game.analysis.filter(a => a).length, game.labelled], [0, 0]);
  const next = fakePool(); // the next network's pool, loaded
  game.usePool(next.pool);
  void game.sweep();
  await settle();
  assert.equal(next.searches.length, n); // every position, the start too
});

test("a sweep after another network was chosen waits for that network's pool", async () => {
  for (const id of ["g", BOARD_ID]) { // the review's passes, and the board's searches
    const { pool, searches } = fakePool();
    const game = new GameAnalysis(words, pool, MOVES, id);
    await game.start();
    game.dropAnalysis(); // another network, chosen while the pool loads its first
    void game.sweep(); // the first network loaded
    game.focus([]);
    await settle();
    assert.deepEqual([searches.length, game.engineReady], [0, false], id);
    const next = fakePool();
    game.usePool(next.pool);
    void game.sweep();
    game.focus([]);
    await settle();
    // The focus's search, and the review's sweep of every position.
    assert.deepEqual([next.searches.length, game.engineReady], [game.board ? 1 : game.passCount + 1, true], id);
  }
});

test("the engine takes its next search while a result's write commits, and the result shows once it is stored", async () => {
  const { game, searches, written } = await sweeping(1);
  const shown = () => [game.analysis[0]?.visits, game.swept];
  assert.equal(searches.length, 1);
  store.hold();
  searches[0].end(SWEEP_VISITS);
  await settle();
  assert.equal(searches.length, 2);
  mock.timers.tick(BATCH_MS);
  assert.deepEqual(shown(), [undefined, 0]);
  store.release();
  await settle();
  assert.deepEqual(shown(), [undefined, 0]); // stored: the result and the sweep's progress wait for the batch
  mock.timers.tick(BATCH_MS);
  assert.deepEqual(shown(), [SWEEP_VISITS, 1]);
  assert.equal(written().length, 1);
});

test("a result whose write fails shows, with its progress", async () => {
  const { game, searches } = await sweeping();
  store.hold();
  searches[0].end(SWEEP_VISITS);
  await settle();
  store.release(false);
  await settle();
  mock.timers.tick(BATCH_MS);
  assert.equal(game.analysis[0]?.visits, SWEEP_VISITS);
  assert.equal(game.swept, 1);
});

test("a position stays pending, and its focus runs, until the batch after its result's write", async () => {
  const { pool, searches } = fakePool(1);
  const game = new GameAnalysis(words, pool, MOVES, BOARD_ID); // the board: only its searches make a position pending
  await game.start();
  await game.sweep();
  game.focus([]);
  await settle();
  // Two other tasks wait: once the focus ends, one of them still waits, and the result waits for the batch.
  for (let k = 0; k < 2; k++) void pool.run(0, "other", () => new Promise(() => {}));
  store.hold();
  searches[0].end(game.focusVisits);
  await settle();
  mock.timers.tick(BATCH_MS);
  const shown = () => [game.analysis[0]?.visits, game.pending([]), game.focusing];
  assert.deepEqual(shown(), [undefined, true, ""]);
  store.release();
  await settle();
  assert.deepEqual(shown(), [undefined, true, ""]);
  mock.timers.tick(BATCH_MS);
  assert.deepEqual(shown(), [game.focusVisits, false, null]);
});

test("a search that fails ends its marks in the next batch, and the page gets the error", async () => {
  const { pool, searches } = fakePool();
  const game = new GameAnalysis(words, pool, MOVES, BOARD_ID);
  await game.start();
  await game.sweep();
  game.focus([]);
  await settle();
  searches[0].fail(new Error("the engine failed"));
  await settle();
  const shown = () => [game.pending([]), game.focusing];
  assert.deepEqual(shown(), [true, ""]);
  mock.timers.tick(BATCH_MS);
  assert.deepEqual(shown(), [false, null]);
  assert.equal(game.analysis[0], undefined);
  assert.match(game.error, /the engine failed/);
});

/** Ends the searches `from` to `to` (not included) one at a time, at `visits`, each once the engine has it. */
async function endEach(searches: { end(visits: number): void }[], from: number, to: number, visits: number) {
  for (let k = from; k < to; k++) {
    searches[k].end(visits);
    await turns();
  }
}

test("once no search waits, the results show when they are stored, without the batch's timer", async () => {
  const { game, searches } = await sweeping(1);
  const n = game.passCount;
  await endEach(searches, 0, n, SWEEP_VISITS);
  await endEach(searches, n, 2 * n - 2, game.labelVisits); // the label pass but its last two searches
  assert.equal(game.labelled, 0); // the label pass's next search waited for the engine: the results wait for the batch
  searches[2 * n - 2].end(game.labelVisits);
  await turns();
  assert.equal(game.labelled, n - 1); // its last search has the engine, and no search waits
});

test("once no search waits, a result shows without the batch's timer while a focus runs", async () => {
  const { game, searches } = await sweeping(2);
  const n = game.passCount;
  await endEach(searches, 0, n, SWEEP_VISITS);
  await endEach(searches, n, 2 * n - 2, game.labelVisits); // the label pass's last two searches have the engines
  game.focus(game.mainNames.slice(0, 1)); // the player looks at a position: its search waits for an engine
  await settle();
  searches[2 * n - 2].end(game.labelVisits);
  await turns();
  assert.equal(searches.length, 2 * n + 1); // the focus has the engine, and no search waits
  assert.equal(game.labelled, n - 1);
});

test("the label pass's last result shows without the batch's timer, though searches wait", async () => {
  const { game, pool, searches } = await sweeping(1);
  const n = game.passCount;
  await endEach(searches, 0, n, SWEEP_VISITS);
  await endEach(searches, n, 2 * n - 1, game.labelVisits); // the label pass but its last search, which has the engine
  // Two Greats' confirmations wait: once the label pass's last search ends, one of them takes the engine, one waits.
  for (let k = 0; k < 2; k++) void pool.run(0, "confirm", () => new Promise(() => {}));
  searches[2 * n - 1].end(game.labelVisits);
  await turns();
  assert.equal(game.labelled, n); // the key moments, which wait for it, do not wait for the timer
});

test("a label search is met only by a result that the store has, not by the results so far of the position on screen", async () => {
  const { game, pool, searches, written } = await sweeping();
  const n = game.passCount, visits = game.labelVisits;
  game.setDepth(4096, null);
  game.focus([]); // the start on screen, searched deeper than the label budget
  await settle();
  const focus = searches[n];
  focus.partial(visits + 64);
  mock.timers.tick(BATCH_MS);
  await endEach(searches, 0, n, SWEEP_VISITS); // the label pass starts
  game.focus(game.mainNames.slice(0, 1)); // the player moves on: the start's search stops, and the store never gets it
  focus.end(visits + 96);
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.deepEqual([game.analysis[0]?.visits, game.labelled], [visits + 96, 0]);
  await endEach(searches, n + 1, 2 * n + 1, visits); // the label pass, the start's search too
  mock.timers.tick(BATCH_MS);
  assert.deepEqual([game.analysis[0]?.visits, game.labelled], [visits + 96, n]); // the deeper result stays on screen
  assert.ok(written().includes(analysisKey(pool.search!, pool.model!.sha256, [], visits)));
});

test("a position whose result the store has, and the analysis lost, takes it from the store: a branch deleted and played again", async () => {
  const { game, searches } = await sweeping();
  const branch = ["b"], visits = game.focusVisits;
  await game.addLine(branch);
  game.focus(branch);
  await settle();
  searches.at(-1)!.end(visits);
  await turns();
  mock.timers.tick(BATCH_MS);
  await game.deleteFrom(branch);
  await game.addLine(branch);
  const before = searches.length;
  game.focus(branch);
  await turns();
  assert.deepEqual([game.analysisOf(branch)?.visits, searches.length], [visits, before]);
});

test("the board reads the stored results of every position of its lines when it opens, searches none and judges none", async () => {
  const { pool, searches } = fakePool();
  const game = new GameAnalysis(words, pool, [], BOARD_ID);
  await game.start();
  // The main line a b, and the variation a c b. Its end (a c b) is a position too, as the main line's (a b).
  await game.loadBoard({ version: 2, nodes: [["a", 0], ["a b", 0], ["a c", 1], ["a c b", 0]], main: ["a", "b"] });
  const lines = [[], ["a"], ["a", "b"], ["a", "c"], ["a", "c", "b"]];
  for (const p of lines) await cachePut(analysisKey(pool.search!, pool.model!.sha256, p, SWEEP_VISITS), toAnalysis(words, reply(SWEEP_VISITS)));
  await game.fromStore(pool.search!, pool.model!.sha256);
  assert.deepEqual(lines.map(p => game.analysisOf(p)?.visits), lines.map(() => SWEEP_VISITS));
  assert.equal(searches.length, 0);
  assert.deepEqual(game.judgedMain, {}); // the labels stay on the moves the player asks to evaluate (design 21)
  assert.ok(Object.values(game.branches).every(n => !n.judged));
});

test("a line gleams while a search of its position can change it: not for a label search below the visits on screen", async () => {
  const { game, searches } = await sweeping();
  const n = game.passCount, visits = game.labelVisits;
  game.setDepth(4096, null);
  game.focus([]);
  await settle();
  const focus = searches[n];
  focus.partial(visits + 64);
  mock.timers.tick(BATCH_MS);
  await endEach(searches, 0, n, SWEEP_VISITS); // the label pass starts: the start's label search runs with the focus
  assert.equal(game.pending([]), true);
  game.focus(game.mainNames.slice(0, 1)); // the player moves on: the start's search stops
  focus.end(visits + 96);
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.deepEqual([game.analysis[0]?.visits, game.pending([])], [visits + 96, false]); // the label search runs on
});

test("the key moments' step waits for a search whose position left them, until its result is stored", async () => {
  const { game, searches } = await sweeping(1); // the sweep's searches wait: the results wait for the batch
  const depth = momentVisits(game.labelVisits);
  game.deepen([1]);
  await settle();
  searches[0].end(SWEEP_VISITS); // the key moment's search takes the engine before the rest of the sweep
  await turns();
  const deep = searches.at(-1)!;
  deep.partial(depth - 32);
  mock.timers.tick(BATCH_MS);
  // The page's key moments lack position 1 now, as when its result so far changed the labels: its search still runs.
  assert.deepEqual(game.momentChecks([]), { total: 1, done: 0 });
  store.hold();
  deep.end(depth);
  await settle();
  mock.timers.tick(BATCH_MS);
  assert.deepEqual(game.momentChecks([]), { total: 1, done: 0 }); // its write has not committed
  store.release();
  await settle();
  assert.deepEqual(game.momentChecks([]), { total: 1, done: 0 }); // stored: its end shows with its result, in the batch
  mock.timers.tick(BATCH_MS);
  // Searched to the depth, it still counts, though it is no key moment: the step's count does not go back.
  assert.deepEqual([game.momentChecks([]), game.momentChecks([1])], [{ total: 1, done: 1 }, { total: 1, done: 1 }]);
  game.setReview(2 * game.labelVisits); // another depth: the position has not got the new depth
  assert.deepEqual(game.momentChecks([]), { total: 0, done: 0 });
});

/** A game whose passes have ended: the sweep's searches and the label pass's. */
async function reviewed() {
  const swept = await sweeping();
  const n = swept.game.passCount;
  await endEach(swept.searches, 0, n, SWEEP_VISITS);
  await endEach(swept.searches, n, 2 * n, swept.game.labelVisits);
  return swept;
}

test("a key moment counts as done only with a result that the store has, not with the results so far of the position on screen", async () => {
  const { game, searches } = await reviewed();
  const n = game.passCount, depth = momentVisits(game.labelVisits);
  game.setDepth(4096, null);
  game.focus(game.mainNames.slice(0, 1)); // the key moment on screen, searched deeper than the key moments' depth
  await settle();
  searches[2 * n].partial(depth + 64);
  mock.timers.tick(BATCH_MS);
  game.deepen([1]);
  await settle();
  assert.deepEqual([searches.length, game.momentChecks([1])], [2 * n + 2, { total: 1, done: 0 }]); // its own search runs
  searches[2 * n + 1].end(depth);
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.deepEqual([game.analysis[1]?.visits, game.momentChecks([1])], [depth + 64, { total: 1, done: 1 }]);
});

/** A review after its passes, whose key moment 1 is searched deeper: its results so far took it out of the key moments,
 *  and the search still runs. */
async function deepening() {
  const { game, pool, searches, written } = await reviewed();
  const n = game.passCount, depth = momentVisits(game.labelVisits);
  game.deepen([1]);
  await settle();
  const search = searches[2 * n];
  search.partial(depth - 32);
  mock.timers.tick(BATCH_MS);
  game.deepen([]); // the page's key moments, which its results so far changed
  const stored = () => written().includes(analysisKey(pool.search!, pool.model!.sha256, MOVES.slice(0, 1), depth));
  return { game, searches, search, depth, stored };
}

/** Turns the engine on, and ends the search that it starts at `depth`: the key moments' step then counts it as done. */
async function searchedAgain({ game, searches, depth, stored }: Awaited<ReturnType<typeof deepening>>) {
  const before = searches.length;
  game.setPaused(false);
  await settle();
  assert.equal(searches.length, before + 1); // the engine on searches the position again
  searches.at(-1)!.end(depth);
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.deepEqual([game.momentChecks([]), stored()], [{ total: 1, done: 1 }, true]);
}

test("a key moment's search that the engine off stops counts until its result is stored, and runs again", async () => {
  const review = await deepening();
  review.game.setPaused(true);
  assert.equal(review.search.stopped, true);
  review.search.end(review.depth - 16);
  await turns();
  mock.timers.tick(BATCH_MS);
  // The line does not say "Review done", and the step waits for the position though it is no key moment now.
  assert.deepEqual([review.game.momentChecks([]), review.stored()], [{ total: 1, done: 0 }, false]);
  await searchedAgain(review);
});

test("a key moment's search that the engine off stops runs again when the engine comes on before that search ends", async () => {
  const { game, searches, search, depth, stored } = await deepening();
  game.setPaused(true);
  game.setPaused(false);
  await settle();
  const before = searches.length;
  search.end(depth - 16);
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.equal(searches.length, before + 1);
  searches.at(-1)!.end(depth);
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.deepEqual([game.momentChecks([]), stored()], [{ total: 1, done: 1 }, true]);
});

test("a key moment's search that an engine error ends counts until its result is stored, and runs again", async () => {
  const review = await deepening();
  review.search.fail(new Error("engine error"));
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.deepEqual([review.game.momentChecks([]), review.game.error], [{ total: 1, done: 0 }, "engine error"]);
  review.game.setPaused(true); // the player turns the engine off and on
  await searchedAgain(review);
});

/** The board, its start on screen with a time limit of 2 seconds: the focus's search waits for the test. */
async function focusing() {
  const { pool, searches } = fakePool();
  const game = new GameAnalysis(words, pool, MOVES, BOARD_ID);
  await game.start();
  await game.sweep();
  game.setDepth(4096, 2);
  game.focus([]);
  await settle();
  return { game, searches };
}

test("a focus gives its time limit to the engine, and a search that the limit ended shows as stopped there", async () => {
  const { game, searches } = await focusing();
  assert.equal(searches[0].maxMs, 2000);
  searches[0].partial(32);
  searches[0].end(64, true);
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.equal(game.stoppedByTime([]), true);
  assert.equal(game.analysis[0]?.visits, 64);
});

test("a focus that stops before its time limit does not show as stopped there", async () => {
  const { game, searches } = await focusing();
  game.setDepth(4096, 10); // another time limit: the page stops the search
  assert.equal(searches[0].stopped, true);
  searches[0].end(64);
  await turns();
  mock.timers.tick(BATCH_MS);
  game.setDepth(4096, 2);
  assert.equal(game.stoppedByTime([]), false);
});

test("a Great's confirmation is asked for only where the only good move keeps what the opponent's last turn gave", async () => {
  const { pool } = fakePool();
  const game = new GameAnalysis(words, pool, ["a", "b", "c", "d"], "g");
  await game.start();
  const at = (blueWin: number, candidates: [string, number][] = []) =>
    ({ blueWin, visits: game.labelVisits, candidates: candidates.map(([edge, w]) => ({ edge, visits: 10, blueWin: w })) });
  // The first player played c, its first choice at position 2, and its second choice x looks 0.15 worse there.
  const only = at(0.6, [["c", 0.6], ["x", 0.45]]);
  // Before the second player's last turn (b, from position 1) the first player had 0.5: b gave it 0.1. One search.
  game.analysis = [at(0.5), at(0.5), only, at(0.6), at(0.6)];
  assert.equal(game.earlierAt(["a", "b"], 0), game.analysis[1]);
  assert.equal(game.greatChecks.total, 1);
  // It had 0.58: c only holds the position, and cannot be Great. No search.
  game.analysis = [at(0.5), at(0.58), only, at(0.6), at(0.6)];
  assert.equal(game.greatChecks.total, 0);
  // The first move has no turn of the opponent before it.
  assert.equal(game.earlierAt([], 0), undefined);
  // A branch: the position before the opponent's last turn is the game's, or the branch's own.
  await game.addLine(["a", "b", "x", "y"], false);
  assert.equal(game.earlierAt(["a", "b", "x"], 1), game.analysis[2]);
});

test("a turn of two whose start keeps the gain asks for the search from its middle, though its middle does not", async () => {
  // Turns as Enclosure's: the first player's turn of one move, then turns of two (positions 1 and 2 the second player's).
  const mover = (k: number) => (k === 0 || Math.floor((k - 1) / 2) % 2 === 1 ? 0 : 1) as Player;
  const rules = { describeGame: async (q: { moves: string[] }) =>
    ({ reply: { positions: Array.from({ length: q.moves.length + 1 }, (_, k) => ({ ...wordFields(k), mover: mover(k) })) } }) };
  const { pool } = fakePool();
  Object.assign(pool, { rules });
  const game = new GameAnalysis(words, pool, ["a", "b", "c", "d", "e"], "g");
  await game.start();
  const at = (blueWin: number, candidates: [string, number][] = []) =>
    ({ blueWin, visits: game.labelVisits, candidates: candidates.map(([edge, w]) => ({ edge, visits: 10, blueWin: w })) });
  // The second player's turn b c, from position 1: the only good turn (x looks 0.16 worse), and 0.06 better for it than
  // before the first player's turn (0.5). In its middle, c is the only good move, but only 0.04 better than 0.5.
  const start = at(0.44, [["b", 0.44], ["x", 0.6]]), middle = at(0.46, [["c", 0.46], ["y", 0.65]]);
  game.analysis = [at(0.5), start, middle, at(0.46), at(0.46), at(0.46)];
  assert.equal(game.earlierAt(["a", "b"], 1), game.analysis[0]);
  // The search after x (the turn's, and the edge b's), and the search after y, which only the turn reads.
  assert.equal(game.greatChecks.total, 2);
  // Before the first player's turn the second player had 0.52: neither the turn nor an edge keeps the gain.
  game.analysis = [at(0.48), start, middle, at(0.46), at(0.46), at(0.46)];
  assert.equal(game.greatChecks.total, 0);
});
