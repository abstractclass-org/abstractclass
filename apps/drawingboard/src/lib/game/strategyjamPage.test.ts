// Checks Blueprints' game page reader (strategyjamPage.ts) on page states made here: games of moves that Stamp Duty's
// early build played from the standard start (the board's fixtures.json), a page's two layouts, a game that goes on,
// pages with no game, and a game from another start, which the record refuses (strategyjam.ts). No game of
// strategyjam.org's archive: this repository is public. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import data from "../board/fixtures.json" with { type: "json" };
import { jamRecord, type JamGame } from "./strategyjam.ts";
import { explain, findJamGame, jamShownMove } from "./strategyjamPage.ts";
import { parseRecord } from "./record.ts";

const PAGE = "https://strategyjam.org/blueprints/game/k3x9q";
const STARTED = Date.UTC(2026, 9, 24, 21, 30);
const fixture = (name: string) => data.fixtures.find(f => f.name === name)!;
const START = fixture("The start").position; // the standard start, as the engine gives it: strategyjam.org's shape
const capture = fixture("A capture"), empty = fixture("An empty blueprint");

/** A strategyjam.org game page, as the reader sees it: `stage` stands for the `.stage` element, or null for none, and
 *  `slider` for the replay slider's value. */
function page(stage: object | null, slider?: string) {
  const url = new URL(PAGE + "?tab=moves");
  Object.assign(globalThis, {
    document: {
      querySelector: (selector: string) => (selector === ".stage" ? stage
        : selector === "input.replay-slider" && slider !== undefined ? { value: slider } : null),
    },
    location: { origin: url.origin, pathname: url.pathname },
  });
}
/** A `.stage` element that React drew: its fiber, under the components that hold `props` (the page's own view and
 *  Blueprints' wide layout, which takes the same props), and a component's other copy. */
const stage = (props: object, other: object | null = null) => {
  const view = { return: null, alternate: null, memoizedProps: props };
  const component = { return: view, alternate: other && { return: null, alternate: null, memoizedProps: other }, memoizedProps: props };
  return { "__reactFiber$x1": { return: component, alternate: null, memoizedProps: { className: "stage stage-whole" } } };
};
/** A rules module that counts the moves it plays, and gives the scores and the result at the end of `history`. */
const rules = (history: string[], scores: number[], result: JamGame["result"]) => ({
  id: "blueprints", version: 3,
  play: (state: { ply: number }, _move: string) => ({ ply: state.ply + 1 }),
  observe: (state: { ply: number }, _seat: number) => (state.ply === history.length ? { scores, result } : { scores: [0, 0], result: null }),
});
/** The page's state of a game: its seats, its first position, its moves, its clock. */
const state = (history: string[], more: object = {}) => ({
  seats: ["ann", "bob"], initial: START, history, view: null,
  clock: { initialMs: 300000, incrementMs: 3000, startedAt: STARTED, since: STARTED, now: STARTED, remaining: [300000, 300000] },
  ...more,
});

test("the reader takes the game: its id, players, first position, moves, clock, scores and result", () => {
  const scores = capture.position.scores, result = { winner: 1, reason: "resignation" };
  page(stage({ game: { rules: rules(capture.moves, scores, null) }, state: state(capture.moves, { result }), status: "live" }), "4");
  const game = findJamGame() as JamGame;
  assert.deepEqual(game, {
    id: "k3x9q", rules: "blueprints", version: 3, seats: ["ann", "bob"], initial: START, history: capture.moves, scores,
    result, startedAt: STARTED, clock: { initialMs: 300000, incrementMs: 3000 },
  });
  assert.equal(jamShownMove(), "4"); // the replay slider: the moves before the position on screen
  // The record: the moves as the site gives them, Blue's first turn of one move, then two a turn.
  const r = parseRecord(jamRecord(game));
  assert.deepEqual(r.moves, capture.moves);
  assert.deepEqual([r.tags.Site, r.tags.Blue, r.tags.Red, r.result], [PAGE, "ann", "bob", "r+R"]);
});

test("the result as the page reads it: the view's while it plays, else the site's, else the rules'", () => {
  const ended = { winner: 0, reason: "higher score" };
  page(stage({ game: { rules: rules(empty.moves, empty.position.scores, ended) }, state: state(empty.moves) }));
  assert.deepEqual((findJamGame() as JamGame).result, ended);
  page(stage({ game: { rules: rules(empty.moves, empty.position.scores, ended) }, state: state(empty.moves, { view: { result: null } }) }));
  assert.deepEqual((findJamGame() as JamGame).result, ended); // a view with no result yet
  page(stage({ game: { rules: rules(empty.moves, empty.position.scores, null) }, state: state(empty.moves, { view: { moves: [] } }) }));
  const going = findJamGame() as JamGame;
  assert.equal(going.result, null); // a game that goes on
  assert.equal(parseRecord(jamRecord(going)).result, "*");
});

test("of a component's two copies, the one with more moves; without a clock, the first move's time; no seats", () => {
  const fewer = capture.moves.slice(0, 3);
  page(stage({ game: { rules: rules(fewer, [0, 0], null) }, state: state(fewer) },
             { game: { rules: rules(capture.moves, [0, 0], null) }, state: state(capture.moves, { clock: null, times: [STARTED] }) }));
  const game = findJamGame() as JamGame;
  assert.equal(game.history.length, capture.moves.length);
  assert.deepEqual([game.clock, game.startedAt], [null, STARTED]);
  // A state without its seats: the record names no player.
  page(stage({ game: { rules: rules(capture.moves, [0, 0], null) }, state: state(capture.moves, { seats: undefined }) }));
  const r = parseRecord(jamRecord(findJamGame() as JamGame));
  assert.deepEqual([r.tags.Blue, r.tags.Red], ["?", "?"]);
});

test("a page with no game says why: no stage, a stage of no game, a login, a game on its way", () => {
  page(null);
  assert.equal(findJamGame(), "none");
  page(stage({ className: "stage" }));
  assert.equal(findJamGame(), "none");
  const waiting = (status: string) => stage({ game: { rules: rules([], [0, 0], null) }, state: null, status });
  page(waiting("login"));
  assert.equal(findJamGame(), "login");
  page(waiting("connecting"));
  assert.equal(findJamGame(), "loading");
  page(waiting("reconnecting"));
  assert.equal(findJamGame(), "loading");
  page(waiting("missing"));
  assert.equal(findJamGame(), "none");
  assert.equal(jamShownMove(), ""); // no slider: the page does not say
  // The messages name what the player clicks, and where the newest tools are.
  const none = explain("none", "the Drawing Board button", "https://board.example");
  assert.match(none, /^Drawing Board: this page shows no game/);
  assert.ok(none.includes("click the Drawing Board button again") && none.includes("https://board.example/tools"));
  assert.match(explain("login", "the Drawing Board button", "https://board.example"), /Log in to strategyjam\.org\. Then click/);
});

test("a game from another start, of other rules or of another version is refused by the record", () => {
  const other = { ...START, cells: { ...START.cells, "0,0": [0, "wall"] } };
  page(stage({ game: { rules: rules(capture.moves, [0, 0], null) }, state: state(capture.moves, { initial: other }) }));
  assert.throws(() => jamRecord(findJamGame() as JamGame), /does not start from the standard start/);
  page(stage({ game: { rules: { ...rules(capture.moves, [0, 0], null), id: "enclosure", version: 1 } }, state: state(capture.moves) }));
  assert.throws(() => jamRecord(findJamGame() as JamGame), /a game of enclosure, not of Blueprints/);
  page(stage({ game: { rules: { ...rules(capture.moves, [0, 0], null), version: 2 } }, state: state(capture.moves) }));
  assert.throws(() => jamRecord(findJamGame() as JamGame), /version 2/);
});
