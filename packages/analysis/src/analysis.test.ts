// Checks the analysis's batch (BATCH_MS in analysis.svelte.ts): a search's results so far and its final result are
// applied together, at most once a batch, the deepest for each position, with what follows a search's end (the stages'
// progress, its mark). And the order of a search's end: the engine takes its next search at once, and the result shows
// in the batch after its write to the store, or once it is stored when no search waits in the pool's queue or when it
// is the label stage's last. And another network: no stage searches on the old network's pool for the new network's
// analysis. And a focus's time limit, which the engine's worker keeps. And a search's budget and the review's steps, met
// only by a result that the store has: not by another search's results so far. And results of shape 5, with no
// ownership: the review opens with them and searches nothing, and the board's ownership comes from a short search of
// its own. Run: npm test.
import { afterEach, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import "./testing/svelteModules.ts";
import type { AnalysisQuery, AnalysisReply, PositionQuery } from "@abstractclass/engine/protocol.ts";
import { Cancelled, type EnginePool, type Work } from "@abstractclass/engine/pool.ts";
import { BOARD_ID } from "./kept.ts";
import { reply, wordFields, wordRules, words } from "./testing/game.ts";
import type { Player } from "./game.ts";
import { LABEL_VISITS, MAP_VISITS, SWEEP_VISITS, analysisKey, cachePut, mapGet, mapPut,
         readAnalysisKey } from "./cache.ts";
import { judgeBranchMove, valuesAfter, type Analysis } from "./model.ts";
import { toAnalysis } from "./reply.ts";
import { STORES } from "@abstractclass/storage/db.ts";
import { memoryDb } from "@abstractclass/storage/memoryDb.ts";

const store = memoryDb(queueMicrotask); // its transactions complete in microtasks: the tests mock setTimeout

const { BATCH_MS, GameAnalysis } = await import("./analysis.svelte.ts");

const MOVES = ["a", "b", "c"]; // a game of the test game (testing/game.ts)

let models = 0;
/** A pool of `engines` engines (by default, as many as the tasks), whose searches end when the test says: `partial`
 *  posts a result so far, `end` the final result (`late`: its time limit ended it), `fail` an engine error. `stopped`
 *  once the page stops the search, `maxMs` its time limit. A task runs when an engine is free, the most urgent first,
 *  then first come first served, as the pool runs them (pool.ts). `waiting`: the tasks that wait for an engine. `halt`
 *  drops the waiting tasks and stops the running searches in slices, as the pool does. `cancel` drops the waiting tasks
 *  of the tags that it takes, and lets the running ones end, as the pool does. */
function fakePool(engines = Infinity) {
  const searches: { partial(visits: number): void; end(visits: number, late?: boolean, more?: Partial<AnalysisReply>): void;
                    fail(e: Error): void; stopped: boolean; maxMs?: number; query: AnalysisQuery; moves: string[] }[] = [];
  const engine = {
    analyse(query: AnalysisQuery, onPartial: (r: AnalysisReply) => void, maxMs?: number) {
      let end!: (t: { reply: AnalysisReply; late?: boolean }) => void, fail!: (e: Error) => void;
      const done = new Promise((resolve, reject) => { end = resolve; fail = reject; });
      const search = {
        partial: (v: number) => onPartial(reply(v)), fail: (e: Error) => fail(e), stopped: false, maxMs, query,
        moves: query.moves,
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
  const queue: { priority: number; tag: string; start: () => void; reject: (e: Error) => void }[] = [];
  const stops = new Set<() => void>(); // the running searches in slices
  const pool = {
    search: "test", model: { sha256: `m${++models}` }, // a network of its own: the cache's memory outlives a test
    rules: wordRules,
    run: (priority: number, tag: string, work: Work<unknown>) => new Promise((resolve, reject) => {
      const start = () => {
        busy++;
        let stop = () => {};
        work(engine as never, s => { stop = s; stops.add(s); }).then(resolve, reject)
          .finally(() => { stops.delete(stop); busy--; queue.shift()?.start(); });
      };
      if (busy < engines) start();
      else {
        queue.push({ priority, tag, start, reject });
        queue.sort((a, b) => b.priority - a.priority);
      }
    }),
    halt() {
      for (const t of queue.splice(0)) t.reject(new Cancelled());
      for (const stop of stops) stop();
    },
    cancel(match: (tag: string) => boolean) {
      for (const t of queue.filter(t => match(t.tag))) { queue.splice(queue.indexOf(t), 1); t.reject(new Cancelled()); }
    },
    terminate() {},
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

test("every search asks for the ownership of each point, for the area map", async () => {
  const { searches } = await sweeping();
  assert.ok(searches.length > 0);
  assert.ok(searches.every(s => s.query.includeOwnership));
});

test("results of shape 5 open the review with no search, and the board's ownership comes from a short search", async () => {
  const { pool, searches } = fakePool();
  const deep = 16384, model = pool.model!.sha256;
  // Every position at a deep budget, with no ownership, as the site before the area map stored it
  for (let i = 0; i <= MOVES.length; i++)
    await cachePut(analysisKey(pool.search!, model, MOVES.slice(0, i), deep), toAnalysis(words, reply(deep)));
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
  // A position of a line, two moves from the tree, and one that the engine does not search (an ended game): no map
  game.askOwnership([["a", "x", "y"], ["a", "x", "z"]]);
  await turns();
  const of = (last: string) => searches.find(s => s.query.moves.join(" ") === `a x ${last}`)!;
  of("y").end(MAP_VISITS, false, { ownership: [0, 0] });
  of("z").fail(new Error("the game is over"));
  await turns();
  assert.equal(game.error, ""); // not the review's error
  assert.deepEqual(game.mapAt(["a", "x", "y"]), [0, 0]);
  assert.deepEqual([game.hasNoMap(["a", "x", "y"]), game.hasNoMap(["a", "x", "z"])], [false, true]);
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

test("the map stage: once the review's stages are done, the maps of the game's positions, from the one on screen", async () => {
  const { pool, searches } = fakePool(1);
  const deep = 16384, model = pool.model!.sha256;
  // Results with no map (stored before the ownership), at every position but the game's end, which is not over
  for (let i = 0; i <= MOVES.length; i++)
    await cachePut(analysisKey(pool.search!, model, MOVES.slice(0, i), deep), toAnalysis(words, reply(deep)));
  const game = new GameAnalysis(words, pool, MOVES, "g6");
  await game.start();
  await game.fromStore(pool.search!, model);
  void game.sweep();
  await turns();
  assert.equal(searches.length, 0);
  assert.equal(game.mapState(["a"]), "unasked");
  game.passMaps(true, ["a", "b"]);
  await turns();
  assert.deepEqual(game.mapPass, { total: game.passCount, done: 0 });
  // The lowest priority, in slices, so that the pool can stop it for a search for the player
  const first = searches.at(-1)!;
  assert.deepEqual([first.query.moves, first.query.maxVisits, !!first.query.slice], [["a", "b"], MAP_VISITS, true]);
  assert.equal(game.mapState(["a", "b"]), "searching");
  assert.equal(game.mapState(["a", "b", "c"]), "waiting"); // queued behind it
  first.end(MAP_VISITS, false, { ownership: [0.5] });
  await turns();
  assert.deepEqual(game.mapAt(["a", "b"]), [50]);
  assert.equal(game.mapState(["a", "b"]), "ready");
  assert.deepEqual(game.mapPass, { total: game.passCount, done: 1 });
  // From the position on screen to the game's end, then back to its start
  assert.deepEqual(searches.at(-1)!.query.moves, ["a", "b", "c"]);
  searches.at(-1)!.end(MAP_VISITS, false, { ownership: [0.1] });
  await turns();
  assert.deepEqual(searches.at(-1)!.query.moves, ["a"]);
  // A search that the pool stopped to give way keeps no map: the pool runs it again
  searches.at(-1)!.stopped = true;
  searches.at(-1)!.end(MAP_VISITS, false, { ownership: [0.2] });
  await turns();
  assert.equal(game.mapAt(["a"]), undefined);
  // The map turned off: the stage stops, and the searches still queued end at once
  game.passMaps(false, ["a", "b"]);
  await turns();
  assert.equal(game.mapPass, null);
  const before = searches.length;
  await turns();
  assert.equal(searches.length, before);
});

/** A game whose results are all stored with no map (stored before the ownership), opened from the store: no search. */
async function noMaps(engines: number, id: string) {
  const { pool, searches } = fakePool(engines);
  const deep = 16384, model = pool.model!.sha256;
  for (let i = 0; i <= MOVES.length; i++)
    await cachePut(analysisKey(pool.search!, model, MOVES.slice(0, i), deep), toAnalysis(words, reply(deep)));
  const game = new GameAnalysis(words, pool, MOVES, id);
  await game.start();
  await game.fromStore(pool.search!, model);
  return { game, pool, searches };
}

test("every state of a map ends: a map asked for before the engine is ready waits, then comes", async () => {
  const { game, searches } = await noMaps(2, "g7");
  // The page asks before the engine's network has loaded (a reload): the map waits for the engine, not "unasked"
  game.askOwnership([["a"]]);
  game.passMaps(true, ["a"]);
  await turns();
  assert.equal(searches.length, 0);
  assert.equal(game.mapState(["a"]), "waiting");
  // The engine ready: the map is asked for, with no new call from the page, and the stage starts
  void game.sweep();
  await turns();
  const asked = searches.find(s => s.query.moves.join(" ") === "a" && !s.query.slice);
  assert.ok(asked, "the position's map is searched once the engine is ready");
  assert.ok(game.mapPass, "the map stage starts once the engine is ready");
  asked!.end(MAP_VISITS, false, { ownership: [0.3] });
  await turns();
  assert.equal(game.mapState(["a"]), "ready");
  // Nothing that nobody asks for shows as waiting
  game.passMaps(false, ["a"]);
  game.askOwnership([]);
  await turns();
  assert.equal(game.mapState(["a", "x"]), "unasked");
});

test("every state of a map ends: a map stage stopped and started again runs to its last map, whatever the old one's last task does", async () => {
  const { game, searches } = await noMaps(1, "g9");
  void game.sweep();
  await turns();
  game.passMaps(true, []); // from the start: "" runs, the others wait
  await turns();
  const old = searches.at(-1)!;
  assert.deepEqual(old.query.moves, []);
  game.passMaps(false, []); // the map off: the waiting ones go, the running one ends at its visits
  await turns();
  game.passMaps(true, []); // on again: a pass of the others
  await turns();
  old.end(MAP_VISITS, false, { ownership: [0.1] }); // the stopped stage's task ends late
  await turns();
  // Each search of the new stage ends: the stage runs, and shows its progress, until its last search ends
  for (let k = 1; k < game.passCount; k++) {
    const s = searches.at(-1)!;
    assert.deepEqual(s.query.moves, MOVES.slice(0, k));
    s.end(MAP_VISITS, false, { ownership: [0.2] });
    await turns();
    if (k < game.passCount - 1) assert.ok(game.mapPass, `the pass runs after its search ${k}`);
  }
  assert.equal(game.mapPass, null);
  for (let k = 0; k < game.passCount; k++) assert.equal(game.mapState(MOVES.slice(0, k)), "ready");
});

test("the map stage gives way to the player: a position that it holds in its queue is searched first for the page", async () => {
  const { game, searches } = await noMaps(1, "g11");
  void game.sweep();
  await turns();
  game.passMaps(true, []); // "" runs; "a", "a b" and "a b c" wait, in that order
  await turns();
  game.askOwnership([["a", "b", "c"]]); // the player steps to the last position, which the stage would search last
  await turns();
  searches.at(-1)!.end(MAP_VISITS, false, { ownership: [0.1] }); // the pass's search of ""
  await turns();
  const asked = searches.at(-1)!;
  assert.deepEqual([asked.query.moves, !!asked.query.slice], [["a", "b", "c"], false]); // the page's own search, first
  asked.end(MAP_VISITS, false, { ownership: [0.5] });
  await turns();
  assert.equal(game.mapState(["a", "b", "c"]), "ready");
  // The stage searches the rest, and not "a b c" again
  for (const moves of [["a"], ["a", "b"]]) {
    assert.deepEqual(searches.at(-1)!.query.moves, moves);
    searches.at(-1)!.end(MAP_VISITS, false, { ownership: [0.2] });
    await turns();
  }
  assert.equal(searches.length, 4);
  assert.equal(game.mapPass, null);
});

test("results that the area map's first builds stored as shape 6 open the review with no search, with their maps", async () => {
  const { pool, searches } = fakePool();
  const deep = 16384, model = pool.model!.sha256;
  for (let i = 0; i <= MOVES.length; i++)
    await cachePut(analysisKey(pool.search!, model, MOVES.slice(0, i), deep, 6), { ...toAnalysis(words, reply(deep)), ownership: [i] });
  const game = new GameAnalysis(words, pool, MOVES, "g12");
  await game.start();
  await game.fromStore(pool.search!, model);
  void game.sweep();
  await turns();
  mock.timers.tick(BATCH_MS);
  game.askOwnership([["a"]]);
  await turns();
  assert.equal(searches.length, 0); // no review again, and no map searched
  assert.equal(game.labelled, game.passCount);
  assert.deepEqual(game.mapAt(["a"]), [1]);
});

test("every state of a map ends: a variation's position that nothing searches gets a short search, not a wait", async () => {
  const { game, searches } = await noMaps(2, "g10");
  void game.sweep();
  await turns();
  await game.addLine(["a", "x"], false); // a variation's position, with no result: no search comes until the player looks
  game.askOwnership([["a", "x"]]);
  await turns();
  const s = searches.at(-1)!;
  assert.deepEqual([s.query.moves, s.query.maxVisits], [["a", "x"], MAP_VISITS]);
  assert.equal(game.mapState(["a", "x"]), "searching");
  s.end(MAP_VISITS, false, { ownership: [0.6] });
  await turns();
  assert.equal(game.mapState(["a", "x"]), "ready");
});

test("a variation's position on screen waits for its own search, which brings its map, and gets no short search", async () => {
  const { game, searches } = await noMaps(2, "g13");
  void game.sweep();
  await turns();
  await game.addLine(["a", "y"], false);
  game.focus(["a", "y"]); // the player steps to it: its search for the player comes
  game.askOwnership([["a", "y"]]);
  await turns();
  const own = searches.filter(s => s.query.moves.join(" ") === "a y");
  assert.equal(own.length, 1);
  assert.notEqual(own[0].query.maxVisits, MAP_VISITS);
  assert.equal(game.mapState(["a", "y"]), "waiting");
  own[0].end(own[0].query.maxVisits, false, { ownership: [0.7] });
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.deepEqual(game.mapAt(["a", "y"]), [70]);
});

test("every state of a map ends: a map that the stage held and dropped is asked for again", async () => {
  const { game, searches } = await noMaps(1, "g8");
  void game.sweep();
  await turns();
  game.passMaps(true, []); // from the start: "" first, then "a", "a b", "a b c"
  await turns();
  assert.deepEqual(searches.at(-1)!.query.moves, []);
  game.askOwnership([["a", "b"]]); // the page wants a position that the stage holds in its queue: its own search too
  assert.equal(game.mapState(["a", "b"]), "waiting");
  game.passMaps(false, []); // the map stage stops: its queued search of "a b" ends with no map
  searches.at(-1)!.end(MAP_VISITS, false, { ownership: [0.1] });
  await turns();
  const again = searches.at(-1)!;
  assert.deepEqual([again.query.moves, !!again.query.slice], [["a", "b"], false]); // asked again, for the page
  again.end(MAP_VISITS, false, { ownership: [0.4] });
  await turns();
  assert.equal(game.mapState(["a", "b"]), "ready");
});

test("every state of a map ends: a review snapshot reads its stored maps with no network, and a map that it lacks cannot come", async () => {
  const { pool, searches } = fakePool();
  const visits = 512, search = "earlier", model = `earlier-${pool.model!.sha256}`;
  for (let i = 0; i <= MOVES.length; i++)
    await cachePut(analysisKey(search, model, MOVES.slice(0, i), visits), toAnalysis(words, reply(visits)));
  await mapPut(search, model, ["a"], { ownership: [50], visits: MAP_VISITS, source: "short search" });
  // As the review page opens a review snapshot (design 20): the rules alone, an earlier engine's results, no network
  const game = new GameAnalysis(words, pool, MOVES, "g14");
  game.setReview(visits);
  await game.start();
  await game.fromStore(search, model);
  game.freeze(search, model);
  game.askOwnership([["a"], ["a", "b"]]);
  await turns();
  assert.deepEqual(game.mapAt(["a"]), [50]);
  assert.deepEqual([game.mapState(["a"]), game.mapState(["a", "b"])], ["ready", "unavailable"]);
  game.passMaps(true, []);
  await turns();
  assert.deepEqual([searches.length, game.mapPass], [0, null]);
});

test("every state of a map ends: a map asked for on the old network is asked for again on the new one", async () => {
  const { game, searches } = await noMaps(2, "g15");
  void game.sweep();
  await turns();
  await game.addLine(["a", "x"], false);
  game.askOwnership([["a", "x"]]);
  await turns();
  const old = searches.at(-1)!;
  assert.deepEqual(old.query.moves, ["a", "x"]);
  // Another network, ready before the old network's search of the map ends
  game.dropAnalysis();
  const next = fakePool(2);
  game.usePool(next.pool);
  void game.sweep();
  await turns();
  old.end(MAP_VISITS, false, { ownership: [0.1] }); // dropped: the old network's
  await turns();
  const asked = next.searches.find(s => s.query.moves.join(" ") === "a x" && s.query.maxVisits === MAP_VISITS);
  assert.ok(asked, "the map is searched on the new network");
  asked.end(MAP_VISITS, false, { ownership: [0.2] });
  await turns();
  assert.deepEqual(game.mapAt(["a", "x"]), [20]);
});

test("every state of a map ends: a board position whose own search finds a stored result with no map gets a short search", async () => {
  const { pool, searches } = fakePool(2);
  await cachePut(analysisKey(pool.search!, pool.model!.sha256, ["a"], 16384), toAnalysis(words, reply(16384)));
  const game = new GameAnalysis(words, pool, MOVES, BOARD_ID);
  await game.start();
  void game.sweep();
  await turns();
  game.focus(["a"]); // the player steps to it: its own search comes, and finds the result stored before the maps
  game.askOwnership([["a"]]);
  assert.equal(game.mapState(["a"]), "waiting");
  await turns();
  mock.timers.tick(BATCH_MS);
  await turns();
  const asked = searches.find(s => s.query.moves.join(" ") === "a" && s.query.maxVisits === MAP_VISITS);
  assert.ok(asked, "the map gets a short search once the position's own result has none");
  asked.end(MAP_VISITS, false, { ownership: [0.3] });
  await turns();
  assert.equal(game.mapState(["a"]), "ready");
});

test("every state of a map ends: the engine off and on again while the map stage runs a search starts the stage again", async () => {
  const { game, searches } = await noMaps(1, "g16");
  void game.sweep();
  await turns();
  game.passMaps(true, []); // "" runs, the others wait
  await turns();
  const old = searches.at(-1)!;
  game.setPaused(true); // its search stops at the end of its slice, and the others go
  game.setPaused(false); // on again before that slice ends
  await turns();
  old.end(MAP_VISITS / 4); // the stopped slice ends, with no map
  await turns();
  assert.ok(game.mapPass, "the stage runs on");
  // The new stage's search of the same map holds its state: the stopped slice's task does not end it
  assert.equal(game.mapState([]), "searching");
  for (let k = 0; k < game.passCount; k++) {
    const s = searches.at(-1)!;
    assert.deepEqual(s.query.moves, MOVES.slice(0, k));
    s.end(MAP_VISITS, false, { ownership: [0.2] });
    await turns();
  }
  assert.equal(game.mapPass, null);
  for (let k = 0; k < game.passCount; k++) assert.equal(game.mapState(MOVES.slice(0, k)), "ready");
});

test("every state of a map ends: the game's last position, where it ends, has no map", async () => {
  const rules = { describeGame: async (q: { moves: string[] }) =>
    ({ reply: { positions: Array.from({ length: q.moves.length + 1 }, (_, k) => wordFields(k, k === MOVES.length)) } }) };
  const { pool, searches } = fakePool(2);
  Object.assign(pool, { rules });
  const game = new GameAnalysis(words, pool, MOVES, "g17");
  await game.start();
  void game.sweep();
  await turns();
  game.askOwnership([MOVES]);
  await turns();
  assert.equal(searches.filter(s => s.query.moves.length === MOVES.length).length, 0);
  assert.deepEqual([game.mapState(MOVES), game.hasNoMap(MOVES)], ["none", true]);
});

test("every state of a map ends: a map asked for just before the engine goes off is searched once it is on again", async () => {
  const { game, searches } = await noMaps(2, "g18");
  void game.sweep();
  await turns();
  await game.addLine(["a", "x"], false);
  const map = () => searches.filter(s => s.query.moves.join(" ") === "a x" && s.query.maxVisits === MAP_VISITS);
  game.askOwnership([["a", "x"]]); // its task reads the store first
  game.setPaused(true); // off while it reads: no search starts while the engine is off
  await turns();
  assert.deepEqual([map().length, game.mapState(["a", "x"])], [0, "waiting"]);
  game.setPaused(false);
  await turns();
  assert.equal(map().length, 1);
  map()[0].end(MAP_VISITS, false, { ownership: [0.1] });
  await turns();
  assert.equal(game.mapState(["a", "x"]), "ready");
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

test("the stages end with the old network: no label search starts on its pool or reads its results", async () => {
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
  for (const id of ["g", BOARD_ID]) { // the review's stages, and the board's searches
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
  await endEach(searches, n, 2 * n - 2, game.labelVisits); // the label stage but its last two searches
  assert.equal(game.labelled, 0); // the label stage's next search waited for the engine: the results wait for the batch
  searches[2 * n - 2].end(game.labelVisits);
  await turns();
  assert.equal(game.labelled, n - 1); // its last search has the engine, and no search waits
});

test("once no search waits, a result shows without the batch's timer while a focus runs", async () => {
  const { game, searches } = await sweeping(2);
  const n = game.passCount;
  await endEach(searches, 0, n, SWEEP_VISITS);
  await endEach(searches, n, 2 * n - 2, game.labelVisits); // the label stage's last two searches have the engines
  game.focus(game.mainNames.slice(0, 1)); // the player looks at a position: its search waits for an engine
  await settle();
  searches[2 * n - 2].end(game.labelVisits);
  await turns();
  assert.equal(searches.length, 2 * n + 1); // the focus has the engine, and no search waits
  assert.equal(game.labelled, n - 1);
});

test("the label stage's last result shows without the batch's timer, though searches wait", async () => {
  const { game, pool, searches } = await sweeping(1);
  const n = game.passCount;
  await endEach(searches, 0, n, SWEEP_VISITS);
  await endEach(searches, n, 2 * n - 1, game.labelVisits); // the label stage but its last search, which has the engine
  // Two Greats' confirmations wait: once the label stage's last search ends, one of them takes the engine, one waits.
  for (let k = 0; k < 2; k++) void pool.run(0, "confirm", () => new Promise(() => {}));
  searches[2 * n - 1].end(game.labelVisits);
  await turns();
  assert.equal(game.labelled, n); // the review's last step, which waits for it, does not wait for the timer
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
  await endEach(searches, 0, n, SWEEP_VISITS); // the label stage starts
  game.focus(game.mainNames.slice(0, 1)); // the player moves on: the start's search stops, and the store never gets it
  focus.end(visits + 96);
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.deepEqual([game.analysis[0]?.visits, game.labelled], [visits + 96, 0]);
  await endEach(searches, n + 1, 2 * n + 1, visits); // the label stage, the start's search too
  mock.timers.tick(BATCH_MS);
  assert.deepEqual([game.analysis[0]?.visits, game.labelled], [visits + 96, n]); // the deeper result stays on screen
  assert.ok(written().includes(analysisKey(pool.search!, pool.model!.sha256, [], visits)));
});

test("a position whose result the store has, and the analysis lost, takes it from the store: a variation deleted and played again", async () => {
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
  await endEach(searches, 0, n, SWEEP_VISITS); // the label stage starts: the start's label search runs with the focus
  assert.equal(game.pending([]), true);
  game.focus(game.mainNames.slice(0, 1)); // the player moves on: the start's search stops
  focus.end(visits + 96);
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.deepEqual([game.analysis[0]?.visits, game.pending([])], [visits + 96, false]); // the label search runs on
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
  return { game, pool, searches };
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

test("a Great's confirmation is asked for only where the only good move keeps what the other player's last turn gave", async () => {
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
  // The first move has no turn of the other player before it.
  assert.equal(game.earlierAt([], 0), undefined);
  // A variation: the position before the other player's last turn is the game's, or the variation's own.
  await game.addLine(["a", "b", "x", "y"], false);
  assert.equal(game.earlierAt(["a", "b", "x"], 1), game.analysis[2]);
});

/** The rules of a game with turns as Enclosure's: the first player's turn of one move, then turns of two (positions 1
 *  and 2 the second player's). */
const turnsOfTwo = {
  describeGame: async (q: { moves: string[] }) => ({ reply: { positions: Array.from({ length: q.moves.length + 1 }, (_, k) =>
    ({ ...wordFields(k), mover: (k === 0 || Math.floor((k - 1) / 2) % 2 === 1 ? 0 : 1) as Player })) } }),
};

test("a turn of two whose start keeps the gain asks for the search from its middle, though its middle does not", async () => {
  const { pool } = fakePool();
  Object.assign(pool, { rules: turnsOfTwo });
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

/** The game `moves` under `id`, by default a b c d (the first player moves first, so a and c are the first player's),
 *  the rules of the test game unless `rules` are given, and a pool of `engines` engines (fakePool). The engine is
 *  ready. `asked` asks for the Greats' searches, as the page does at each result, and gives each search's moves.
 *  `branchX` adds the first player's move x after a b as a variation, with `analysis` after it. */
async function greatBranch(id = "g", { moves = ["a", "b", "c", "d"], rules, engines }: {
  moves?: string[]; rules?: typeof turnsOfTwo; engines?: number;
} = {}) {
  const { pool, searches } = fakePool(engines);
  if (rules) Object.assign(pool, { rules });
  const game = new GameAnalysis(words, pool, moves, id);
  await game.start();
  game.engineReady = true;
  const at = (blueWin: number, candidates: [string, number][] = [], visits = game.labelVisits) =>
    ({ blueWin, visits, candidates: candidates.map(([edge, w]) => ({ edge, visits: 10, blueWin: w })) });
  const asked = async () => { game.confirmGreats(); await turns(); return searches.map(s => s.moves.join(" ")); };
  const branchX = async (analysis: ReturnType<typeof at>, judged = false) => {
    await game.addLine(["a", "b", "x"], false);
    game.branches = { ...game.branches, "a b x": { ...game.branches["a b x"], analysis, ...(judged ? { judged } : {}) } };
  };
  return { game, pool, searches, at, asked, branchX };
}

test("Evaluate quality searches the position before the other player's last turn where the move is the only good move", async () => {
  const { game, at, asked, branchX } = await greatBranch();
  await branchX(at(0.6));
  // x is the first player's first choice after a b, and the second choice z looks 0.15 worse. Before b, the position
  // "a", the first player had 0.5 (searched below), so x keeps the 0.1 that b gave.
  const only = at(0.6, [["x", 0.6], ["z", 0.45]]);
  game.analysis = [at(0.5), undefined, only, at(0.6), at(0.6)];
  await game.judge(["a", "b", "x"]);
  await turns();
  // The move's label, as the review reads it (ReviewView, branchLabel).
  const node = () => game.branches["a b x"];
  const label = () => judgeBranchMove(words, game.analysisOf(["a", "b"]), valuesAfter(node().position, node().analysis, "lead", LABEL_VISITS),
                                      0, "x", "lead", LABEL_VISITS, game.secondAt(["a", "b"]), game.earlierAt(["a", "b"], 0));
  const own = (await asked()).length;
  assert.equal((await asked()).filter(m => m === "a").length, 1); // asked once, though the page asks again at each result
  // The move shows "Evaluating…", not the Best that its label gives until then.
  assert.deepEqual([game.awaitsGreat("a b x"), label()], [true, "best"]);
  assert.equal(game.greatChecks.total, 0); // the review's own steps do not count it
  // The search ends: the position keeps the gain, so the confirmation of the gap is asked for, and the move waits for it.
  game.analysis = [at(0.5), at(0.5), only, at(0.6), at(0.6)];
  assert.equal((await asked()).at(-1), "a b z");
  assert.equal(own + 1, (await asked()).length);
  assert.equal(game.awaitsGreat("a b x"), true);
  assert.equal(game.greatChecks.total, 0); // the confirmation is the player's evaluation too
  game.outside = { "a b z": at(0.4) };
  assert.deepEqual([game.awaitsGreat("a b x"), label()], [false, "great"]);
});

test("Evaluate quality asks for no search of the earlier position without the gap, or where it has its result", async () => {
  const { game, at, asked, branchX } = await greatBranch();
  await branchX(at(0.6));
  await game.judge(["a", "b", "x"]);
  const earlier = async () => (await asked()).filter(m => m === "a").length;
  // The second choice looks 0.05 worse: x is not the only good move.
  game.analysis = [at(0.5), undefined, at(0.6, [["x", 0.6], ["z", 0.55]]), at(0.6), at(0.6)];
  assert.deepEqual([await earlier(), game.awaitsGreat("a b x")], [0, false]);
  // x is not the first choice.
  game.analysis = [at(0.5), undefined, at(0.6, [["z", 0.6], ["x", 0.4]]), at(0.6), at(0.6)];
  assert.deepEqual([await earlier(), game.awaitsGreat("a b x")], [0, false]);
  // The search before the move is shallower than the label budget: it asks once that search has the budget.
  const only = [["x", 0.6], ["z", 0.45]] as [string, number][];
  game.analysis = [at(0.5), undefined, at(0.6, only, game.labelVisits / 2), at(0.6), at(0.6)];
  assert.deepEqual([await earlier(), game.awaitsGreat("a b x")], [0, false]);
  // The position before b has its result already, and x does not gain on it: no search, no wait, and no Great.
  game.analysis = [at(0.5), at(0.58), at(0.6, only), at(0.6), at(0.6)];
  assert.deepEqual([await earlier(), game.awaitsGreat("a b x")], [0, false]);
  assert.equal(game.greatChecks.total, 0);
  // A deeper result before the move changes its first choice and its gap: the analysis asks for the search then.
  game.analysis = [at(0.5), undefined, at(0.6, only), at(0.6), at(0.6)];
  assert.deepEqual([await earlier(), game.awaitsGreat("a b x")], [1, true]);
});

test("the Analysis board's moves evaluated ask for the earlier position too, and the review's game moves do not", async () => {
  const board = await greatBranch(BOARD_ID);
  const only = (g: typeof board) => g.at(0.6, [["c", 0.6], ["z", 0.45]]);
  board.game.analysis = [board.at(0.5), undefined, only(board), board.at(0.6), board.at(0.6)];
  assert.deepEqual([(await board.asked()).includes("a"), board.game.awaitsGreat("a b c")], [false, false]); // not asked to evaluate
  board.game.judgedMain = { "a b c": true };
  assert.deepEqual([(await board.asked()).filter(m => m === "a").length, board.game.awaitsGreat("a b c")], [1, true]);
  // A review's game move: its stages search the position, so the analysis asks for nothing.
  const review = await greatBranch();
  review.game.analysis = [review.at(0.5), undefined, only(review), review.at(0.6), review.at(0.6)];
  assert.deepEqual([(await review.asked()).includes("a"), review.game.awaitsGreat("a b c")], [false, false]);
  assert.equal(review.game.greatChecks.total, 0); // no earlier result, so no Great to confirm
});

test("a turn of two that the board evaluates asks for the position before the other player's last turn, and waits for it", async () => {
  const enclosure = { moves: ["a", "b", "c", "d", "e"], rules: turnsOfTwo };
  const { game, at, asked } = await greatBranch(BOARD_ID, enclosure);
  // The second player's turn b c from position 1 is the only good turn (x looks 0.16 worse), and the first player's
  // turn a, before it, has no search yet. In the turn's middle, c is not the only good move (y looks 0.04 worse): the
  // turn alone asks for that search for c.
  game.analysis = [undefined, at(0.44, [["b", 0.44], ["x", 0.6]]), at(0.46, [["c", 0.46], ["y", 0.5]]), at(0.46), at(0.46), at(0.46)];
  game.judgedMain = { "a b": true, "a b c": true }; // both edges of the turn, as Evaluate quality asks (turnKeys)
  assert.deepEqual(await asked(), [""]); // once, for the turn and for its edge b
  // The turn waits as a whole, at its last edge c, and the edge b for its own Great.
  assert.deepEqual([game.awaitsGreat("a b c"), game.awaitsGreat("a b")], [true, true]);
  // The board shows a turn's label only where each of its edges was evaluated: without c, the turn asks for nothing.
  const one = await greatBranch(BOARD_ID, enclosure);
  one.game.analysis = game.analysis;
  one.game.judgedMain = { "a b": true };
  await one.asked();
  assert.equal(one.game.awaitsGreat("a b c"), false);
});

test("a Great's confirmation that the player asked for comes before the review's label stage", async () => {
  const { game, pool, at, asked, searches, branchX } = await greatBranch("g", { engines: 1 });
  // x is the only good move after a b, and keeps the 0.1 that b gave: its confirmation, the position after z, is asked for.
  game.analysis = [at(0.5), at(0.5), at(0.6, [["x", 0.6], ["z", 0.45]]), at(0.6), at(0.6)];
  await branchX(at(0.6), true);
  // Two searches at the label stage's priority (2): the first takes the engine, and the second waits, as the
  // confirmation does.
  for (const moves of [["a", "b", "c"], []])
    void pool.run(2, "label", engine => engine.analyse({ moves } as unknown as AnalysisQuery).done).catch(() => {});
  await turns();
  assert.deepEqual(await asked(), ["a b c"]);
  assert.equal(game.awaitsGreat("a b x"), true);
  searches[0].end(game.labelVisits);
  await turns();
  assert.equal(searches[1].moves.join(" "), "a b z"); // "Evaluating…" waits for the confirmation alone
});

test("a Great's search that another review depth drops is asked for again, though its depth stays the same", async () => {
  const { game, at, asked, searches, branchX } = await greatBranch("g", { engines: 1 });
  game.labelVisits = 512;
  // x is the only good move after a b, and keeps the gain: its confirmation searches the position after z to 512 visits.
  game.analysis = [at(0.5), at(0.5), at(0.6, [["x", 0.6], ["z", 0.45]]), at(0.6), at(0.6)];
  await branchX(at(0.6), true);
  game.focus(["a", "b", "c"]); // the position on screen's search takes the engine, and the confirmation waits
  await turns();
  assert.deepEqual(await asked(), ["a b c"]);
  // A review of 256 visits drops the confirmation from the pool's queue. The confirmation still searches 512 visits, as
  // deep as the position after x. The page asks for it again in the same flush of its effects (session.svelte.ts),
  // before the drop's rejection has settled.
  game.setReview(256);
  game.confirmGreats();
  for (let k = 0; k < searches.length; k++) {
    searches[k].end(4096);
    await turns();
  }
  assert.ok(searches.some(s => s.moves.join(" ") === "a b z"));
});

test("a move that looks like the only good move in the shallower result that shows a label waits for the label budget", async () => {
  const { game, at, asked, branchX } = await greatBranch();
  game.labelVisits = 512; // the review's depth: labels show from 256 visits on (LABEL_VISITS)
  await branchX(at(0.6, [], 256));
  await game.judge(["a", "b", "x"]);
  const only = [["x", 0.6], ["z", 0.45]] as [string, number][];
  // At 256 visits the label would show Best: the move waits, and asks for no search of the earlier position yet.
  game.analysis = [at(0.5), undefined, at(0.6, only, 256), at(0.6), at(0.6)];
  assert.deepEqual([(await asked()).includes("a"), game.awaitsGreat("a b x")], [false, true]);
  // Another first choice at 256 visits: the label shows.
  game.analysis = [at(0.5), undefined, at(0.6, [["z", 0.6], ["x", 0.4]], 256), at(0.6), at(0.6)];
  assert.equal(game.awaitsGreat("a b x"), false);
  // At the label budget it asks for the earlier position, as before.
  game.analysis = [at(0.5), undefined, at(0.6, only, 512), at(0.6), at(0.6)];
  assert.deepEqual([(await asked()).includes("a"), game.awaitsGreat("a b x")], [true, true]);
});

test("the threat: a search of the position after a pass, to the focus's visits and time limit, shown as it comes", async () => {
  const { game, searches } = await focusing();
  game.askThreat(["a"]);
  await settle();
  const threat = searches.find(s => s.moves.join(" ") === "a pass")!;
  assert.deepEqual([threat.query.maxVisits, threat.maxMs, game.threatState(["a"])], [4096, 2000, "searching"]);
  threat.partial(32);
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.deepEqual([game.threatAt(["a"])?.visits, game.threatState(["a"])], [32, "searching"]);
  threat.end(4096);
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.deepEqual([game.threatAt(["a"])?.visits, game.threatState(["a"])], [4096, "ready"]);
});

test("the threat gives way to the search of the player's own position, and another position's threat replaces it", async () => {
  const { pool, searches } = fakePool(1);
  const game = new GameAnalysis(words, pool, MOVES, BOARD_ID);
  await game.start();
  await game.sweep();
  game.setDepth(1024, null);
  game.askThreat(["a"]); // asked first, searched after the focus
  game.focus(["a"]);
  await turns();
  assert.deepEqual([searches.map(s => s.moves.join(" ")), game.threatState(["a"])], [["a"], "waiting"]);
  game.askThreat(["a", "b"]);
  searches[0].end(1024);
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.deepEqual(searches.map(s => s.moves.join(" ")), ["a", "a b pass"]);
  assert.deepEqual([game.threatState(["a"]), game.threatState(["a", "b"])], ["unasked", "searching"]);
});

test("a stored threat is read, not searched again, and a review snapshot reads its threats from the store alone", async () => {
  const { game, pool, searches } = await focusing();
  await cachePut(analysisKey(pool.search!, pool.model!.sha256, ["a", "pass"], 4096), toAnalysis(words, reply(4096)));
  game.askThreat(["a"]);
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.deepEqual([searches.length, game.threatAt(["a"])?.visits, game.threatState(["a"])], [1, 4096, "ready"]);
  const frozen = new GameAnalysis(words, pool, MOVES, "g-threat");
  await frozen.start();
  frozen.freeze(pool.search!, pool.model!.sha256);
  frozen.askThreat(["a"]);
  frozen.askThreat(["a", "b"]);
  await turns();
  assert.deepEqual([frozen.threatAt(["a"])?.visits, frozen.threatState(["a"]), frozen.threatState(["a", "b"]), searches.length],
                   [4096, "ready", "unavailable", 1]);
});

test("where the pass ends the game there is no threat, and no search", async () => {
  const { pool, searches } = fakePool();
  // The rules of a game that a pass ends
  const describeGame = async (q: PositionQuery) => (q.moves.at(-1) === "pass"
    ? { reply: { positions: [wordFields(q.moves.length, true)] } } : wordRules.describeGame(q));
  Object.assign(pool, { rules: { describeGame } });
  const game = new GameAnalysis(words, pool, MOVES, BOARD_ID);
  await game.start();
  await game.sweep();
  game.askThreat(["a"]);
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.deepEqual([searches.length, game.threatState(["a"])], [0, "none"]);
});

test("the engine off stops the threat's search, and the engine on searches it again", async () => {
  const { game, searches } = await focusing();
  game.askThreat(["a"]);
  await turns();
  game.setPaused(true);
  assert.equal(searches[1].stopped, true);
  searches[1].end(64);
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.equal(game.threatState(["a"]), "ready"); // its result so far stays
  game.setPaused(false);
  await turns();
  assert.deepEqual([searches.length, searches[2]?.moves.join(" "), game.threatState(["a"])], [3, "a pass", "searching"]);
});

test("the map of the threat's position waits for the threat's search, which brings it, and gets no short search", async () => {
  const { game, searches } = await focusing();
  game.askThreat(["a"]);
  await turns();
  game.askOwnership([["a", "pass"]]);
  await turns();
  assert.deepEqual([searches.length, game.mapState(["a", "pass"])], [2, "waiting"]);
  searches[1].end(4096, false, { ownership: [0.5] });
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.deepEqual([searches.length, game.mapState(["a", "pass"])], [2, "ready"]);
});

/** A search's reply at `visits` visits with Blue's win chance `blueWin` and lead `lead`, and no candidate. */
function valued(visits: number, blueWin: number, lead: number): AnalysisReply {
  const r = reply(visits);
  return { ...r, rootInfo: { ...r.rootInfo, winrate: blueWin, scoreLead: lead } };
}

test("a position with a deeper stored result than the threat's gets its size from a search with the threat's settings", async () => {
  const { game, pool, searches } = await focusing(); // the Depth: 4,096 visits, 2 seconds
  // The position after "a", Red to move, holds a deeper result: Red's win chance 0.9 at 8,192 visits
  await cachePut(analysisKey(pool.search!, pool.model!.sha256, ["a"], 8192), toAnalysis(words, valued(8192, 0.1, -40)));
  game.focus(["a"]);
  await turns();
  assert.equal(game.analysisOf(["a"])?.visits, 8192);
  game.askThreat(["a"]);
  await turns();
  const own = searches.find(s => s.moves.join(" ") === "a")!, threat = searches.find(s => s.moves.join(" ") === "a pass")!;
  assert.deepEqual([own.query.maxVisits, own.maxMs], [4096, 2000]); // the position too, with the threat's settings
  own.end(4096, false, valued(4096, 0.3, -20)); // Red 0.7, lead Red +20
  threat.end(4096, false, valued(4096, 0.8, 30)); // after the pass: Red 0.2, lead Blue +30
  await turns();
  mock.timers.tick(BATCH_MS);
  const cost = game.threatCost(["a"]);
  assert.ok(cost && Math.abs(cost.win - 0.5) < 1e-9, `the cost ${cost?.win}, not 0.7 against the deeper result`);
  assert.equal(cost.points, 50);
  assert.equal(game.analysisOf(["a"])?.visits, 8192); // the position keeps its deepest result
  // The position's result with the threat's settings is stored, and read again, not searched
  const again = new GameAnalysis(words, pool, MOVES, BOARD_ID);
  await again.start();
  await again.sweep();
  again.setDepth(4096, 2);
  again.focus(["a"]);
  again.askThreat(["a"]);
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.ok(Math.abs((again.threatCost(["a"])?.win ?? 0) - 0.5) < 1e-9);
  assert.equal(searches.length, 3); // the first game's focus of [] and its two searches above, and nothing again
});

test("a review snapshot's threat size compares the stored threat with the position's stored result as deep, with no search", async () => {
  const { pool, searches } = fakePool();
  const search = "earlier", model = `earlier-${pool.model!.sha256}`;
  for (let i = 0; i <= MOVES.length; i++) await cachePut(analysisKey(search, model, MOVES.slice(0, i), 8192), toAnalysis(words, valued(8192, 0.1, -40)));
  await cachePut(analysisKey(search, model, ["a"], 1024), toAnalysis(words, valued(1024, 0.3, -20)));
  await cachePut(analysisKey(search, model, ["a", "pass"], 1024), toAnalysis(words, valued(1024, 0.8, 30)));
  const game = new GameAnalysis(words, pool, MOVES, "g-threat-snapshot");
  game.setReview(8192);
  await game.start();
  await game.fromStore(search, model);
  game.freeze(search, model);
  game.askThreat(["a"]);
  await turns();
  assert.equal(game.analysisOf(["a"])?.visits, 8192);
  const cost = game.threatCost(["a"]);
  assert.ok(cost && Math.abs(cost.win - 0.5) < 1e-9, `the cost ${cost?.win}`);
  assert.deepEqual([cost.points, searches.length], [50, 0]);
});

test("a review snapshot gets the position after the pass from the rules: the threat's line, and no threat where it ends the game", async () => {
  const { pool, searches } = fakePool();
  const describeGame = async (q: PositionQuery) => (q.moves.join(" ") === "a b pass"
    ? { reply: { positions: [wordFields(q.moves.length, true)] } } : wordRules.describeGame(q));
  Object.assign(pool, { rules: { describeGame } });
  const search = "earlier", model = `earlier-${pool.model!.sha256}`;
  await cachePut(analysisKey(search, model, ["a", "pass"], 1024), toAnalysis(words, reply(1024)));
  const game = new GameAnalysis(words, pool, MOVES, "g-threat-rules");
  await game.start();
  game.freeze(search, model);
  game.askThreat(["a"]);
  await turns();
  game.askThreat(["a", "b"]);
  await turns();
  assert.deepEqual([!!game.passedAt(["a"]), game.threatState(["a"]), game.threatState(["a", "b"]), searches.length],
                   [true, "ready", "none", 0]);
});

/** The searches of the position with these moves to these visits. */
const searchesOf = <S extends { moves: string[]; query: AnalysisQuery }>(searches: S[], moves: string, visits: number) =>
  searches.filter(s => s.moves.join(" ") === moves && s.query.maxVisits === visits);

test("with the Depth lowered, the threat's size compares two searches at the new Depth, and the deeper results stay", async () => {
  const { game, searches } = await focusing(); // the Depth: 4,096 visits, 2 seconds
  game.focus(["a"]);
  game.askThreat(["a"]);
  await turns();
  searchesOf(searches, "a", 4096)[0].end(4096, false, valued(4096, 0.3, -20));
  searchesOf(searches, "a pass", 4096)[0].end(4096, false, valued(4096, 0.8, 30));
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.ok(Math.abs((game.threatCost(["a"])?.win ?? 0) - 0.5) < 1e-9);
  game.setDepth(1024, 2);
  await turns();
  // Both positions hold 4,096 visits: each is searched to the new Depth for the size, which waits for them
  const [own, threat] = [searchesOf(searches, "a", 1024), searchesOf(searches, "a pass", 1024)];
  assert.deepEqual([game.threatCost(["a"]), own.length, threat.length, own[0]?.maxMs], [undefined, 1, 1, 2000]);
  own[0].end(1024, false, valued(1024, 0.4, -10)); // Red 0.6, lead Red +10
  threat[0].end(1024, false, valued(1024, 0.6, 10)); // after the pass: Red 0.4, lead Blue +10
  await turns();
  mock.timers.tick(BATCH_MS);
  const cost = game.threatCost(["a"]);
  assert.ok(cost && Math.abs(cost.win - 0.2) < 1e-9, `the cost ${cost?.win}, not against a result of 4,096 visits`);
  assert.equal(cost.points, 20);
  assert.deepEqual([game.analysisOf(["a"])?.visits, game.threatAt(["a"])?.visits], [4096, 4096]);
});

test("a size's search runs on when its threat is asked again, and its part gives no size once the engine is off", async () => {
  const { game, pool, searches } = await focusing();
  await cachePut(analysisKey(pool.search!, pool.model!.sha256, ["a"], 8192), toAnalysis(words, valued(8192, 0.1, -40)));
  game.focus(["a"]);
  await turns();
  game.askThreat(["a"]);
  await turns();
  const sized = () => searchesOf(searches, "a", 4096);
  searchesOf(searches, "a pass", 4096)[0].end(4096, false, valued(4096, 0.8, 30));
  sized()[0].partial(64);
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.ok(game.threatCost(["a"])); // its results so far, as they come
  game.askThreat(["a"]); // asked again, as the engine's work asks again for what the page wants (askAgain)
  await turns();
  assert.deepEqual([sized().length, sized()[0].stopped], [1, false]);
  game.setPaused(true);
  sized()[0].end(64);
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.equal(game.threatCost(["a"]), undefined);
  game.setPaused(false);
  await turns();
  assert.deepEqual([sized().length, sized()[1].stopped], [2, false]);
});

test("the size compares the focus's own search, which the time limit stopped short of the deeper result the tree holds", async () => {
  const { game, pool, searches } = await focusing(); // the Depth: 4,096 visits, 2 seconds
  await cachePut(analysisKey(pool.search!, pool.model!.sha256, ["a"], 512), toAnalysis(words, valued(512, 0.1, -40)));
  await game.fromStore(pool.search!, pool.model!.sha256); // a review's result of 512 visits
  game.focus(["a"]);
  game.askThreat(["a"]);
  await turns();
  // Both searches stop at the time limit short of 512 visits: the tree keeps the review's result
  searchesOf(searches, "a", 4096)[0].end(150, true, valued(150, 0.3, -20));
  searchesOf(searches, "a pass", 4096)[0].end(160, true, valued(160, 0.8, 30));
  await turns();
  mock.timers.tick(BATCH_MS);
  const cost = game.threatCost(["a"]);
  assert.equal(game.analysisOf(["a"])?.visits, 512);
  assert.ok(cost && Math.abs(cost.win - 0.5) < 1e-9, `the cost ${cost?.win}, not against the result of 512 visits`);
  // Another time limit: both are searched again, and the size waits for them
  game.setDepth(4096, 5);
  game.focus(["a"]);
  await turns();
  assert.deepEqual([game.threatCost(["a"]), searchesOf(searches, "a", 4096).length, searchesOf(searches, "a pass", 4096).length],
                   [undefined, 2, 2]);
});

test("where the pass ends the game, a position deeper than the threat's settings gets no search for a size", async () => {
  const { pool, searches } = fakePool();
  const describeGame = async (q: PositionQuery) => (q.moves.at(-1) === "pass"
    ? { reply: { positions: [wordFields(q.moves.length, true)] } } : wordRules.describeGame(q));
  Object.assign(pool, { rules: { describeGame } });
  await cachePut(analysisKey(pool.search!, pool.model!.sha256, ["a"], 8192), toAnalysis(words, valued(8192, 0.1, -40)));
  const game = new GameAnalysis(words, pool, MOVES, BOARD_ID);
  await game.start();
  await game.sweep();
  game.setDepth(1024, null);
  await game.fromStore(pool.search!, pool.model!.sha256);
  game.askThreat(["a"]);
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.deepEqual([searches.length, game.threatState(["a"]), game.threatCost(["a"])], [0, "none", undefined]);
});

// The opening book's values (useBook, Hedge School's design 32): the review judges the positions that the book holds
// by them, and its stages search only the others.
/** A book position's values (model.ts, Analysis `book`): Blue's win chance, the visits of the book's searches. */
const bookAt = (blueWin: number): Analysis<string> => ({ blueWin, visits: 512, candidates: [], book: true });

test("the book's values: the review judges by them, the stages search only outside the book, and the engine's own results stay", async () => {
  const { pool, searches } = fakePool();
  const game = new GameAnalysis(words, pool, MOVES, "g");
  await game.start();
  game.useBook([bookAt(0.5), bookAt(0.55)]);
  void game.sweep();
  await settle();
  // The sweep: the positions after a b and after a b c only (passCount: an unfinished game's end too)
  assert.deepEqual(searches.map(s => s.moves.join(" ")), ["a b", "a b c"]);
  for (const s of searches) s.end(SWEEP_VISITS);
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.equal(game.swept, 4); // the book's positions count as done
  assert.deepEqual(searches.slice(2).map(s => s.moves.join(" ")), ["a b", "a b c"]); // then the label stage
  for (const s of searches.slice(2)) s.end(game.labelVisits);
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.equal(game.labelled, 4);
  assert.equal(game.pending([]), false);
  const data = game.data({ blue: "First", red: "Second" })!;
  assert.deepEqual(data.analysis.map(a => a?.book ?? false), [true, true, false, false]);
  assert.deepEqual(data.searched!.map(a => a?.visits), [undefined, undefined, game.labelVisits, game.labelVisits]);
  // The position on screen in the book: the engine searches it for the analysis column, and the review keeps the book's
  game.focus([]);
  await settle();
  assert.deepEqual(searches.at(-1)!.moves, []);
  searches.at(-1)!.end(game.focusVisits);
  await turns();
  mock.timers.tick(BATCH_MS);
  const after = game.data({ blue: "First", red: "Second" })!;
  assert.equal(after.analysis[0]?.book, true);
  assert.equal(after.searched![0]?.visits, game.focusVisits);
});

test("a book that comes once the stages run: the searches that still wait for the engine skip its positions", async () => {
  const { game, searches } = await sweeping(1);
  assert.equal(searches.length, 1); // the start's search runs, and the others wait
  game.useBook([undefined, bookAt(0.5), bookAt(0.55)]);
  searches[0].end(SWEEP_VISITS);
  await turns();
  assert.deepEqual(searches.map(s => s.moves.join(" ")), ["", "a b c"]);
});

test("no values from the book, as where it did not load: the review searches every position", async () => {
  const { pool, searches } = fakePool();
  const game = new GameAnalysis(words, pool, MOVES, "g");
  await game.start();
  game.useBook([undefined, undefined, undefined, undefined]);
  void game.sweep();
  await settle();
  assert.deepEqual(searches.map(s => s.moves.join(" ")), ["", "a", "a b", "a b c"]);
  assert.equal(game.data({ blue: "First", red: "Second" })!.searched?.length, 4);
});

test("the Analysis board takes no book: its analysis has none", async () => {
  const { pool } = fakePool();
  const game = new GameAnalysis(words, pool, [], BOARD_ID);
  await game.start();
  game.useBook([bookAt(0.5)]);
  assert.deepEqual(game.bookResults, []);
});

test("no Great's confirmation from or into a position with the book's values", async () => {
  const { pool } = fakePool();
  const game = new GameAnalysis(words, pool, ["a", "b", "c", "d"], "g");
  await game.start();
  const at = (blueWin: number, candidates: [string, number][] = []) =>
    ({ blueWin, visits: game.labelVisits, candidates: candidates.map(([edge, w]) => ({ edge, visits: 10, blueWin: w })) });
  // c is the only good move at position 2, and it keeps what b gave: one search, as above
  game.analysis = [at(0.5), at(0.5), at(0.6, [["c", 0.6], ["x", 0.45]]), at(0.6), at(0.6)];
  assert.equal(game.greatChecks.total, 1);
  game.useBook([undefined, undefined, { ...game.analysis[2]!, book: true }]); // the position before c is the book's
  assert.equal(game.greatChecks.total, 0);
  game.useBook([undefined, undefined, undefined, { ...game.analysis[3]!, book: true }]); // the position after c
  assert.equal(game.greatChecks.total, 0);
});
