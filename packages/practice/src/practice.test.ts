// Checks the practice's shared part (practice.ts) on a test game unlike Enclosure (design 29, item 6): its moves are
// words, and a turn is the moves of one player in a row. Hedge School's src/lib/practice/practice.test.ts checks
// Enclosure through it. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  botLabel, choicesStore, gtpAnswer, keptStore, practiceOutcome, resignResult, scoreResult, settingsCommands,
  takebackCount, visitRange, visitsStop, visitsTaken, type KeptPractice,
} from "./practice.ts";

// The browser's local storage, in memory: Node has none.
const stored = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => stored.get(k) ?? null, setItem: (k: string, v: string) => void stored.set(k, v),
  removeItem: (k: string) => void stored.delete(k),
} as Storage;

test("the visits: any whole number from 1 to 8,192, and the slider's doubling at or below it", () => {
  for (const v of [1, 64, 3000, 8192]) assert.equal(visitsTaken(v), true, String(v));
  for (const v of [0, 8193, 2.5, "64", null]) assert.equal(visitsTaken(v), false, String(v));
  assert.deepEqual([1, 2, 3, 3000, 8192].map(visitsStop), [0, 1, 1, 11, 13]);
});

test("a site's least visits: the slider starts there, then takes the doublings above it", () => {
  const range = visitRange(27);
  assert.deepEqual(range.stops, [27, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192]);
  for (const v of [27, 31, 8192]) assert.equal(range.taken(v), true, String(v));
  for (const v of [1, 26, 8193]) assert.equal(range.taken(v), false, String(v));
  assert.deepEqual([27, 31, 32, 100, 8192].map(range.stop), [0, 0, 1, 2, 9]);
  const store = choicesStore("test:least", "new", () => true, range);
  assert.equal(store.defaults().bot.visits, 64);
  store.save({ bot: { network: "new", visits: 16, variety: "low" }, side: "red", name: "" });
  assert.equal(store.load().bot.visits, 64);
  assert.equal(choicesStore("test:least", "new", () => true, visitRange(100)).defaults().bot.visits, 100);
  const kept = keptStore("test:least-game", range);
  kept.keep({ version: 1, bot: { network: "new", visits: 16, variety: "low" }, human: 0, name: "", seed: 1, moves: [],
              builds: [], started: "2026-10-30T00:00:00Z" });
  assert.equal(kept.load(), null);
});

test("the choices are kept under the site's key, and a network that the site no longer offers takes its first", () => {
  const offered = ["new", "newer"], store = choicesStore("test:choices", "new", id => offered.includes(id ?? ""));
  assert.deepEqual(store.load(), store.defaults());
  store.save({ bot: { network: "newer", visits: 300, variety: "high" }, side: "red", name: "Ada" });
  assert.deepEqual(store.load(), { bot: { network: "newer", visits: 300, variety: "high" }, side: "red", name: "Ada" });
  store.save({ bot: { network: "old", visits: 0, variety: "low" }, side: "blue", name: "Ada" });
  assert.deepEqual(store.load().bot, { network: "new", visits: 64, variety: "low" });
});

test("the game in progress is kept under the site's key, and a game of another form is not", () => {
  const store = keptStore<"cpu">("test:game");
  const game: KeptPractice<"cpu"> = {
    version: 1, bot: { network: "new", visits: 16, variety: "low" }, human: 1, name: "", seed: 7,
    moves: ["north", "east"], builds: ["b1"], started: "2026-10-30T00:00:00Z", form: "cpu",
  };
  store.keep(game);
  assert.deepEqual(store.load(), game);
  store.keep({ ...game, human: 2 as 0 });
  assert.equal(store.load(), null);
  store.keep(null);
  assert.equal(store.load(), null);
});

test("a takeback undoes the bot's turn after the player's last turn, then that turn", () => {
  // The words' game: the player (0) moves twice, the bot (1) twice, the player once.
  assert.equal(takebackCount([0, 0, 1, 1, 0], 0), 1); // the player's turn under way: its one move
  assert.equal(takebackCount([0, 0, 1, 1], 0), 4); // the bot's turn, then the player's
  assert.equal(takebackCount([1, 1], 0), 0); // nothing of the player's yet
  assert.equal(takebackCount([], 1), 0);
});

test("the results and the player's outcome", () => {
  assert.equal(resignResult(0), "r+R");
  assert.equal(resignResult(1), "b+R");
  assert.deepEqual([scoreResult([12.5, 0]), scoreResult([3, 6]), scoreResult([4, 4])], ["b+12.5", "r+3", "0"]);
  assert.equal(practiceOutcome([10, 2], 0, false), "won");
  assert.equal(practiceOutcome([10, 2], 1, false), "lost");
  assert.equal(practiceOutcome([5, 5.01], 1, false), "draw");
  assert.equal(practiceOutcome([10, 2], 0, true), "resigned");
});

test("the bot's GTP: its answers, its settings with the site's half-life, and its name", () => {
  assert.equal(gtpAnswer("= north\n\n"), "north");
  assert.throws(() => gtpAnswer("? illegal move"), /illegal move/);
  assert.throws(() => gtpAnswer("north"), /not a GTP response/);
  assert.deepEqual(settingsCommands({ network: "new", visits: 32, variety: "medium" }, 11.5), [
    "kata-set-param maxVisits 32", "kata-set-param chosenMoveTemperatureEarly 0.8", "kata-set-param chosenMoveTemperature 0.3",
    "kata-set-param chosenMoveTemperatureHalflife 11.5",
  ]);
  assert.equal(botLabel("Test Bot 1", { network: "new", visits: 1, variety: "low" }), "Test Bot 1, 1 visit, Low variety");
});
