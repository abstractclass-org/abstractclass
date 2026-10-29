// Checks the strategyjam.org game page's reader and its conversion to a record (strategyjamPage.ts, strategyjam.ts),
// with synthetic games that strategyjam.org's own rules module played (src/lib/mock/strategyjam-games.json, made by
// scripts/strategyjam-games.mjs): a whole game, timeout passes, the result's kinds, and pages with no game. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { jamRecord, type JamGame } from "./strategyjam.ts";
import { findJamGame } from "./strategyjamPage.ts";
import { parseRecord } from "./record.ts";
import { edgeName, type Edge } from "#lib/engine/notation.ts";
import { scoreResult } from "#lib/practice/hedgefund.ts";

type Played = { history: string[]; scores: number[]; result: { winner: number | null; reason: string } };
const games: { whole: Played; passes: Played & { at: number[] } } =
  JSON.parse(readFileSync(new URL("../mock/strategyjam-games.json", import.meta.url), "utf8"));
const PAGE = "https://strategyjam.org/enclosure/game/abc123";
const STARTED = Date.UTC(2026, 9, 17, 14, 0);
const game = (played: Played, more: Partial<JamGame> = {}): JamGame => ({
  page: PAGE, rules: "enclosure", version: 1, seats: ["alice", "bob"], history: played.history, scores: played.scores,
  result: played.result, startedAt: STARTED, ...more,
});

/** A move in the engine's notation, by another way than the conversion's: the engine's own names of the site's points
 *  (columns a to s, rows 1 to 19). */
const engineEdge = (move: string) => edgeName(move.split("-").flatMap(p => [p.charCodeAt(0) - 97, Number(p.slice(1)) - 1]) as Edge);

test("a whole game becomes its record: First is Blue, the moves in the engine's notation, the margin from the scores", () => {
  const text = jamRecord(game(games.whole));
  const r = parseRecord(text); // which also checks the turns' numbers
  assert.deepEqual(r.moves, games.whole.history.map(engineEdge));
  assert.equal(r.moves[0], "A7-A10"); // First's first edge, from its start A10-D10
  assert.match(text, /^1\. A7-A10 2\. \S+ \S+ 3\./m); // one edge in the first turn, then two
  assert.deepEqual([r.tags.Blue, r.tags.Red, r.tags.Site, r.tags.Date], ["alice", "bob", PAGE, "2026.10.17"]);
  assert.equal(r.result, scoreResult(games.whole.scores as [number, number]));
  assert.equal(r.tags.Termination, "normal");
  assert.equal(r.tags.Scores.split("/").length, 2);
  assert.equal(r.tags.TimeControl, undefined); // the site adds its increment for each edge, the notation for each turn
});

test("a timeout pass ends the turn in progress, and one at a turn's start forfeits both its edges", () => {
  const { at, history } = games.passes; // Second's second edge, then First's turn
  const text = jamRecord(game(games.passes));
  assert.match(text, /4\. \S+ pass 5\. pass 6\. /);
  const r = parseRecord(text);
  assert.deepEqual(at.map(i => r.moves[i]), ["pass", "pass"]);
  assert.equal(r.moves.length, history.length);
  // 117 edges and the 3 forfeited: the rules ended the game, so its margin comes from the scores.
  assert.equal(history.length, 119);
  assert.match(r.result!, /^[br]\+\d/);
});

test("the result: a resignation, a forfeit, a draw, an aborted game, and a game that goes on", () => {
  const early = games.whole.history.slice(0, 31); // a game that stopped before the rules end it
  const result = (winner: number | null, reason: string, more: Partial<JamGame> = {}) =>
    parseRecord(jamRecord(game({ ...games.whole, history: early }, { result: { winner, reason }, ...more })));
  const resigned = result(1, "resignation"), left = result(0, "left the game");
  assert.deepEqual([resigned.result, resigned.tags.Termination], ["r+R", "resignation"]);
  assert.deepEqual([left.result, left.tags.Termination], ["b+F", "forfeit"]);
  assert.equal(result(null, "agreed").result, "0");
  assert.equal(result(null, "equal scores", { history: games.whole.history }).tags.Termination, "normal");
  const aborted = parseRecord(jamRecord(game(games.whole, { result: { winner: null, reason: "no first move", aborted: true } })));
  assert.equal(aborted.result, "*");
  const going = parseRecord(jamRecord(game({ ...games.whole, history: early }, { result: null })));
  assert.equal(going.result, "*");
  assert.equal(going.tags.Scores, undefined); // the scores so far are not the final scores
});

test("a game of other rules, of another version, or with no moves is refused", () => {
  assert.throws(() => jamRecord(game(games.whole, { rules: "hex" })), /not of Enclosure/);
  assert.throws(() => jamRecord(game(games.whole, { version: 2 })), /version 2/);
  assert.throws(() => jamRecord(game(games.whole, { history: [] })), /no moves/);
  assert.throws(() => jamRecord(game(games.whole, { history: ["a10-t10"] })), /move 1 is not an edge/);
});

/** A strategyjam.org game page, as the reader sees it: `stage` stands for the `.stage` element, or null for none. */
function page(stage: object | null) {
  const url = new URL(PAGE + "?tab=moves");
  Object.assign(globalThis, {
    document: { querySelector: (selector: string) => (selector === ".stage" ? stage : null) },
    location: { origin: url.origin, pathname: url.pathname },
  });
}
/** A `.stage` element that React drew: its fiber, under the component with `props` (and the component's other copy). */
const stage = (props: object, other: object | null = null) => {
  const component = { return: null, alternate: other && { return: null, alternate: null, memoizedProps: other }, memoizedProps: props };
  return { "__reactFiber$x1": { return: component, alternate: null, memoizedProps: { className: "stage" } } };
};
/** A rules module that counts the moves it plays, and gives the played game's scores and result at its end. */
const rules = (played: Played) => ({
  id: "enclosure", version: 1,
  play: (state: { n: number }) => ({ n: state.n + 1 }),
  observe: (state: { n: number }) => (state.n === played.history.length ? { scores: played.scores, result: played.result } : { scores: [0, 0], result: null }),
});
const state = (played: Played, more: object = {}) =>
  ({ seats: ["alice", "bob"], initial: { n: 0 }, history: played.history, clock: { startedAt: STARTED }, view: null, ...more });

test("the reader takes the page's game, with the scores and the result from the page's rules module", () => {
  page(stage({ game: { rules: rules(games.whole) }, state: state(games.whole), status: "archived" }));
  assert.deepEqual(findJamGame(), game(games.whole));
  // The site's own result comes first: a resignation, which the rules do not know.
  page(stage({ game: { rules: rules(games.whole) }, state: state(games.whole, { result: { winner: 1, reason: "resignation" } }) }));
  assert.deepEqual((findJamGame() as JamGame).result, { winner: 1, reason: "resignation" });
  // Of the component's two copies, the one with more moves.
  const fewer = { ...games.whole, history: games.whole.history.slice(0, 10) };
  page(stage({ game: { rules: rules(fewer) }, state: state(fewer) }, { game: { rules: rules(games.whole) }, state: state(games.whole) }));
  assert.equal((findJamGame() as JamGame).history.length, 120);
});

test("a page with no game says why: no stage, a stage of no game, a game for players who are logged in, a game on its way", () => {
  page(null);
  assert.equal(findJamGame(), "none");
  page(stage({ className: "stage" }));
  assert.equal(findJamGame(), "none");
  const waiting = (status: string) => stage({ game: { rules: rules(games.whole) }, state: null, status });
  page(waiting("login"));
  assert.equal(findJamGame(), "login");
  page(waiting("connecting"));
  assert.equal(findJamGame(), "loading");
  page(waiting("reconnecting"));
  assert.equal(findJamGame(), "loading");
  page(waiting("missing"));
  assert.equal(findJamGame(), "none");
});
