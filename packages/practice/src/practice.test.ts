// Checks the practice's shared part (practice.ts) on a test game unlike Enclosure (design 29, item 6): its moves are
// words, and a turn is the moves of one player in a row. Hedge School's src/lib/practice/practice.test.ts checks
// Enclosure through it. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  botLabel, broughtLine, choicesStore, gtpAnswer, keptStore, komiHelp, komiLine, komiSide, komiTaken, newPractice, practiceHref,
  practiceOutcome, resignResult, scoreResult, settingsCommands, takebackCount, visitsStop, visitsTaken, type KeptPractice,
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

test("the choices are kept under the site's key, and a network that the site no longer offers takes its first", () => {
  const offered = ["new", "newer"], store = choicesStore("test:choices", "new", id => offered.includes(id ?? ""));
  assert.deepEqual(store.load(), store.defaults());
  store.save({ bot: { network: "newer", visits: 300, variety: "high" }, komi: -250, side: "red", name: "Ada" });
  assert.deepEqual(store.load(), { bot: { network: "newer", visits: 300, variety: "high" }, komi: -250, side: "red", name: "Ada" });
  store.save({ bot: { network: "old", visits: 0, variety: "low" }, komi: 5000, side: "blue", name: "Ada" });
  assert.deepEqual(store.load().bot, { network: "new", visits: 64, variety: "low" });
  assert.equal(store.load().komi, 0); // a komi outside the range takes the default
  // Choices kept before the komi: komi 0.
  localStorage.setItem("test:choices", JSON.stringify({ bot: { network: "new", visits: 8, variety: "low" }, side: "red", name: "" }));
  assert.equal(store.load().komi, 0);
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
  // A game with a komi keeps it, and a komi that the card does not take is not a game kept.
  store.keep({ ...game, komi: -300 });
  assert.equal(store.load()?.komi, -300);
  store.keep({ ...game, komi: 0.5 });
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
  // A komi after the settings, and none at komi 0: such a game plays as before the komi.
  const bot = { network: "new", visits: 32, variety: "low" } as const;
  assert.deepEqual(settingsCommands(bot, 19, -300).at(-1), "komi -300");
  assert.deepEqual(settingsCommands(bot, 19, 0), settingsCommands(bot, 19));
  assert.equal(settingsCommands(bot, 19).length, 4);
});

test("the komi: any whole number from -3,000 to 3,000 on the card, from the player's side, Red's in the game", () => {
  for (const k of [0, 1, -1, 125, -3000, 3000]) assert.equal(komiTaken(k), true, String(k));
  for (const k of [3001, -3050, 0.5, "300", null, NaN]) assert.equal(komiTaken(k), false, String(k));
  // The player's head start of 300 points: Red's komi 300 when the player is Red, -300 when Blue, and back.
  assert.deepEqual([komiSide(300, 1), komiSide(300, 0), komiSide(-300, 0), komiSide(0, 0)], [300, -300, 300, 0]);
  assert.equal(Object.is(komiSide(0, 0), -0), false);
  assert.equal(komiHelp(300), "You start 300 points ahead.");
  assert.equal(komiHelp(-1500, "Stamp Duty"), "Stamp Duty starts 1,500 points ahead.");
  assert.equal(komiHelp(1), "You start 1 point ahead.");
  assert.equal(komiHelp(0), "Neither side starts ahead, as in a game online.");
  // A game's line: Red's komi -300 is Blue's head start, the player's when Blue, the bot's when Red; none at 0
  assert.equal(komiLine({ komi: -300, human: 0 }, "Stamp Duty"), "You start 300 points ahead.");
  assert.equal(komiLine({ komi: -300, human: 1 }, "Stamp Duty"), "Stamp Duty starts 300 points ahead.");
  assert.equal(komiLine({ human: 1 }), "");
});

// Practice from a position (design 24, item 4): the Analysis board's way in, and the game that starts from it.
test("Practice's address from a position: the set-up start, and the moves from it, as a record", () => {
  assert.equal(practiceHref(null, []), "/practice");
  assert.equal(practiceHref(undefined, ["north", "east"]), "/practice#record=north+east");
  assert.equal(practiceHref("a b 1", []), "/practice#position=a+b+1");
  assert.equal(practiceHref("a b 1", ["north"]), "/practice#position=a+b+1&record=north");
});

test("the settings card's line on a start brought, in the game's word for a move", () => {
  const edge: [string, string] = ["edge", "edges"];
  assert.equal(broughtLine({ start: null, moves: ["a"] }, edge), "The game starts after the record's 1 edge.");
  assert.equal(broughtLine({ start: "s", moves: [] }, edge), "The game starts from the Analysis board's set-up position.");
  assert.equal(broughtLine({ start: "s", moves: ["a", "b"] }, ["move", "moves"]),
               "The game starts from the Analysis board's set-up position, after the record's 2 moves.");
});

test("a new game: the choices, the player's side, and a start brought, whose moves the game counts as its start", () => {
  const choices = { bot: { network: "new", visits: 16, variety: "low" as const }, komi: 300, side: "red" as const, name: " Ada " };
  const plain = newPractice(choices, null);
  assert.equal(plain.human, 1);
  assert.equal(plain.name, "Ada");
  assert.equal(plain.komi, 300); // the player's head start, as Red's komi
  assert.deepEqual(plain.moves, []);
  assert.equal("start" in plain || "brought" in plain, false);
  const from = newPractice({ ...choices, komi: 0, side: "blue" }, { start: "s", moves: ["north", "east"] });
  assert.equal(from.human, 0);
  assert.equal("komi" in from, false);
  assert.deepEqual([from.start, from.moves, from.brought], ["s", ["north", "east"], 2]);
  // A start alone: no moves brought. Random takes the side from the random number.
  const alone = newPractice({ ...choices, side: "random" }, { start: "s", moves: [] }, () => 0.7);
  assert.deepEqual([alone.human, alone.start, alone.brought], [1, "s", undefined]);
  assert.equal(newPractice({ ...choices, side: "random" }, null, () => 0.2).human, 0);
});
