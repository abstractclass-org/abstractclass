// Checks the record's frame with a test game unlike Enclosure (design 29): its moves are words, their one spelling in
// lower case, and its mark `#N` counts what a move takes (`apple#2`), never `#0`. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { markMoves, readRecord, RecordError, writeRecord, type Notation } from "./record.ts";
import { turnFromCount } from "./turns.ts";

/** The test game's mark: what a move takes, or null for none. */
const words: Notation<number | null> = {
  read(word) {
    const m = /^([a-z]+)(?:#(\d+))?$/i.exec(word);
    if (!m) return "not a word, a turn label or a result";
    if (m[2] === "0") return "a move that takes nothing has no mark";
    return { name: m[1].toLowerCase(), mark: m[2] ? Number(m[2]) : null, markAt: m[1].length };
  },
  mark: n => (n === null ? "" : `#${n}`),
  none: null,
  start: tags => (tags.Start ? turnFromCount(Number(tags.Start)) : { turn: 1, first: true }),
};
const read = (text: string) => readRecord(text, words);

test("the game's moves in their one spelling, its marks, a pass, and the result", () => {
  const r = read("1. Apple 2. bee#2 cat 3. PASS dog b+12");
  assert.deepEqual(r.moves, ["apple", "bee", "cat", "pass", "dog"]);
  assert.deepEqual(r.marked, [null, 2, null, null, null]);
  assert.equal(r.result, "b+12");
});

test("tags, evaluations and clocks in comments", () => {
  const r = read(`[Event "Casual"]\n[Blue "a \\"quoted\\" name"]\n\n1. apple { [%eval 0.55 +95 205] } 2. bee { [%clk 0:00:41] } cat *`);
  assert.equal(r.tags.Blue, 'a "quoted" name');
  assert.deepEqual(r.evals, [{ blueWin: 0.55, margin: 95, spread: 205 }, null, null]);
  assert.deepEqual(r.clocks, [null, "0:00:41", null]);
});

test("branches are skipped, and a turn label can touch its first move", () => {
  const r = read("1.apple 2. bee cat (2. dog emu (2... fox)) 3. gnu *");
  assert.deepEqual(r.moves, ["apple", "bee", "cat", "gnu"]);
});

test("quality marks: read after any move, a pass or a mark, and dropped", () => {
  const r = read("1. apple! 2. bee#3?! cat?? 3. pass? *");
  assert.deepEqual(r.moves, ["apple", "bee", "cat", "pass"]);
  assert.deepEqual(r.marked, [null, 3, null, null]);
});

test("the game's marks are written after a move, before its quality mark, where the record has none", () => {
  const text = "1. apple?? 2. bee#3 cat { [%clk 0:00:41] } 3. PASS dog *";
  assert.equal(markMoves(text, read(text), [4, 3, 1, null, null], words),
               "1. apple#4?? 2. bee#3 cat#1 { [%clk 0:00:41] } 3. PASS dog *");
});

test("the first turn's number comes from the game's start", () => {
  assert.deepEqual(read('[Start "3"]\n\n3. apple bee 4. cat *').moves, ["apple", "bee", "cat"]);
  assert.deepEqual(read('[Start "2"]\n\n2... apple 3. bee *').moves, ["apple", "bee"]);
  assert.throws(() => read('[Start "3"]\n\n1. apple *'), /turn 1\. where the notation gives turn 3\./);
  assert.throws(() => read("1... apple *"), /turn 1\.\.\. where the notation gives turn 1\./);
});

test("errors name what is wrong and where", () => {
  const at = (text: string) => {
    try { read(text); } catch (e) { assert.ok(e instanceof RecordError); return [e.message, e.offset]; }
    assert.fail(`no error: ${text}`);
  };
  assert.deepEqual(at("1. apple 2. bee b4"), ["not a word, a turn label or a result: b4", 16]);
  assert.deepEqual(at("1. apple#0!"), ["a move that takes nothing has no mark: apple#0!", 3]);
  assert.deepEqual(at("1. apple 3. bee"), ["the record gives turn 3 where the notation gives turn 2", 9]);
  assert.deepEqual(at("1. apple *  2. bee"), ["nothing may follow the result (*)", 12]);
  assert.deepEqual(at('1. apple [Blue "x"]'), ["tags come before the moves", 9]);
  assert.deepEqual(at("1. apple (2. bee"), ["a ( has no closing )", 16]);
  assert.deepEqual(at(""), ["the record has no moves", 0]);
});

test("a record written and read back", () => {
  const moves = ["apple", "bee#2", "cat", "pass", "dog"];
  const text = writeRecord({ Blue: "ann", Red: "bob" }, moves, [{ number: 1, moves: 1 }, { number: 2, moves: 2 }, { number: 3, moves: 2 }], "r+R");
  assert.match(text, /^\[Event "\?"\]\n\[Site "\?"\]\n\[Date "\?\?\?\?\.\?\?\.\?\?"\]\n\[Round "-"\]\n\[Blue "ann"\]\n\[Red "bob"\]\n\[Result "r\+R"\]\n\n1\. apple 2\. bee#2 cat 3\. pass dog r\+R\n$/);
  const r = read(text);
  assert.deepEqual([r.moves, r.marked, r.result], [["apple", "bee", "cat", "pass", "dog"], [null, 2, null, null, null], "r+R"]);
});

test("the turns: one move, then two a turn, and the last turn of 120 moves one", () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(turnFromCount), [
    { turn: 1, first: true }, { turn: 2, first: true }, { turn: 2, first: false }, { turn: 3, first: true }, { turn: 3, first: false },
  ]);
  assert.deepEqual(turnFromCount(119), { turn: 61, first: true });
});
